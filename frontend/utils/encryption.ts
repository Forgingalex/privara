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
 * Demo decrypt - throws error as mock encryption is removed
 * Real decryption must use decryptResult with FHE instance
 */
export async function decryptResultDemo(hexPayload: string): Promise<ReputationVector> {
  throw new Error(
    'Mock decryption is no longer available. This application requires real Zama FHE encryption. ' +
    'Please use decryptResult with a valid FHE instance from FHEProvider.'
  );
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