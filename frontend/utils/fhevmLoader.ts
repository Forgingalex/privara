/**
 * FHEVM SDK Loader
 * Isolates SDK import to prevent SSR chunk evaluation issues
 * Based on fhedback architecture pattern
 * 
 * CRITICAL: No imports of @zama-fhe/relayer-sdk at top level
 * All imports happen inside the function body
 */

// Type definition to avoid importing from SDK (prevents webpack analysis)
type FhevmInstance = any;

export const createFhevmInstance = async (): Promise<FhevmInstance | null> => {
  // PRIMARY SSR GUARD: Early return for SSR - must be first check
  // This prevents ANY SDK code from executing on the server
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Additional environment checks to ensure we're in a browser
  if (typeof globalThis === 'undefined') {
    return null;
  }
  
  // Ensure we have a proper browser window object
  if (!globalThis.window || !window.document) {
    return null;
  }

  // Require wallet provider (fhedback pattern)
  if (!window.ethereum) {
    throw new Error(
      'Ethereum provider (MetaMask/wallet) is required. ' +
      'Please connect your wallet first before initializing FHE SDK.'
    );
  }

  // CRITICAL: This import happens ONLY when this function is called,
  // preventing chunk evaluation during SSR or module parsing
  const { initSDK, createInstance } = await import("@zama-fhe/relayer-sdk/web");

  // Initialize WASM modules first (required by Zama SDK)
  await initSDK();

  // Create instance with Sepolia configuration
  const correctRelayerUrl = process.env.NEXT_PUBLIC_ZAMA_RELAYER_URL || "https://relayer.testnet.zama.org";
  
  const instance = await createInstance({
    // Hardcoded Sepolia Chain ID as per Zama docs
    chainId: 11155111,
    gatewayChainId: 55815, // Sepolia gateway chain ID
    network: window.ethereum,
    relayerUrl: correctRelayerUrl,
  });

  return instance;
};
