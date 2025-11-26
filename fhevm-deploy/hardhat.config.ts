import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import { vars } from "hardhat/config";
import "solidity-coverage";

import "./tasks/accounts";
import "./tasks/FHECounter";

// Run 'npx hardhat vars setup' to see the list of variables that need to be set
// Or use environment variables: MNEMONIC, PRIVATE_KEY, INFURA_API_KEY

const MNEMONIC: string = process.env.MNEMONIC || vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const PRIVATE_KEY: string = process.env.PRIVATE_KEY || vars.get("PRIVATE_KEY", "");
const INFURA_API_KEY: string = process.env.INFURA_API_KEY || vars.get("INFURA_API_KEY", "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");

// Use private key if available, otherwise use mnemonic
const getAccounts = () => {
  if (PRIVATE_KEY) {
    return [PRIVATE_KEY];
  }
  return {
    mnemonic: MNEMONIC,
    path: "m/44'/60'/0'/0/",
    count: 10,
  };
};

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY || vars.get("ETHERSCAN_API_KEY", ""),
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
      },
      chainId: 31337,
    },
    anvil: {
      accounts: getAccounts() as any,
      chainId: 31337,
      url: "http://localhost:8545",
    },
    sepolia: {
      accounts: getAccounts() as any,
      chainId: 11155111,
      // Free public RPC from PublicNode
      url: process.env.SEPOLIA_RPC_URL || `https://ethereum-sepolia-rpc.publicnode.com`,
      timeout: 120000, // 2 minute timeout
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
