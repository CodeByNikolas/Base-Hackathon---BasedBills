# Funding Card Setup Guide

This guide will help you set up the funding card functionality using Coinbase Developer Platform and OnchainKit.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Coinbase Developer Platform Configuration
# Get these from https://portal.cdp.coinbase.com/

# CDP API Credentials (Server-side only - NEVER expose these)
CDP_API_KEY_NAME=your_api_key_name_here
CDP_API_KEY_PRIVATE_KEY=your_private_key_here

# OnchainKit Configuration (Client-side safe)
NEXT_PUBLIC_CDP_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=BasedBills

# CORS Security (Production) - Add your production domains
ALLOWED_ORIGINS="https://base-hackathon-based-bills.vercel.app,http://localhost:3000"

# Optional: Additional configuration
NEXT_PUBLIC_ONCHAINKIT_WALLET_CONFIG=your_wallet_config_here
```

## Setup Steps

### 1. Get CDP API Credentials

1. Go to [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)
2. Create a new project or use an existing one
3. Navigate to "API Keys" section
4. Create a new API key with the following permissions:
   - Onramp/Offramp
   - Wallet operations
5. Copy the API Key Name and Private Key

### 2. Get OnchainKit API Key

1. In the same project, go to "OnchainKit" section
2. Generate a new API key
3. Copy the API key

### 3. Configure CORS

The application includes CORS protection. Make sure to add your production domains to the `ALLOWED_ORIGINS` environment variable.

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `/funding` page
3. Connect your wallet
4. Test the funding flow

## Security Notes

- Never commit `.env.local` to version control
- The CDP API credentials are server-side only
- CORS is configured to only allow requests from approved domains
- Rate limiting is implemented to prevent abuse

## Troubleshooting

### Common Issues

1. **"Missing CDP API credentials"**
   - Check that `CDP_API_KEY_NAME` and `CDP_API_KEY_PRIVATE_KEY` are set
   - Verify the credentials are correct

2. **"CDP Project ID is empty"**
   - Check that `NEXT_PUBLIC_CDP_PROJECT_ID` is set
   - Verify the project ID is correct

3. **CORS errors**
   - Add your domain to `ALLOWED_ORIGINS`
   - Check that the origin is exactly matching

4. **JWT generation failed**
   - Verify the private key format (should include `-----BEGIN` and `-----END`)
   - Check that the API key has the correct permissions

## API Endpoints

- `POST /api/session` - Generate session tokens for funding
- `POST /api/auth` - Get configuration for frontend
- `OPTIONS /api/session` - CORS preflight

## Components

- `FundCardComponent` - Main funding card using OnchainKit
- `FundingPage` - Test page for the funding functionality
