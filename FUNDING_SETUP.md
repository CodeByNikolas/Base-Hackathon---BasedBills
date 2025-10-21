# Funding Card Setup Guide

This guide will help you set up the funding card functionality using OnchainKit's FundCard component.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# OnchainKit Configuration (Client-side safe)
# Get these from https://portal.cdp.coinbase.com/

NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=BasedBills

# Optional: WalletConnect Project ID for wallet connections
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

## Setup Steps

### 1. Get CDP Project ID and OnchainKit API Key

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create a new project or use an existing one
3. In the project dashboard, find your Project ID
4. Go to "OnchainKit" section and generate a new API key

### 2. Optional: Get WalletConnect Project ID

If you want to use WalletConnect for wallet connections:
1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `/funding` page
3. Connect your wallet using the wallet connection in the top right corner
4. Use the FundCard to purchase USDC

## Security Notes

- Never commit `.env.local` to version control
- All environment variables are client-side safe
- OnchainKit handles all security internally

## Troubleshooting

### Common Issues

1. **FundCard not showing**
   - Check that `NEXT_PUBLIC_CDP_PROJECT_ID` is set correctly
   - Verify you're using a supported network (Base, Ethereum, etc.)

2. **Wallet connection issues**
   - Check that `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is set if using WalletConnect
   - Make sure your wallet supports the Base network

3. **Environment variable not loading**
   - Restart the development server after adding environment variables
   - Check that variables are prefixed correctly (`NEXT_PUBLIC_`)

## Components

- `FundCardComponent` - Main funding card using OnchainKit FundCard
- `FundingPage` - Test page for the funding functionality

## Features

The FundCard component provides:
- Amount input with fiat/crypto switching
- Payment method selection (Coinbase, Apple Pay, Debit Card)
- Preset amount buttons ($10, $25, $50)
- Real-time exchange rate updates
- Automatic wallet connection integration
