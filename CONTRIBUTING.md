# Contributing to Privara

Thank you for your interest in contributing to Privara! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- An Ethereum wallet (for testing)
- Basic knowledge of:
  - React/Next.js (for frontend)
  - Node.js (for backend)
  - Solidity (for smart contracts)
  - Fully Homomorphic Encryption concepts

### Setting Up Development Environment

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

4. **Set up configuration**
   ```bash
   # Copy example config
   cp config/config.json.example config/config.json
   # Edit config/config.json with your settings
   
   # Copy frontend env example
   cd ../frontend
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

## Development Workflow

### Running the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000`

### Running the Backend Worker

```bash
cd backend
npm start
```

The worker will listen for blockchain events and process FHE computations.

### Deploying Contracts

```bash
# Compile contracts (using Hardhat or Foundry)
npx hardhat compile
# or
forge build

# Deploy
node scripts/deploy.js
```

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for frontend code
- Use modern ES6+ syntax
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and small

### Solidity

- Follow [Solidity Style Guide](https://docs.soliditylang.org/en/v0.8.20/style-guide.html)
- Use NatSpec comments for all public functions
- Keep contracts modular and focused
- Add events for important state changes

### Code Formatting

- Use Prettier for JavaScript/TypeScript
- Use Solidity formatter for contracts
- Run `npm run lint` before committing

## Making Changes

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Commit Messages

Follow conventional commits format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: improve code structure`

### Pull Request Process

1. Create a branch from `main`
2. Make your changes
3. Write/update tests if applicable
4. Update documentation if needed
5. Ensure all tests pass
6. Submit a pull request with a clear description

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] All tests pass locally

## Project Structure

```
privara/
├── frontend/       # Next.js frontend application
├── backend/        # FHE compute worker
├── contracts/      # Solidity smart contracts
├── scripts/        # Deployment scripts
└── config/         # Configuration files
```

## Areas for Contribution

- **Frontend**: UI improvements, new features, bug fixes
- **Backend**: FHE computation optimizations, error handling
- **Smart Contracts**: Gas optimizations, security improvements
- **Documentation**: Improving docs, adding examples
- **Testing**: Adding unit/integration tests
- **Zama FHE Integration**: Improving FHE operations

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and constructive in discussions

Thank you for contributing to Privara! 🎉

