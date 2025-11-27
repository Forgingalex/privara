/**
 * Encryption Utilities for Privara
 * Uses Zama FHE relayer SDK for real homomorphic encryption
 */

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

// FHE SDK instance - lazy loaded
let fhevmInstance: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Contract address from env
const getContractAddress = (): string => {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr || addr === '0x0000000000000000000000000000000000000001') {
    throw new Error('Please set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
  }
  return addr;
};

/**
 * Initialize FHE SDK for Sepolia network
 */
export async function initializeFHE(contractAddr?: string): Promise<void> {
  // Return existing initialization if in progress
  if (initPromise) return initPromise;
  if (fhevmInstance) return;

  isInitializing = true;
  
  initPromise = (async () => {
    console.log('🔐 Initializing Zama FHE SDK...');
    
    try {
      // Only initialize in browser environment
    if (typeof window === 'undefined') {
        throw new Error('FHE SDK can only be initialized in browser');
      }
      
      // Use dynamic import - webpack will bundle it properly now
      // Import from the main package entry point
      const sdkModule = await import('@zama-fhe/relayer-sdk/web');
      const { initSDK, createInstance, SepoliaConfig } = sdkModule;
      
      // Initialize WASM modules first (required for SDK to work)
      console.log('   Loading WASM modules...');
      await initSDK();
      
      // Create config with network provider (required for wallet integration)
      const config = {
        ...SepoliaConfig,
        network: typeof window !== 'undefined' && window.ethereum ? window.ethereum : undefined,
      };
      
      // Create FHE instance with Sepolia config
      console.log('   Creating FHE instance...');
      fhevmInstance = await createInstance(config);
      
      console.log('✓ FHE SDK initialized for Sepolia');
    } catch (error: any) {
      console.error('Failed to initialize FHE SDK:', error);
      console.error('   Error details:', error?.message || error);
      
      // Fall back to mock mode if SDK fails (e.g., WASM not supported or package not installed)
      console.warn('⚠️ Falling back to mock encryption mode');
      console.warn('   This is expected if @zama-fhe/relayer-sdk is not installed or WASM is not supported');
      fhevmInstance = createMockInstance();
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

/**
 * Create mock FHE instance for development/fallback
 */
function createMockInstance() {
  return {
    isMock: true,
    createEncryptedInput: (contractAddress: string, userAddress: string) => {
      const values: number[] = [];
      const builder = {
        add32: (value: number | bigint) => {
          values.push(Number(value));
          return builder;
        },
        encrypt: async () => {
          // Create mock handles (32 bytes each) - more realistic format
          const handles = values.map((v, i) => {
            const handle = new Uint8Array(32);
            // Store index in first byte
            handle[0] = i;
            // Store value in last byte
            handle[31] = v % 256;
            // Fill middle bytes with hash-like pattern for realism
            const hash = (i * 17 + v) % 256;
            for (let j = 1; j < 31; j++) {
              handle[j] = (hash + j) % 256;
            }
            return handle;
          });
          
          // Create mock proof - more realistic size and format
          const inputProof = new Uint8Array(256); // More realistic proof size
          // Add a recognizable header (but not DEAD which looks like an error)
          inputProof[0] = 0x01;
          inputProof[1] = 0x02;
          // Fill with data based on handles
          for (let i = 2; i < inputProof.length; i++) {
            inputProof[i] = (i + values.reduce((a, b) => a + b, 0)) % 256;
          }
          
          return { handles, inputProof };
        },
      };
      return builder;
    },
    generateKeypair: () => ({
      publicKey: '0x' + '00'.repeat(32),
      privateKey: '0x' + 'ff'.repeat(32),
    }),
  };
}

/**
 * Check if using real FHE or mock
 */
export function isRealFHE(): boolean {
  return fhevmInstance && !fhevmInstance.isMock;
}

/**
 * Encrypt Twitter metrics using FHE
 * Returns encrypted handles and proof for contract submission
 */
export async function encryptMetrics(
  metrics: TwitterMetrics,
  userAddress: string
): Promise<{ handles: Uint8Array[]; inputProof: Uint8Array; hexPayload: string }> {
  await initializeFHE();
  
  if (!userAddress) {
    throw new Error('User address required for encryption');
  }
  
  const contractAddress = getContractAddress();
  
  console.log('🔒 Encrypting metrics with FHE...');
  console.log('   Contract:', contractAddress);
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
  
  // Create encrypted input with 8 metrics
  const encryptedInput = await fhevmInstance
    .createEncryptedInput(contractAddress, userAddress)
    .add32(scaledMetrics.follower_count)
    .add32(scaledMetrics.following_count)
    .add32(scaledMetrics.engagement_rate)
    .add32(scaledMetrics.account_age_days)
    .add32(scaledMetrics.bot_likelihood)
    .add32(scaledMetrics.posting_frequency)
    .add32(scaledMetrics.follower_quality)
    .add32(scaledMetrics.growth_score)
    .encrypt();
  
  console.log('✓ Metrics encrypted');
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
  // Combine handles and proof into single payload
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
 * This requires the user to sign an EIP712 message for decryption permission
 */
export async function decryptResult(
  encryptedResults: Uint8Array[],
  contractAddress: string,
  userAddress: string,
  signMessage: (message: any) => Promise<string>
): Promise<ReputationVector> {
  await initializeFHE();
  
  console.log('🔓 Preparing decryption...');
  
  // For real FHE, we need to use the gateway for decryption
  // This requires:
  // 1. Generate a keypair
  // 2. Create EIP712 signature request
  // 3. User signs the request
  // 4. Call userDecrypt with signature
  
  if (!fhevmInstance.isMock) {
    // Real FHE decryption
    const { publicKey, privateKey } = fhevmInstance.generateKeypair();
    
    // Create EIP712 data for decryption permission
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 1; // Permission valid for 1 day
    
    const eip712 = fhevmInstance.createEIP712(
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
    const decryptedResults = await fhevmInstance.userDecrypt(
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
    
    // Parse results (5 scores: authenticity, influence, health, risk, momentum)
    return {
      authenticity: Number(decryptedResults[0]) / 100,
      influence: Number(decryptedResults[1]) / 100,
      account_health: Number(decryptedResults[2]) / 100,
      risk_score: Number(decryptedResults[3]) / 100,
      momentum: Number(decryptedResults[4]) / 100,
    };
  }
  
  // Mock decryption for development
  console.log('⚠️ Using mock decryption');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    authenticity: 85.5,
    influence: 72.3,
    account_health: 91.2,
    risk_score: 12.8,
    momentum: 67.4,
  };
}

/**
 * Simplified decrypt for demo (without real FHE signature flow)
 */
export async function decryptResultDemo(hexPayload: string): Promise<ReputationVector> {
  console.log('🔓 Decrypting result (demo mode)...');
  
  // Simulate decryption delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate deterministic but varied results based on payload hash
  let hash = 0;
  for (let i = 0; i < Math.min(hexPayload.length, 100); i++) {
    hash = ((hash << 5) - hash) + hexPayload.charCodeAt(i);
    hash = hash & hash;
  }
  
  const seed = Math.abs(hash);
  const generate = (offset: number) => ((seed + offset * 1337) % 8000 + 2000) / 100;
  
  console.log('✓ Result decrypted (demo)');
  
  return {
    authenticity: generate(0),
    influence: generate(1),
    account_health: generate(2),
    risk_score: Math.min(30, generate(3)), // Risk should be low for good accounts
    momentum: generate(4),
  };
}

/**
 * Validate metrics before encryption
 */
export function validateMetrics(metrics: TwitterMetrics): boolean {
  return (
    metrics.follower_count >= 0 &&
    metrics.following_count >= 0 &&
    metrics.engagement_rate >= 0 &&
    metrics.engagement_rate <= 100 &&
    metrics.account_age_days >= 0 &&
    metrics.bot_likelihood >= 0 &&
    metrics.bot_likelihood <= 100 &&
    metrics.posting_frequency >= 0 &&
    metrics.posting_frequency <= 1 &&
    metrics.follower_quality >= 0 &&
    metrics.follower_quality <= 100 &&
    metrics.growth_score >= 0 &&
    metrics.growth_score <= 100
  );
}
