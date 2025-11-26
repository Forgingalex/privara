// FHEVM Hardhat plugin - install from FHEVM template if needed
// For now, using standard Hardhat configuration
// See: https://github.com/zama-ai/fhevm-hardhat-template

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: process.env.RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // FHEVM networks require special configuration
    // Check FHEVM documentation for network setup
  },
  fhevm: {
    // FHEVM configuration
    // This will be configured based on your FHEVM network
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

