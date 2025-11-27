# Privara

**The privacy-preserving reputation layer for social identity.**

Privara computes social reputation from encrypted Twitter data using Zama FHE, ensuring no raw analytics are ever exposed.

## Overview

Privara enables users to generate a Private Reputation Identity using encrypted Twitter metrics. The system computes a Reputation Vector (authenticity, influence, account health, risk, momentum) entirely under Fully Homomorphic Encryption (FHE), with results remaining encrypted end-to-end. Only the user can decrypt their final reputation scores.

## Features

- **End-to-End Encryption**: All data encrypted using Zama FHE
- **Twitter Integration**: Fetch and encrypt Twitter metrics
- **Wallet Integration**: Connect with MetaMask or compatible wallets
- **On-Chain Storage**: Encrypted data stored on Ethereum
- **FHE Computation**: Reputation computed entirely under encryption
- **Reputation Vector**: 5 comprehensive metrics (authenticity, influence, account health, risk, momentum)
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS

## Architecture

```
Browser  --encrypt-->  Smart Contract  --event--> FHE Engine
   ^                                                       |
   |                                                       |
 decrypt <---- encrypted result <--------------------------
```

### Components

- **Frontend**: Next.js + React + Wagmi (browser-side encryption)
- **Smart Contract**: Solidity (Ethereum) - stores encrypted data
- **FHE Compute Worker**: Node.js + Zama FHE SDK (off-chain computation)
- **Encryption**: Zama FHE (end-to-end)

## Project Structure

```
privara/
├── frontend/          # Next.js frontend application
│   ├── pages/         # Application pages
│   ├── utils/         # Encryption, Twitter, wallet utilities
│   └── config/        # Contract configuration
├── contracts/         # Solidity smart contracts
│   └── Privara.sol    # Main contract
├── backend/           # FHE compute worker
│   ├── worker.js      # Main worker script
│   ├── compute.js     # FHE computation engine
│   └── listener.js    # Blockchain event listener
├── scripts/           # Deployment & interaction scripts
└── config/           # Configuration files
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Ethereum wallet with testnet ETH
- Twitter API credentials (optional, uses mocks by default)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/privara.git
   cd privara
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   npm install
   ```

### Configuration

1. **Frontend configuration**
   ```bash
   cd frontend
   cp .env.example .env.local
   ```
   
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_ALCHEMY_ID=your_alchemy_key
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_key
   NEXT_PUBLIC_USE_TWITTER_MOCKS=true
   ```

2. **Backend configuration**
   ```bash
   cd ../config
   cp config.json.example config.json
   ```
   
   Edit `config/config.json`:
   ```json
   {
     "rpcUrl": "https://sepolia.infura.io/v3/YOUR_KEY",
     "privateKey": "YOUR_WORKER_PRIVATE_KEY",
     "contractAddress": "0x..."
   }
   ```

### Running the Application

1. **Start frontend** (Terminal 1)
   ```bash
   cd frontend
   npm run dev
   ```
   Open http://localhost:3000

2. **Start backend worker** (Terminal 2)
   ```bash
   cd backend
   npm start
   ```

3. **Deploy smart contract** (if not already deployed)
   ```bash
   # Compile
   npx hardhat compile
   # or
   forge build
   
   # Deploy
   node scripts/deploy.js
   ```

## Reputation Formulas

The system computes 5 reputation metrics (0-100 scale) using integer approximations for FHE compatibility:

### Authenticity
```
0.4 * (followers/following) + 
0.3 * (100 - bot_likelihood) + 
0.3 * (account_age_days/365 * 100)
```

### Influence
```
0.5 * log(followers + 1) + 
0.3 * engagement_rate + 
0.2 * growth_score
```

### Account Health
```
0.5 * posting_frequency + 
0.3 * follower_quality + 
0.2 * engagement_rate
```

### Risk Score
```
100 - ((authenticity + account_health) / 2)
```

### Momentum
```
0.6 * growth_score + 
0.4 * engagement_rate
```

## Security

- **End-to-end encryption**: All data encrypted using Zama FHE
- **Zero raw data exposure**: No analytics exposed in plaintext
- **On-chain storage**: Encrypted data stored on Ethereum
- **User-controlled decryption**: Only user can decrypt results

## Development Status

### Completed
- Frontend architecture updated for Zama FHE SDK integration
- Encryption utilities refactored for Zama FHE compatibility
- Smart contract deployed to Sepolia testnet ([View on Etherscan](https://sepolia.etherscan.io/address/0x293C20c5E122ea3e876DB5D44509BA94a78A42D9))
- Comprehensive test suite with 30+ test cases
- Frontend deployed and live ([Demo](https://privara-neon.vercel.app/))
- Automatic network switching to Sepolia testnet
- Transaction error handling and pre-submission validation
- Disconnect wallet functionality
- Zama FHE SDK package installed and properly initialized with WASM loading

### In Progress
- Real Zama FHE encryption (SDK installed, needs testing with live contract)
- Enhanced Twitter API integration (currently using mock data)
- Multi-chain support

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with [Zama FHE](https://www.zama.org/) for privacy-preserving computation.

## Disclaimer

This software is provided "as is" without warranty. Use at your own risk. This is experimental software and should not be used in production without proper security audits.

## Roadmap

- [ ] Production-ready Zama FHE SDK integration
- [ ] Enhanced Twitter API integration
- [ ] Multi-chain support
- [ ] Reputation history tracking
- [ ] API for third-party integrations
- [ ] Mobile app support

## Documentation

- [Contributing Guide](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)

## Links

- [Zama Documentation](https://docs.zama.org)
- [Zama Website](https://www.zama.org)
