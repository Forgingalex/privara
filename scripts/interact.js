/**
 * Interact with deployed Privara contract
 */

const { ethers } = require('ethers');
const config = require('../config/config.json');

async function main() {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  // Load contract ABI (simplified)
  const contractABI = [
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
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'getEncryptedResult',
      outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
      stateMutability: 'view',
      type: 'function',
    },
  ];
  
  const contract = new ethers.Contract(
    config.contractAddress,
    contractABI,
    wallet
  );

  console.log('📡 Interacting with Privara contract...');
  console.log(`📍 Contract: ${config.contractAddress}`);
  console.log(`📍 Account: ${wallet.address}\n`);

  // Example: Check if user has submitted
  const testAddress = wallet.address;
  const hasSubmitted = await contract.hasUserSubmitted(testAddress);
  const resultReady = await contract.isResultReady(testAddress);
  
  console.log(`User ${testAddress}:`);
  console.log(`  Has submitted: ${hasSubmitted}`);
  console.log(`  Result ready: ${resultReady}`);
  
  if (resultReady) {
    const result = await contract.getEncryptedResult(testAddress);
    console.log(`  Result size: ${result.length} bytes`);
  }
}

main().catch(console.error);

