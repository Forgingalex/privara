/**
 * Smart contract configuration for FHEVM version
 * 
 * This ABI matches the PrivaraFHEVM.sol contract
 * Update NEXT_PUBLIC_CONTRACT_ADDRESS after deployment
 */

export const PRIVARA_CONTRACT_ADDRESS = 
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || 
  '0x0000000000000000000000000000000000000000';

/**
 * FHEVM Contract ABI
 * 
 * Note: FHEVM uses euint32[] types instead of bytes
 * The actual ABI will be generated after compilation
 */
export const PRIVARA_FHEVM_ABI = [
  {
    inputs: [
      { 
        internalType: 'uint32[]', 
        name: 'encryptedMetricsArray', 
        type: 'uint32[]' 
      }
    ],
    name: 'submitEncryptedData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'computeReputation',
    outputs: [
      {
        internalType: 'uint32[]',
        name: '',
        type: 'uint32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { 
        internalType: 'uint32[]', 
        name: 'encryptedResult', 
        type: 'uint32[]' 
      },
    ],
    name: 'storeEncryptedResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getEncryptedResult',
    outputs: [
      {
        internalType: 'uint32[]',
        name: '',
        type: 'uint32[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'hasUserSubmitted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isResultReady',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'EncryptedDataSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'EncryptedResultStored',
    type: 'event',
  },
] as const;

/**
 * NOTE: After compiling the FHEVM contract with Hardhat,
 * use the generated ABI from artifacts/contracts/PrivaraFHEVM.sol/PrivaraFHEVM.json
 * 
 * The actual ABI will have euint32 types which may be represented differently
 * in the JSON ABI format. Check the compiled artifacts for the exact format.
 */








