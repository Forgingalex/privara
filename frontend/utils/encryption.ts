/**
 * Encryption Utilities for Privara
 * Uses Zama FHE relayer SDK for real homomorphic encryption
 * 
 * CRITICAL: All functions now require FhevmInstance to be passed in
 * This prevents any SDK imports at module evaluation time
 * 
 * NO IMPORTS OF @zama-fhe/relayer-sdk - even type imports can trigger webpack bundling
 */

// Local type definition to avoid any SDK imports (prevents webpack from analyzing the SDK module)
type FhevmInstance = any;

export interface TwitterMetrics {
  follower_count: number;
  following_count: number;
  engagement_rate: number;
  account_age_days: number;
  bot_likelihood: number;
  posting_frequency: number;
  follower_quality: number;
  growth_score: number;
}

export interface ReputationVector {
  authenticity: number;
  influence: number;
  account_health: number;
  risk_score: number;
  momentum: number;
}

// Contract address from env
const getContractAddress = (): string => {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr || addr === '0x0000000000000000000000000000000000000001') {
    throw new Error('Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }
  return addr;
};

/**
 * Encrypt Twitter metrics using FHE
 * Returns encrypted handles and proof for contract submission
 * 
 * @param instance - FHEVM instance (must be provided from React Context)
 * @param metrics - Twitter metrics to encrypt
 * @param userAddress - User's Ethereum address
 * @param contractAddress - Optional contract address (uses env if not provided)
 */
export async function encryptMetrics(
  instance: FhevmInstance,
  metrics: TwitterMetrics,
  userAddress: string,
  contractAddress?: string
): Promise<{ handles: Uint8Array[]; inputProof: Uint8Array; hexPayload: string }> {
  if (!instance) {
    throw new Error('FHE instance is required. Please ensure FHE SDK is initialized via FHEProvider.');
  }
  
  if (!userAddress) {
    throw new Error('User address required for encryption');
  }
  
  const contractAddr = contractAddress || getContractAddress();
  
  console.log('🔒 Encrypting metrics with FHE...');
  console.log('   Contract:', contractAddr);
  console.log('   User:', userAddress);
  
  // Scale metrics to integers (0-100 range * 100 for decimals)
  const scaledMetrics = {
    follower_count: Math.floor(metrics.follower_count),
    following_count: Math.floor(metrics.following_count),
    engagement_rate: Math.round(metrics.engagement_rate * 100), // 0-10000
    account_age_days: Math.floor(metrics.account_age_days),
    bot_likelihood: Math.round(metrics.bot_likelihood * 100),   // 0-10000
    posting_frequency: Math.round(metrics.posting_frequency * 100),
    follower_quality: Math.round(metrics.follower_quality * 100),
    growth_score: Math.round(metrics.growth_score * 100),
  };
  
  console.log('   Scaled metrics:', scaledMetrics);
  
  // Create encrypted input with 8 metrics using real Zama FHE SDK
  const encryptedInput = await instance
    .createEncryptedInput(contractAddr, userAddress)
    .add32(scaledMetrics.follower_count)
    .add32(scaledMetrics.following_count)
    .add32(scaledMetrics.engagement_rate)
    .add32(scaledMetrics.account_age_days)
    .add32(scaledMetrics.bot_likelihood)
    .add32(scaledMetrics.posting_frequency)
    .add32(scaledMetrics.follower_quality)
    .add32(scaledMetrics.growth_score)
    .encrypt();
  
  console.log('✓ Metrics encrypted with real Zama FHE');
  console.log('   Handles:', encryptedInput.handles.length);
  console.log('   Proof size:', encryptedInput.inputProof.length, 'bytes');
  
  // Create hex payload for storage/display
  const hexPayload = createHexPayload(encryptedInput);
  
  return {
    handles: encryptedInput.handles,
    inputProof: encryptedInput.inputProof,
    hexPayload,
  };
}

/**
 * Convert encrypted input to hex string for display/storage
 */
function createHexPayload(encryptedInput: { handles: Uint8Array[]; inputProof: Uint8Array }): string {
  const totalSize = encryptedInput.handles.reduce((sum, h) => sum + h.length, 0) + encryptedInput.inputProof.length;
  const payload = new Uint8Array(4 + totalSize);
  
  // Header: number of handles (4 bytes)
  payload[0] = encryptedInput.handles.length;
  
  let offset = 4;
  
  // Add handles
  for (const handle of encryptedInput.handles) {
    payload.set(handle, offset);
    offset += handle.length;
  }
  
  // Add proof
  payload.set(encryptedInput.inputProof, offset);
  
  // Convert to hex
  return '0x' + Array.from(payload).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parse hex payload back to handles and proof
 */
export function parseHexPayload(hexPayload: string): { handles: Uint8Array[]; inputProof: Uint8Array } {
  const hex = hexPayload.startsWith('0x') ? hexPayload.slice(2) : hexPayload;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  
  const numHandles = bytes[0];
  const handleSize = 32; // euint32 handles are 32 bytes
  
  const handles: Uint8Array[] = [];
  let offset = 4;
  
  for (let i = 0; i < numHandles; i++) {
    handles.push(bytes.slice(offset, offset + handleSize));
    offset += handleSize;
  }
  
  const inputProof = bytes.slice(offset);
  
  return { handles, inputProof };
}

/**
 * Decrypt reputation result from contract
 * @param instance - FHEVM instance (must be provided from React Context)
 * @param encryptedResults - Array of encrypted result handles
 * @param userAddress - User's Ethereum address
 * @param contractAddress - Contract address
 * @param signMessage - Function to sign EIP712 message
 */
export async function decryptResult(
  instance: FhevmInstance,
  encryptedResults: Uint8Array[],
  userAddress: string,
  contractAddress: string,
  signMessage: (message: any) => Promise<string>
): Promise<ReputationVector> {
  if (!instance) {
    throw new Error('FHE instance is required. Please ensure FHE SDK is initialized via FHEProvider.');
  }

  console.log('🔓 Preparing decryption...');
  console.log('   Contract:', contractAddress);
  console.log('   User:', userAddress);
  console.log('   Results count:', encryptedResults.length);

  // Real FHE decryption using Zama SDK
  const { publicKey, privateKey } = instance.generateKeypair();
  
  // Create EIP712 data for decryption permission
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1; // Permission valid for 1 day
  
  const eip712 = instance.createEIP712(
    publicKey,
    [contractAddress],
    startTimestamp,
    durationDays
  );
  
  console.log('📝 Please sign the decryption request...');
  
  // Get user signature
  const signature = await signMessage(eip712);
  
  // Prepare handles with contract address
  const handlePairs = encryptedResults.map(handle => ({
    handle,
    contractAddress,
  }));
  
  // Decrypt via gateway
  const decryptedResults = await instance.userDecrypt(
    handlePairs,
    privateKey,
    publicKey,
    signature,
    [contractAddress],
    userAddress,
    startTimestamp,
    durationDays
  );
  
  console.log('✓ Decryption complete');
  console.log('   Decrypted values:', decryptedResults);
  
  // Map to reputation vector (assuming order: authenticity, influence, account_health, risk_score, momentum)
  return {
    authenticity: Number(decryptedResults[0]) / 100, // Scale back from integer
    influence: Number(decryptedResults[1]) / 100,
    account_health: Number(decryptedResults[2]) / 100,
    risk_score: Number(decryptedResults[3]) / 100,
    momentum: Number(decryptedResults[4]) / 100,
  };
}

/**
 * Demo encryption - generates mock encrypted data for demonstration
 * Used when FHE SDK is not available as a fallback
 */
export async function encryptMetricsDemo(
  metrics: TwitterMetrics,
  userAddress: string,
  contractAddress?: string
): Promise<{ handles: Uint8Array[]; inputProof: Uint8Array; hexPayload: string }> {
  console.log('🎭 Using demo encryption (FHE SDK not available)');
  
  const contractAddr = contractAddress || getContractAddress();
  
  // Scale metrics to integers (same as real encryption)
  const scaledMetrics = {
    follower_count: Math.floor(metrics.follower_count),
    following_count: Math.floor(metrics.following_count),
    engagement_rate: Math.round(metrics.engagement_rate * 100),
    account_age_days: Math.floor(metrics.account_age_days),
    bot_likelihood: Math.round(metrics.bot_likelihood * 100),
    posting_frequency: Math.round(metrics.posting_frequency * 100),
    follower_quality: Math.round(metrics.follower_quality * 100),
    growth_score: Math.round(metrics.growth_score * 100),
  };
  
  // Generate mock encrypted handles (32 bytes each, 8 handles)
  const handles: Uint8Array[] = [];
  for (let i = 0; i < 8; i++) {
    const handle = new Uint8Array(32);
    // Create deterministic "encryption" based on metric values for demo
    const seed = Object.values(scaledMetrics)[i] || 0;
    for (let j = 0; j < 32; j++) {
      handle[j] = ((seed * (j + 1)) + i) % 256;
    }
    handles.push(handle);
  }
  
  // Generate mock proof (128 bytes)
  const inputProof = new Uint8Array(128);
  const addrHash = userAddress.slice(2, 10); // Use address for seed
  for (let i = 0; i < 128; i++) {
    inputProof[i] = (parseInt(addrHash, 16) + i) % 256;
  }
  
  // Create hex payload using existing function
  const hexPayload = createHexPayload({ handles, inputProof });
  
  console.log('✓ Demo encryption complete');
  console.log('   Handles:', handles.length);
  console.log('   Payload size:', hexPayload.length, 'chars');
  
  return { handles, inputProof, hexPayload };
}

/**
 * Demo decrypt - generates mock reputation vector for demonstration
 * Used when FHE SDK is not available as a fallback
 */
export async function decryptResultDemo(hexPayload: string): Promise<ReputationVector> {
  console.log('🎭 Using demo decryption (FHE SDK not available)');
  
  // Parse the hex payload to get metrics context
  const { handles } = parseHexPayload(hexPayload);
  
  // Generate deterministic mock reputation based on handle data
  // Simulate reputation calculation from encrypted metrics
  let seed = 0;
  if (handles.length > 0 && handles[0].length > 0) {
    seed = handles[0][0] + handles[0][1] + handles[0][2];
  }
  
  // Generate realistic-looking reputation scores
  const authenticity = 65 + (seed % 20); // 65-85
  const influence = 50 + ((seed * 2) % 30); // 50-80
  const account_health = 70 + ((seed * 3) % 25); // 70-95
  const risk_score = 10 + ((seed * 4) % 30); // 10-40 (lower is better)
  const momentum = 55 + ((seed * 5) % 35); // 55-90
  
  const result: ReputationVector = {
    authenticity: authenticity / 100,
    influence: influence / 100,
    account_health: account_health / 100,
    risk_score: risk_score / 100,
    momentum: momentum / 100,
  };
  
  console.log('✓ Demo decryption complete');
  console.log('   Reputation:', result);
  
  // Add small delay to simulate async operation
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return result;
}

/**
 * Validate metrics object
 */
export function validateMetrics(metrics: TwitterMetrics): boolean {
  return (
    typeof metrics.follower_count === 'number' &&
    typeof metrics.following_count === 'number' &&
    typeof metrics.engagement_rate === 'number' &&
    typeof metrics.account_age_days === 'number' &&
    typeof metrics.bot_likelihood === 'number' &&
    typeof metrics.posting_frequency === 'number' &&
    typeof metrics.follower_quality === 'number' &&
    typeof metrics.growth_score === 'number' &&
    metrics.follower_count >= 0 &&
    metrics.following_count >= 0 &&
    metrics.engagement_rate >= 0 &&
    metrics.engagement_rate <= 100 &&
    metrics.account_age_days >= 0 &&
    metrics.bot_likelihood >= 0 &&
    metrics.bot_likelihood <= 100 &&
    metrics.posting_frequency >= 0 &&
    metrics.posting_frequency <= 100 &&
    metrics.follower_quality >= 0 &&
    metrics.follower_quality <= 100 &&
    metrics.growth_score >= 0 &&
    metrics.growth_score <= 100
  );
}