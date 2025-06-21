# FlashSettle Deployment Guide

This guide will help you deploy FlashSettle to Aptos Testnet and integrate with Circle's USDC infrastructure.

## Prerequisites

- Node.js v16+ and npm
- Aptos CLI v7.2.0+
- PostgreSQL database
- Circle API account (for USDC integration)

## Step 1: Environment Setup

Update your `.env` file with the following configuration:

```bash
# Server Configuration
PORT=7001
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flashsettle
DB_USER=postgres
DB_PASSWORD=password

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# Blockchain Configuration - UPDATED FOR TESTNET
APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1
APTOS_FAUCET_URL=https://faucet.testnet.aptoslabs.com
APTOS_PRIVATE_KEY=your_aptos_private_key_here
APTOS_ADDRESS=your_aptos_address_here

# Enable real blockchain transactions (set to 'true' after deployment)
ENABLE_REAL_BLOCKCHAIN=false

# Circle API (For USDC)
CIRCLE_API_KEY=your_circle_api_key_here
CIRCLE_API_URL=https://api-sandbox.circle.com
CIRCLE_WALLET_ID=your_circle_wallet_id_here

# Enable Circle API integration (set to 'true' with real API key)
ENABLE_CIRCLE_API=false

# AI Optimization
ENABLE_AI_OPTIMIZATION=true

# Logging
LOG_LEVEL=debug

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

## Step 2: Deploy Smart Contracts to Aptos Testnet

### 2.1 Run the Deployment Script

```bash
cd contracts
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This script will:
- Initialize Aptos CLI if needed
- Fund your account with testnet APT
- Compile and deploy the smart contracts
- Provide you with the contract address

### 2.2 Manual Deployment (Alternative)

If the script doesn't work, you can deploy manually:

```bash
# Initialize Aptos CLI
aptos init --network testnet

# Fund your account
aptos account fund-with-faucet --account default

# Get your account address
aptos config show-profiles --profile default

# Update Move.toml with your address
# Replace "flashsettle = "_"" with "flashsettle = "YOUR_ADDRESS""

# Compile contracts
aptos move compile --skip-fetch-latest-git-deps

# Deploy contracts
aptos move publish --skip-fetch-latest-git-deps --assume-yes
```

### 2.3 Update Environment Configuration

After successful deployment, update your `.env` file:

```bash
# Replace with your actual deployed contract address
APTOS_ADDRESS=0xYOUR_DEPLOYED_CONTRACT_ADDRESS

# Replace with your private key from Aptos CLI
APTOS_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Enable real blockchain transactions
ENABLE_REAL_BLOCKCHAIN=true
```

## Step 3: Initialize Contract Stores

After deployment, you need to initialize the contract stores:

```bash
# Start your application
npm run dev

# In another terminal, call the initialization endpoint
curl -X POST http://localhost:7001/api/v1/admin/initialize-stores \
  -H "Content-Type: application/json" \
  -d '{"coinType": "0x1::aptos_coin::AptosCoin"}'
```

Or use the blockchain service directly in Node.js:

```javascript
const { initializeContractStores } = require('./src/services/blockchain/blockchainService');

// Initialize for APT
await initializeContractStores('0x1::aptos_coin::AptosCoin');

// Initialize for USDC (if you have USDC contract deployed)
// await initializeContractStores('YOUR_USDC_CONTRACT_ADDRESS::usdc::USDC');
```

## Step 4: Circle API Integration (Optional)

### 4.1 Get Circle API Credentials

1. Sign up at [Circle Developer](https://developers.circle.com/)
2. Create a new application
3. Get your API key and wallet ID
4. For production, you'll need to complete KYC verification

### 4.2 Update Environment

```bash
CIRCLE_API_KEY=your_real_api_key_here
CIRCLE_WALLET_ID=your_wallet_id_here
ENABLE_CIRCLE_API=true
```

### 4.3 Test Circle Integration

```bash
# Test USDC balance check
curl -X GET "http://localhost:7001/api/v1/circle/balance/YOUR_WALLET_ADDRESS"

# Test supported blockchains
curl -X GET "http://localhost:7001/api/v1/circle/blockchains"
```

## Step 5: Testing the Deployment

### 5.1 Health Check

```bash
curl http://localhost:7001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-06-21T05:06:07.004Z"}
```

### 5.2 Test Payment Flow

1. **Login to get token:**
```bash
curl -X POST http://localhost:7001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@flashsettle.com", "password": "password123"}'
```

2. **Create a payment:**
```bash
curl -X POST http://localhost:7001/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100,
    "sourceCurrency": "USD",
    "targetCurrency": "EUR",
    "recipient": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

3. **Check payment status:**
```bash
curl -X GET http://localhost:7001/api/v1/payments/PAYMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5.3 Frontend Testing

Navigate to `http://localhost:7001` and test the payment flow through the web interface.

## Step 6: Monitoring and Logs

### 6.1 Check Application Logs

```bash
tail -f logs/all.log
tail -f logs/error.log
```

### 6.2 Monitor Blockchain Transactions

- **Aptos Explorer**: https://explorer.aptoslabs.com/
- Search for your contract address to see transactions

### 6.3 Database Monitoring

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d flashsettle

# Check payments table
SELECT * FROM "Payments" ORDER BY "createdAt" DESC LIMIT 10;

# Check users table
SELECT * FROM "Users" ORDER BY "createdAt" DESC LIMIT 10;
```

## Step 7: Production Considerations

### 7.1 Security

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS/TLS
- [ ] Set up proper firewall rules
- [ ] Use environment-specific API keys
- [ ] Enable database encryption

### 7.2 Scalability

- [ ] Set up load balancing
- [ ] Configure database connection pooling
- [ ] Implement caching (Redis)
- [ ] Set up monitoring (Prometheus/Grafana)

### 7.3 Backup and Recovery

- [ ] Database backups
- [ ] Private key backup (secure storage)
- [ ] Application configuration backup

## Troubleshooting

### Common Issues

1. **Contract deployment fails:**
   - Ensure you have sufficient APT in your account
   - Check that Move.toml has correct address format
   - Verify Aptos CLI is properly configured

2. **Database connection errors:**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists

3. **Blockchain transactions fail:**
   - Verify APTOS_ADDRESS is correct
   - Check private key format
   - Ensure ENABLE_REAL_BLOCKCHAIN=true

4. **Circle API errors:**
   - Verify API key is valid
   - Check if sandbox vs production environment
   - Ensure wallet ID is correct

### Getting Help

- **Aptos Documentation**: https://aptos.dev/
- **Circle Documentation**: https://developers.circle.com/
- **FlashSettle Issues**: Create an issue in the repository

## Next Steps

After successful deployment:

1. **Test with real transactions** using small amounts
2. **Set up monitoring** and alerting
3. **Implement additional features** like multi-currency support
4. **Scale infrastructure** based on usage
5. **Apply for production Circle API** access

## Security Notice

⚠️ **Important**: This is a testnet deployment. Do not use real funds or production API keys. Always test thoroughly before moving to mainnet. 