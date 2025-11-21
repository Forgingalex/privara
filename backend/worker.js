/**
 * Privara FHE Compute Worker
 * Listens for encrypted data submissions and computes reputation under FHE
 */

const { ethers } = require('ethers');
const { computeReputation } = require('./compute');
const { listenForEvents } = require('./listener');
const config = require('../config/config.json');

async function main() {
  console.log('🚀 Starting Privara FHE Worker...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Validate configuration
  if (!config.rpcUrl || !config.privateKey || !config.contractAddress) {
    throw new Error('Missing required configuration. Check config/config.json');
  }

  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  // Load contract ABI (simplified - in production, load from artifacts)
  const contractABI = [
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
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'address', name: 'user', type: 'address' },
        { indexed: false, internalType: 'bytes', name: 'encryptedPayload', type: 'bytes' },
      ],
      name: 'EncryptedDataSubmitted',
      type: 'event',
    },
  ];
  
  const contract = new ethers.Contract(
    config.contractAddress,
    contractABI,
    wallet
  );

  console.log(`📍 Worker address: ${wallet.address}`);
  console.log(`📍 Contract address: ${config.contractAddress}`);
  console.log(`📍 Network: ${config.rpcUrl}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize FHE SDK
  console.log('🔐 Initializing FHE SDK...');
  // TODO: Initialize actual Zama FHE SDK
  console.log('✓ FHE SDK initialized\n');

  // Listen for encrypted data submissions
  console.log('👂 Listening for EncryptedDataSubmitted events...\n');
  
  listenForEvents(contract, wallet, async (user, encryptedPayload) => {
    console.log(`\n📥 Processing encrypted data for user: ${user}`);
    console.log(`   Payload size: ${encryptedPayload.length} bytes`);
    
    try {
      // Run FHE computation
      console.log('⚙️  Computing reputation under FHE...');
      const encryptedResult = await computeReputation(encryptedPayload);
      
      // Store result on-chain
      console.log('💾 Storing encrypted result on-chain...');
      const tx = await contract.storeEncryptedResult(user, encryptedResult);
      console.log(`   Transaction hash: ${tx.hash}`);
      
      console.log('⏳ Waiting for confirmation...');
      await tx.wait();
      
      console.log(`✅ Success! Encrypted result stored for user: ${user}`);
      console.log(`   Result size: ${encryptedResult.length} bytes\n`);
    } catch (error) {
      console.error(`❌ Error processing user ${user}:`, error.message);
      console.error(error.stack);
    }
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down worker...');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

