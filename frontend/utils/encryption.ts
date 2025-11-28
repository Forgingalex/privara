/**
 * Encryption Utilities for Privara
 * Uses Zama FHE relayer SDK for real homomorphic encryption
 */

// Ensure global is defined (should already be set by _document.tsx, but double-check)
if (typeof window !== 'undefined') {
  // @ts-ignore - global is not defined in browser by default
  if (typeof global === 'undefined') {
    // @ts-ignore
    const g = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
    try {
      // @ts-ignore
      (new Function('g', 'global = g'))(g);
    } catch (e) {
      // Fallback
      try {
        // @ts-ignore
        Object.defineProperty(g, 'global', {
          value: g,
          writable: true,
          enumerable: false,
          configurable: true,
        });
      } catch (e2) {
        // @ts-ignore
        window.global = g;
      }
    }
    // @ts-ignore
    if (typeof window !== 'undefined' && !window.global) {
      // @ts-ignore
      window.global = g;
    }
  }
}

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
 * Based on fhedback implementation approach
 */
export async function initializeFHE(contractAddr?: string): Promise<void> {
  // Return existing initialization if in progress
  if (initPromise) return initPromise;
  if (fhevmInstance) return;

  // Only initialize in browser environment
  if (typeof window === 'undefined') {
    throw new Error('FHE SDK can only be initialized in browser');
  }

  // CRITICAL: Require wallet provider before initialization (fhedback approach)
  // The SDK needs the ethereum provider to be available
  if (!window.ethereum) {
    throw new Error(
      'Ethereum provider (MetaMask/wallet) is required. ' +
      'Please connect your wallet first before initializing FHE SDK.'
    );
  }

  // Get contract address - needed for encryption operations
  let contractAddress: string;
  try {
    contractAddress = contractAddr || getContractAddress();
  } catch (e) {
    // Contract address might not be required for initialization itself
    // but log a warning
    console.warn('⚠️ Contract address not available yet:', e);
    contractAddress = '';
  }

  isInitializing = true;
  
  initPromise = (async () => {
    console.log('🔐 Initializing Zama FHE SDK...');
    if (contractAddress) {
      console.log('   Contract:', contractAddress);
    }
    
    try {
      // Use /web export path for browser environments (per Zama package exports)
      // The package uses package.json exports field - root path (.) is not exported
      // Must use specific export paths: /web for browser, /bundle for pre-bundled, /node for Node.js
      console.log('   Importing SDK module from /web export...');
      const sdkModule: any = await import('@zama-fhe/relayer-sdk/web');
      
      // Verify the module loaded correctly
      if (!sdkModule || typeof sdkModule !== 'object') {
        throw new Error('SDK module failed to load - module is undefined or invalid');
      }
      
      console.log('   SDK module loaded, available exports:', Object.keys(sdkModule));
      
      // Extract required exports
      const { initSDK, createInstance, SepoliaConfig } = sdkModule;
      
      // Verify required exports exist
      if (!initSDK || typeof initSDK !== 'function') {
        throw new Error(
          `initSDK is not exported from SDK module. ` +
          `Available exports: ${Object.keys(sdkModule).join(', ')}`
        );
      }
      
      if (!createInstance || typeof createInstance !== 'function') {
        throw new Error('createInstance is not exported from SDK module');
      }
      
      if (!SepoliaConfig || typeof SepoliaConfig !== 'object') {
        throw new Error('SepoliaConfig is not exported from SDK module');
      }
      
      console.log('   ✓ All required SDK exports verified');
      
      // Log SepoliaConfig to inspect configuration (for debugging)
      // Per Zama docs, SepoliaConfig contains all network-specific settings
      console.log('   SepoliaConfig:', {
        chainId: SepoliaConfig?.chainId,
        gatewayChainId: (SepoliaConfig as any)?.gatewayChainId,
        relayerUrl: (SepoliaConfig as any)?.relayerUrl || 'not visible in config',
      });
      
      // Per Zama docs: "you need to load the WASM of TFHE first with initSDK"
      console.log('   Loading WASM modules...');
      await initSDK();
      console.log('   ✓ WASM modules loaded');
      
      // Create config with network provider (per Zama docs pattern)
      // Per Zama docs: "const config = { ...SepoliaConfig, network: window.ethereum };"
      console.log('   Creating config...');
      const config = {
        ...SepoliaConfig,
        network: window.ethereum,
        // Use correct relayer URL from Zama docs: https://relayer.testnet.zama.org
        // Can be overridden via NEXT_PUBLIC_ZAMA_RELAYER_URL environment variable
        relayerUrl: process.env.NEXT_PUBLIC_ZAMA_RELAYER_URL || 'https://relayer.testnet.zama.org',
      };
      
      console.log('   Final config:', {
        chainId: config.chainId,
        gatewayChainId: (config as any)?.gatewayChainId,
        network: config.network ? 'ethereum provider available' : 'no ethereum provider',
        relayerUrl: (config as any)?.relayerUrl || 'using default from SepoliaConfig',
      });
      
      // Log the relayer URL being used for debugging
      const finalRelayerUrl = (config as any)?.relayerUrl;
      if (finalRelayerUrl) {
        console.log('   ✓ Relayer URL:', finalRelayerUrl);
      }
      
      // Create FHE instance with config (per Zama docs)
      // Per Zama docs: "const instance = await createInstance(config);"
      console.log('   Creating FHE instance (this may take a moment)...');
      console.log('   Note: This connects to Zama relayer gateway...');
      if ((config as any)?.relayerUrl) {
        console.log('   Relayer URL:', (config as any).relayerUrl);
      }
      
      // Add timeout and better error handling for network issues
      const createInstancePromise = createInstance(config);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Relayer connection timeout after 30 seconds')), 30000)
      );
      
      fhevmInstance = await Promise.race([createInstancePromise, timeoutPromise]);
      
      console.log('✓ FHE SDK initialized for Sepolia');
    } catch (error: any) {
      console.error('❌ Failed to initialize FHE SDK:', error);
      console.error('   Error details:', error?.message || error);
      console.error('   Full error:', error);
      console.error('   Error stack:', error?.stack);
      
      // Provide more helpful error message based on error type
      let errorMessage = error?.message || 'Unknown error';
      const errorString = String(error);
      
      // Detect DNS resolution failures
      if (errorString.includes('ERR_NAME_NOT_RESOLVED') || 
          errorString.includes('Failed to fetch') ||
          errorString.includes('NetworkError') ||
          errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `DNS/Network error: Cannot resolve relayer gateway hostname. ` +
          `This usually means: (1) The relayer URL in SepoliaConfig is incorrect, ` +
          `(2) There's a network connectivity issue, or (3) The relayer gateway is down. ` +
          `Please check your internet connection and try again. ` +
          `Original error: ${errorMessage}`;
      } else if (errorMessage.includes('Relayer') || errorMessage.includes('Bad JSON')) {
        errorMessage = `Relayer connection failed: ${errorMessage}. ` +
          `The Zama FHE relayer gateway may be temporarily unavailable or unreachable. ` +
          `Please check your internet connection and try again. ` +
          `If the issue persists, the relayer may be under maintenance.`;
      } else if (errorMessage.includes('timeout')) {
        errorMessage = `Relayer connection timeout: ${errorMessage}. ` +
          `The Zama FHE relayer gateway did not respond in time. Please try again.`;
      }
      
      isInitializing = false;
      
      // Throw error - no mock fallback, app requires real FHE
      throw new Error(
        `FHE SDK initialization failed: ${errorMessage}. ` +
        `Please ensure @zama-fhe/relayer-sdk is properly installed, WASM is supported in your browser, ` +
        `and the Zama relayer gateway is accessible.`
      );
    } finally {
      isInitializing = false;
    }
  })();
  
  return initPromise;
}

