#!/bin/bash

# FlashSettle Deployment Script for Aptos Testnet
set -e

echo "🚀 Starting FlashSettle deployment to Aptos Testnet..."

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI is not installed. Please install it first."
    exit 1
fi

# Initialize Aptos profile if not exists
if [ ! -f ~/.aptos/config.yaml ]; then
    echo "📋 Initializing Aptos CLI..."
    aptos init --network testnet --assume-yes
fi

# Fund the account with testnet tokens (manual step required)
echo "💰 Please fund your account with testnet APT by visiting:"
echo "🌐 https://aptos.dev/network/faucet"
echo "📍 Your account address will be shown below..."

# Get account address
ACCOUNT_ADDRESS=$(aptos config show-profiles --profile default | grep "account" | awk '{print $2}' | tr -d '"' | tr -d ',')
echo "📍 Deploying from account: $ACCOUNT_ADDRESS"
echo "🌐 Account URL: https://explorer.aptoslabs.com/account/$ACCOUNT_ADDRESS?network=testnet"

# Wait for user confirmation
echo ""
read -p "⏸️  Please fund your account and press Enter to continue..."

# Update Move.toml with the actual account address
echo "📝 Updating Move.toml with deployment address..."
sed -i.bak "s/flashsettle = \"_\"/flashsettle = \"0x$ACCOUNT_ADDRESS\"/" Move.toml

# Compile the contracts
echo "🔨 Compiling smart contracts..."
aptos move compile --skip-fetch-latest-git-deps

# Publish the contracts
echo "📤 Publishing contracts to testnet..."
aptos move publish --skip-fetch-latest-git-deps --assume-yes

# Restore the original Move.toml
mv Move.toml.bak Move.toml

echo "✅ FlashSettle contracts deployed successfully!"
echo "📍 Contract address: 0x$ACCOUNT_ADDRESS"
echo "🌐 Network: Testnet"
echo "🔗 Explorer: https://explorer.aptoslabs.com/account/0x$ACCOUNT_ADDRESS?network=testnet"
echo ""
echo "Next steps:"
echo "1. Update your .env file with APTOS_ADDRESS=0x$ACCOUNT_ADDRESS"
echo "2. Set APTOS_PRIVATE_KEY to your private key"
echo "3. Set ENABLE_REAL_BLOCKCHAIN=true"
echo "4. Initialize the contract stores using the provided functions"
echo "5. Test the deployment with sample transactions" 