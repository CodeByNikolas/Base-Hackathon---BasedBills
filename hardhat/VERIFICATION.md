# Contract Verification Guide

This guide explains how to verify BasedBills smart contracts on BaseScan using the Etherscan V2 API.

## Setup

### 1. Get Etherscan API Key

1. Visit [Etherscan.io](https://etherscan.io/apis)
2. Create an account and generate an API key
3. The same API key works for all supported chains including Base Sepolia

### 2. Add API Key to Environment

Add your API key to the `.env` file:

```bash
ETHERSCANAPIKEY=YourEtherscanApiKeyHere
PRIVATE_KEY=YourPrivateKeyHere
```

## Verification Methods

### Method 1: Deploy and Verify (Recommended)

Deploy new contracts and automatically verify them:

```bash
npm run deploy-verify
```

This script will:
- Deploy all contracts to Base Sepolia
- Wait for indexing
- Automatically verify each contract
- Provide BaseScan links

### Method 2: Verify Existing Contracts

Verify already deployed contracts:

```bash
npm run verify
```

This verifies the existing deployed contracts:
- Group Logic: `0xa4cf50aa00c58852c37b3fa663d7ba032843d594`
- Registry: `0x6add08fb50b7e6def745a87a16254522713a5676`
- GroupFactory: `0xfdf8a83a3d1dc0aa285616883452a2824e559d74`

### Method 3: Manual Verification

Verify individual contracts manually:

```bash
# Verify Group Logic Contract
npx hardhat verify --network baseSepolia 0xa4cf50aa00c58852c37b3fa663d7ba032843d594

# Verify Registry Contract (with constructor argument)
npx hardhat verify --network baseSepolia 0x6add08fb50b7e6def745a87a16254522713a5676 "0x21750fc30922badd61c2f1e48b94683071dfbcaa"

# Verify GroupFactory Contract (with constructor arguments)
npx hardhat verify --network baseSepolia 0xfdf8a83a3d1dc0aa285616883452a2824e559d74 "0xa4cf50aa00c58852c37b3fa663d7ba032843d594" "0x6add08fb50b7e6def745a87a16254522713a5676"
```

## Etherscan V2 API Features

The configuration uses [Etherscan V2 API](https://docs.etherscan.io/) which provides:

- **Single API Key**: Works across 50+ chains including Base
- **Unified Experience**: Same API format for all supported networks
- **Chain ID Support**: Specify chain using `chainid` parameter
- **Multi-chain Apps**: Perfect for cross-chain applications

### Configuration Details

The hardhat config uses Etherscan V2 endpoints:

```typescript
etherscan: {
  apiKey: {
    baseSepolia: process.env.ETHERSCANAPIKEY || "",
  },
  customChains: [
    {
      network: "baseSepolia",
      chainId: 84532,
      urls: {
        apiURL: "https://api.etherscan.io/v2/api", // V2 API endpoint
        browserURL: "https://sepolia.basescan.org",
      },
    },
  ],
}
```

## Troubleshooting

### Common Issues

1. **"Already Verified"**: Contract is already verified, no action needed
2. **"Invalid API Key"**: Check your ETHERSCANAPIKEY in .env file
3. **"Contract not found"**: Wait longer for contract indexing
4. **"Constructor arguments mismatch"**: Verify constructor parameters

### Verification Status

Check verification status by visiting:
- https://sepolia.basescan.org/address/[CONTRACT_ADDRESS]

### API Rate Limits

Etherscan V2 API has rate limits:
- Free tier: 5 calls/second
- Pro tier: Higher limits available

## Available Scripts

```bash
npm run compile        # Compile contracts
npm run deploy         # Deploy without verification
npm run deploy-verify  # Deploy and verify automatically
npm run verify         # Verify existing contracts
npm run test-contracts # Test deployed contracts
```

## Contract Addresses (Base Sepolia)

Current deployment addresses:

- **GroupFactory**: `0xfdf8a83a3d1dc0aa285616883452a2824e559d74`
- **Registry**: `0x6add08fb50b7e6def745a87a16254522713a5676`
- **Group Logic**: `0xa4cf50aa00c58852c37b3fa663d7ba032843d594`

## Next Steps

1. Add `ETHERSCANAPIKEY` to your `.env` file
2. Run `npm run verify` to verify existing contracts
3. For new deployments, use `npm run deploy-verify`
4. Check verification status on BaseScan
5. Integrate verified contract addresses into frontend

## Links

- [Etherscan V2 API Documentation](https://docs.etherscan.io/)
- [Base Sepolia BaseScan](https://sepolia.basescan.org/)
- [Hardhat Verification Plugin](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