/**
 * Check if FHE SDK is initialized
 */
export function isRealFHE(): boolean {
  return fhevmInstance !== null;
}

/**
 * Encrypt Twitter metrics using FHE
 * Returns encrypted handles and proof for contract submission
 */
export async function encryptMetrics(
  metrics: TwitterMetrics,
  userAddress: string
): Promise<{ handles: Uint8Array[]; inputProof: Uint8Array; hexPayload: string }> {
  // Initialize FHE SDK (will throw if it fails)
  await initializeFHE();
  
  if (!fhevmInstance) {
    throw new Error('FHE SDK not initialized. Please refresh the page and ensure Zama FHE SDK loads correctly.');
  }
  
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
  
  // Create encrypted input with 8 metrics using real Zama FHE SDK
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
  
  // Ensure FHE SDK is initialized
  if (!fhevmInstance) {
    throw new Error('FHE SDK not initialized. Cannot decrypt without Zama FHE SDK.');
  }
  
  // Real FHE decryption using Zama SDK
  // This requires:
  // 1. Generate a keypair
  // 2. Create EIP712 signature request
  // 3. User signs the request
  // 4. Call userDecrypt with signature
  
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

/**
 * Demo decrypt - throws error as mock encryption is removed
 * Real FHE decryption is required via decryptResult function
 */
export async function decryptResultDemo(hexPayload: string): Promise<ReputationVector> {
  throw new Error(
    'Mock decryption is no longer available. This application requires real Zama FHE encryption. ' +
    'Please ensure the FHE SDK is properly initialized and use the real decryptResult function with signature support.'
  );
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
