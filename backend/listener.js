/**
 * Blockchain Event Listener
 * Listens for EncryptedDataSubmitted events and triggers computation
 */

const { ethers } = require('ethers');

/**
 * Listen for EncryptedDataSubmitted events
 * @param {ethers.Contract} contract - The Privara contract instance
 * @param {ethers.Wallet} wallet - Wallet for signing transactions
 * @param {Function} callback - Callback function(user, encryptedPayload)
 */
function listenForEvents(contract, wallet, callback) {
  console.log('👂 Setting up event listener...');
  
  // Listen for new events
  contract.on('EncryptedDataSubmitted', (user, encryptedPayload, event) => {
    console.log(`\n📨 New event received:`);
    console.log(`   Block: ${event.log.blockNumber}`);
    console.log(`   User: ${user}`);
    console.log(`   Tx: ${event.log.transactionHash}`);
    
    // Call callback asynchronously
    setImmediate(() => {
      callback(user, encryptedPayload);
    });
  });
  
  // Check for past events on startup
  console.log('🔍 Checking for past events...');
  contract.queryFilter(contract.filters.EncryptedDataSubmitted(), -1000)
    .then(events => {
      console.log(`   Found ${events.length} past event(s)`);
      
      if (events.length > 0) {
        console.log('   Processing past events...\n');
        events.forEach((event, index) => {
          const user = event.args[0];
          const encryptedPayload = event.args[1];
          
          console.log(`   [${index + 1}/${events.length}] Processing user: ${user}`);
          
          setImmediate(() => {
            callback(user, encryptedPayload);
          });
        });
      } else {
        console.log('   No past events found\n');
      }
    })
    .catch(error => {
      console.error('   Error querying past events:', error.message);
    });
  
  console.log('✓ Event listener active\n');
}

module.exports = { listenForEvents };

