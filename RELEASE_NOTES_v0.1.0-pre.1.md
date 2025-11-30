# Privara v0.1.0-pre.1 - Pre-release

This is the first pre-release of Privara, featuring full FHEVM integration with Zama's Fully Homomorphic Encryption technology.

## What's Included

### Smart Contract (FHEVM)
- Deployed Privara.sol contract to Sepolia testnet
- Contract address: `0x293C20c5E122ea3e876DB5D44509BA94a78A42D9`
- Full FHE operations for reputation computation
- 5 reputation metrics: Authenticity, Influence, Account Health, Risk, Momentum
- View on Etherscan: https://sepolia.etherscan.io/address/0x293C20c5E122ea3e876DB5D44509BA94a78A42D9

### Frontend
- Next.js application with wallet integration (Wagmi, ConnectKit)
- Real Zama FHE encryption using `@zama-fhe/relayer-sdk`
- Complete user flow: Connect → Encrypt → Submit → Decrypt
- Mock Twitter data for demo purposes
- Modern, responsive UI with Tailwind CSS

### Testing
- 30+ comprehensive test cases
- Full integration test coverage
- Edge case testing (zero values, maximum values, boundary conditions)
- Error handling validation
- Multiple user scenarios
- Event emission verification

## Features

- **End-to-End FHE Encryption**: All data encrypted using Zama FHE
- **Privacy-Preserving Computation**: Reputation computed entirely on encrypted data
- **On-Chain Storage**: Encrypted metrics stored on Ethereum
- **User-Controlled Decryption**: Only users can decrypt their results
- **Wallet Integration**: MetaMask and compatible wallet support
- **Reputation Vector**: 5 comprehensive metrics (authenticity, influence, account health, risk, momentum)

## Technical Details

### Reputation Formulas

All computations happen under FHE on encrypted data:

- **Authenticity**: 100 - bot_likelihood
- **Influence**: engagement_rate
- **Account Health**: (posting_frequency + follower_quality) / 2
- **Risk Score**: bot_likelihood
- **Momentum**: growth_score

### Architecture

```
Browser  --encrypt-->  Smart Contract  --FHE compute-->  Encrypted Results
   ^                                                             |
   |                                                             |
 decrypt <---- encrypted result <-------------------------------
```

## Known Limitations

- Twitter integration uses mock data (OAuth removed for demo)
- Deployed on Sepolia testnet only
- Requires FHEVM-compatible network

## Getting Started

See [README.md](README.md) for full installation and setup instructions.

### Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../fhevm-deploy && npm install
   ```
3. Configure environment variables (see README.md)
4. Run tests:
   ```bash
   cd fhevm-deploy && npm test
   ```
5. Start frontend:
   ```bash
   cd frontend && npm run dev
   ```

## Test Coverage

- 30+ test cases covering:
  - Deployment scenarios
  - Metric submission (single and multiple users)
  - Reputation computation
  - Result retrieval and decryption
  - Edge cases and error handling
  - Event emissions
  - Reset functionality
  - Integration flows

## Next Steps

- Production-ready Twitter OAuth integration
- Mainnet deployment
- Enhanced UI/UX features
- Additional reputation metrics
- Multi-chain support

## Acknowledgments

Built with [Zama FHE](https://www.zama.org/) for privacy-preserving computation.

## Security

This is pre-release software. Use at your own risk. Do not use in production without proper security audits.








