/**
 * Smart contract configuration
 */

export const PRIVARA_CONTRACT_ADDRESS = 
  (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`) || 
  '0x0000000000000000000000000000000000000000';

export const PRIVARA_ABI = [
  {
    inputs: [{ internalType: 'bytes', name: 'encryptedPayload', type: 'bytes' }],
    name: 'submitEncryptedData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'bytes', name: 'encryptedResult', type: 'bytes' },
    ],
    name: 'storeEncryptedResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getEncryptedResult',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
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
      { indexed: false, internalType: 'bytes', name: 'encryptedPayload', type: 'bytes' },
    ],
    name: 'EncryptedDataSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'bytes', name: 'encryptedResult', type: 'bytes' },
    ],
    name: 'EncryptedResultStored',
    type: 'event',
  },
] as const;

