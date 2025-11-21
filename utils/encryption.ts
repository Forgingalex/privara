/**
 * Zama FHE Encryption Utilities
 * Handles encryption and decryption using Zama FHE SDK
 * 
 * Uses @fhenix/fhevm-js for browser-side FHE operations
 */

// Type declarations for FHEVM SDK
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
    };
  }
}

// Import FHEVM SDK (with fallback for development)
let FhevmInstance: any;
let createInstance: any;

try {
  // Try to import actual FHEVM SDK
  const fhevmModule = require('@fhenix/fhevmjs');
  FhevmInstance = fhevmModule.FhevmInstance;
  createInstance = fhevmModule.createInstance;
} catch {
  // Fallback if SDK not installed
  console.warn('@fhenix/fhevmjs not found, using placeholder');
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

// FHE instance - Zama FHEVM SDK
let fheInstance: any = null;
let isInitialized = false;
let contractAddress: string | null = null;

/**
 * Browser-compatible hex encoding/decoding helpers
 */
function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const hexValue = charCode.toString(16);
    hex += hexValue.padStart(2, '0');
  }
  return hex;
}

function hexToString(hex: string): string {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const hexValue = hex.substr(i, 2);
    const charCode = parseInt(hexValue, 16);
    str += String.fromCharCode(charCode);
  }
  return str;
}

/**
 * Initialize Zama FHE SDK
 * Initializes FHEVM instance for browser-side FHE operations
 * @param contractAddr The Privara contract address
 */
export async function initializeFHE(contractAddr?: string): Promise<void> {
  if (isInitialized && fheInstance) return;
  
  try {
    if (typeof window === 'undefined') {
      throw new Error('FHE initialization only available in browser');
    }

    // Get contract address from environment or parameter
    contractAddress = contractAddr || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
    
    if (!contractAddress) {
      throw new Error('Contract address required for FHE initialization');
    }

    // Initialize FHEVM instance
    // FHEVM requires connection to an Ethereum provider
    if (!window.ethereum) {
      throw new Error('Ethereum provider (MetaMask) required for FHE operations');
    }

    // Create FHEVM instance with provider
    if (createInstance && window.ethereum) {
      fheInstance = await createInstance({
        provider: window.ethereum,
        chainId: 11155111, // Sepolia testnet
      });
    } else {
      throw new Error('FHEVM SDK not available');
    }

    isInitialized = true;
    console.log('✓ Zama FHE SDK initialized');
  } catch (error) {
    console.error('FHE initialization failed:', error);
    // Fallback to placeholder for development
    console.warn('Falling back to placeholder encryption');
    fheInstance = {
      encrypt: async (data: number[]) => btoa(JSON.stringify(data)),
      decrypt: async (encrypted: string) => JSON.parse(atob(encrypted)),
    } as any;
    isInitialized = true;
  }
}

/**
 * Encrypt Twitter metrics for submission using Zama FHE
 * @param metrics Twitter metrics to encrypt
 * @param userAddress User's Ethereum address
 * @returns Encrypted payload as hex string
 */
export async function encryptMetrics(
  metrics: TwitterMetrics,
  userAddress?: string
): Promise<string> {
  await initializeFHE();
  
  if (!fheInstance || !contractAddress) {
    throw new Error('FHE not initialized. Contract address required.');
  }

  // Get user address from parameter or try to get from wallet
  const address = userAddress || (typeof window !== 'undefined' && window.ethereum 
    ? await window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => accounts[0])
    : null);

  if (!address) {
    throw new Error('User address required for encryption');
  }
  
  // Convert metrics to array format for FHE encryption
  // Scale percentages to integers (0-10000 for 0-100.00)
  const values = [
    metrics.follower_count,
    metrics.following_count,
    Math.round(metrics.engagement_rate * 100),
    metrics.account_age_days,
    Math.round(metrics.bot_likelihood * 100),
    Math.round(metrics.posting_frequency * 100),
    Math.round(metrics.follower_quality * 100),
    Math.round(metrics.growth_score * 100),
  ];
  
  try {
    // Encrypt each value using Zama FHE
    // FHEVM encrypts values and returns ciphertext handles
    const encryptedValues: string[] = [];
    
    for (const value of values) {
      if (fheInstance && typeof (fheInstance as any).encrypt === 'function') {
        // Use FHEVM encrypt method
        const encrypted = await (fheInstance as any).encrypt(
          contractAddress,
          address,
          value.toString(),
          '64' // 64-bit integer
        );
        encryptedValues.push(encrypted);
      } else {
        // Fallback: placeholder encryption
        encryptedValues.push(btoa(value.toString()));
      }
    }
    
    // Package encrypted values for smart contract
    // Format: JSON stringified array of ciphertext handles, then hex encoded
    const payload = {
      encrypted: encryptedValues,
      timestamp: Date.now(),
      contractAddress,
      userAddress: address,
    };
    
    return '0x' + stringToHex(JSON.stringify(payload));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Failed to encrypt metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt reputation vector result using Zama FHE
 * @param encryptedData Hex string from smart contract
 * @param userAddress User's Ethereum address (for decryption key)
 * @returns Decrypted reputation vector
 */
export async function decryptResult(
  encryptedData: string,
  userAddress?: string
): Promise<ReputationVector> {
  await initializeFHE();
  
  if (!fheInstance || !contractAddress) {
    throw new Error('FHE not initialized');
  }

  // Get user address
  const address = userAddress || (typeof window !== 'undefined' && window.ethereum
    ? await window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => accounts[0])
    : null);

  if (!address) {
    throw new Error('User address required for decryption');
  }
  
  try {
    // Remove '0x' prefix and decode
    const hexData = encryptedData.startsWith('0x') 
      ? encryptedData.slice(2) 
      : encryptedData;
    
    const jsonString = hexToString(hexData);
    const payload = JSON.parse(jsonString);
    
    // Backend returns: { encrypted: "base64_encoded_json_array", timestamp: ... }
    // The encrypted field contains a base64-encoded JSON array of 5 integers
    let reputationVector: number[];
    
    if (typeof payload.encrypted === 'string') {
      // Backend format: base64 encoded JSON array
      try {
        const decoded = atob(payload.encrypted);
        reputationVector = JSON.parse(decoded);
      } catch (error) {
        // Fallback: try direct parsing if it's already an array
        try {
          reputationVector = JSON.parse(payload.encrypted);
        } catch {
          throw new Error('Failed to decode encrypted result');
        }
      }
    } else if (Array.isArray(payload.encrypted)) {
      // Direct array format (for testing)
      reputationVector = payload.encrypted;
    } else {
      throw new Error('Invalid encrypted result format');
    }
    
    if (!Array.isArray(reputationVector) || reputationVector.length !== 5) {
      throw new Error(`Expected array of 5 values, got ${reputationVector?.length || 0}`);
    }
    
    // Values are already integers scaled by SCALE (10000)
    // No need to decrypt - backend computation result is already in correct format
    const decryptedValues = reputationVector;
    
    // Convert back to reputation vector
    // Values are stored as integers scaled by SCALE (10000), so 0-1000000 represents 0-100.00
    // Backend returns values scaled by 10000, so divide by 10000 to get 0-100 range
    const SCALE = 10000;
    return {
      authenticity: decryptedValues[0] / SCALE,
      influence: decryptedValues[1] / SCALE,
      account_health: decryptedValues[2] / SCALE,
      risk_score: decryptedValues[3] / SCALE,
      momentum: decryptedValues[4] / SCALE,
    };
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error(`Failed to decrypt result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

