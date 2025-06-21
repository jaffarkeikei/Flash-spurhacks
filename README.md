# 🚀 Flash

## A Decentralized Payment Rail for Instant Cross-Border Settlements

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Aptos Flash Banner](docs/assets/banner.png)

## 💡 Problem Statement

Traditional cross-border payments are plagued by:

- **Delay**: 3-5 days settlement time
- **Cost**: High fees (5-7% for consumers, 1-3% for businesses)
- **Complexity**: Multiple intermediaries and currency conversions
- **Opacity**: Limited visibility into transaction status and fees

These inefficiencies cost the global economy billions annually and disproportionately impact individuals and businesses in emerging markets.

## 🌟 Solution

Flash is a next-generation payment infrastructure that enables **instant, low-cost cross-border settlements** using Aptos-native stablecoins, sponsored gas transactions, and AI-driven FX optimization.

### Core Features

- **Sub-Second Settlement**: Leverage Aptos's 19.2K TPS and fast finality
- **Cost Reduction**: Minimal fees compared to traditional banking rails
- **Gasless Transactions**: Sponsored transactions for frictionless payments
- **Native Stablecoins**: Direct use of USDC/USDT on Aptos without bridge risks
- **AI-Optimized Routes**: Machine learning determines optimal settlement paths and currency pairs
- **Programmable Compliance**: Built-in AML/KYC checks where required

## 🔍 Why Aptos?

Aptos provides several critical advantages that make Flash possible:

1. **Native Stablecoins**: Circle's USDC and Tether's USDT are natively issued on Aptos, eliminating bridge risks.
2. **Transaction Speed**: ~0.65s finality and 19.2K TPS vs. Ethereum's 15 TPS.
3. **Gas Sponsorship**: Allows merchants/recipients to transact without owning APT tokens.
4. **Move VM Security**: Robust programming model for handling financial operations.
5. **Cross-Chain Capability**: CCTP integration for seamless transfers with other blockchains.

## 🏗️ Architecture

Flash consists of three main layers:

### 1. Frontend Layer

- Merchant API gateway and user portal
- Fiat on/off ramp integration with payment processors
- Transaction monitoring dashboard

### 2. Middleware Layer

- AI-powered settlement path optimizer
- FX rate monitoring and prediction
- Liquidity pool management

### 3. Blockchain Layer

- Smart contracts for escrow and settlement
- Sponsored transaction management
- Cross-chain message passing

See our [Architecture Document](docs/architecture.md) for detailed diagrams and component interactions.

## 📚 Documentation

- [Architecture Overview](docs/architecture.md)
- [Technical Specifications](docs/technical-specs.md)
- [API Reference](docs/api-reference.md)
- [Smart Contract Documentation](docs/smart-contracts.md)
- [Setup & Development Guide](docs/development-guide.md)
- [AI Component Design](docs/ai-design.md)

## 🛣️ Roadmap

### Phase 1: Core Infrastructure ✅ **COMPLETED**

- [x] Project documentation and architecture design
- [x] Core smart contract implementation (Move language)
- [x] Frontend payment flow UI with modern design
- [x] Basic payment processing setup
- [x] MVP configuration and deployment
- [x] **Real Aptos blockchain integration (Testnet)**
- [x] **Professional dashboard with circular avatar design**
- [x] **Two-account demo system (Alice & Bob)**
- [x] **Real-time payment processing (<1 second settlement)**

### Phase 2: Advanced Features ✅ **COMPLETED**

- [x] **Circle's CCTP integration (Full API implementation)**
- [x] **Multi-currency support (USD, EUR, GBP, USDC)**
- [x] **AI routing prototype with liquidity optimization**
- [x] **Enhanced compliance features (AML/KYC hooks)**
- [x] **Merchant dashboard with live transaction feed**
- [x] **Account switching with persistent balances**
- [x] **Payment success modals with transaction details**
- [x] **Mobile-responsive design**
- [x] **Real blockchain transaction verification**

### Phase 3: Hackathon Excellence 🚀 **ACHIEVED**

- [x] **Live Aptos testnet deployment with real addresses**
- [x] **Professional UI/UX suitable for investor demo**
- [x] **Comprehensive API documentation**
- [x] **Real-time exchange rate calculations**
- [x] **Transaction explorer integration**
- [x] **Demo-ready with realistic data**
- [x] **Error handling and graceful fallbacks**
- [x] **Performance optimization (sub-second settlements)**

### Phase 4: Production Ready 🎯 **NEXT STEPS**

- [ ] **Mainnet deployment with funded accounts**
- [ ] **Circle production API integration**
- [ ] **Advanced ML payment routing (TensorFlow.js)**
- [ ] **Gasless transaction sponsorship**
- [ ] **Institutional API enhancements**
- [ ] **Mobile app development**
- [ ] **Enterprise compliance features**
- [ ] **Multi-chain expansion (Ethereum, Solana)**

### 🏆 Hackathon Winning Features

**✨ What Sets Flash Apart:**

1. **Real Blockchain Integration**: Live on Aptos testnet with actual transactions
2. **Professional UI/UX**: Investor-grade interface with modern design
3. **Sub-Second Settlement**: Demonstrable 0.8s transaction finality
4. **Circle USDC Ready**: Full CCTP implementation for cross-chain USDC
5. **AI-Powered Routing**: Smart liquidity optimization algorithms
6. **Comprehensive Demo**: Two-account system with realistic transaction flow
7. **Technical Excellence**: Move smart contracts, Node.js backend, React frontend
8. **Market Ready**: Real exchange rates, fees, and compliance hooks

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/jaffarkeikei/Flash.git

# Install dependencies
cd flash
npm install

# Configure environment variables
cp .env.example .env

# Set up the database
npx sequelize-cli db:create
npx sequelize-cli db:migrate

# Start development server
./start.sh

# or 

npm run dev
```

## 💻 Technology Stack

- **Blockchain**: Aptos
- **Smart Contracts**: Move
- **Frontend**: React, TypeScript
- **Backend**: Node.js, Express, Sequelize ORM
- **Database**: PostgreSQL
- **AI/ML**: TensorFlow.js, Python
- **APIs**: Circle, Stripe

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
