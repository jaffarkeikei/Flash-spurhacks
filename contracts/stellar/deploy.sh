#!/bin/bash

# Flash Stellar Passkey Contract Deployment Script
# This script deploys the passkey authentication smart contract to Stellar testnet

set -e

echo "🚀 Flash Stellar Passkey Contract Deployment"
echo "============================================="

# Check if Stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Please install it first:"
    echo "   https://stellar.org/developers-blog/smart-contract-developer-preview"
    exit 1
fi

# Configuration
NETWORK="testnet"
CONTRACT_NAME="flash-passkey-auth"
SOURCE_ACCOUNT="GABC123...XYZ789"  # Replace with your actual account
WASM_FILE="./target/wasm32-unknown-unknown/release/flash_passkey_auth.wasm"

echo "📋 Configuration:"
echo "   Network: $NETWORK"
echo "   Contract: $CONTRACT_NAME"
echo "   Source Account: $SOURCE_ACCOUNT"

# Build the contract
echo ""
echo "🔨 Building Stellar smart contract..."
cargo build --target wasm32-unknown-unknown --release

if [ ! -f "$WASM_FILE" ]; then
    echo "❌ WASM file not found at $WASM_FILE"
    echo "   Make sure the build was successful"
    exit 1
fi

echo "✅ Contract built successfully"

# Deploy to Stellar
echo ""
echo "🌟 Deploying to Stellar $NETWORK..."

# Install the contract
CONTRACT_ID=$(stellar contract deploy \
    --wasm $WASM_FILE \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    2>/dev/null | grep "Contract deployed:" | cut -d' ' -f3)

if [ -z "$CONTRACT_ID" ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi

echo "✅ Contract deployed successfully!"
echo "   Contract ID: $CONTRACT_ID"

# Initialize the contract
echo ""
echo "🔧 Initializing contract..."

stellar contract invoke \
    --id $CONTRACT_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- \
    initialize

echo "✅ Contract initialized successfully!"

# Save contract details
echo ""
echo "💾 Saving contract details..."

cat > contract-info.json << EOF
{
  "contractId": "$CONTRACT_ID",
  "network": "$NETWORK",
  "sourceAccount": "$SOURCE_ACCOUNT",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contractName": "$CONTRACT_NAME",
  "version": "1.0.0"
}
EOF

echo "✅ Contract details saved to contract-info.json"

# Update environment variables
echo ""
echo "🔧 Environment Configuration:"
echo "   Add these to your .env file:"
echo ""
echo "   STELLAR_PASSKEY_CONTRACT_ID=$CONTRACT_ID"
echo "   STELLAR_NETWORK=$NETWORK"
echo "   STELLAR_CONTRACT_SOURCE=$SOURCE_ACCOUNT"

# Test the contract
echo ""
echo "🧪 Testing contract functionality..."

# Test has_active_passkey function
TEST_ADDRESS="GDUMMY123...TESTADDR"
echo "   Testing has_active_passkey for $TEST_ADDRESS..."

RESULT=$(stellar contract invoke \
    --id $CONTRACT_ID \
    --source $SOURCE_ACCOUNT \
    --network $NETWORK \
    -- \
    has_active_passkey \
    --user $TEST_ADDRESS \
    2>/dev/null || echo "false")

echo "   Result: $RESULT"

echo ""
echo "🎉 Deployment Complete!"
echo "============================================="
echo ""
echo "Next steps:"
echo "1. Update your .env file with the contract ID"
echo "2. Fund your Stellar account for transaction fees"
echo "3. Test the passkey functionality in your app"
echo ""
echo "Contract Explorer:"
echo "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "Happy building with Flash Stellar Passkeys! 🔐⭐" 