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

# Fund the account with testnet tokens
echo "💰 Funding account with testnet APT..."
aptos account fund-with-faucet --account default || true

# Get account address
ACCOUNT_ADDRESS=$(aptos config show-profiles --profile default | grep "account" | awk '{print $2}')
echo "📍 Deploying from account: $ACCOUNT_ADDRESS"

# Update Move.toml with the actual account address
echo "📝 Updating Move.toml with deployment address..."
sed -i.bak "s/flashsettle = \"_\"/flashsettle = \"$ACCOUNT_ADDRESS\"/" Move.toml

# Compile the contracts
echo "🔨 Compiling smart contracts..."
aptos move compile --skip-fetch-latest-git-deps

# Publish the contracts
echo "📤 Publishing contracts to testnet..."
aptos move publish --skip-fetch-latest-git-deps --assume-yes

# Restore the original Move.toml
mv Move.toml.bak Move.toml

echo "✅ FlashSettle contracts deployed successfully!"
echo "📍 Contract address: $ACCOUNT_ADDRESS"
echo "🌐 Network: Testnet"
echo ""
echo "Next steps:"
echo "1. Update your .env file with APTOS_ADDRESS=$ACCOUNT_ADDRESS"
echo "2. Initialize the contract stores using the provided functions"
echo "3. Test the deployment with sample transactions" 