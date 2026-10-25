# BasedBills 💰

A decentralized bill splitting application built on Base network with on-chain USDC settlements. Split expenses with friends and settle them transparently on-chain.

## 📹 Demo Videos

[Watch this Loom video](https://www.loom.com/share/ae9880b14b6a456490e533c0f4448f85)

[Watch this YouTube video](https://youtu.be/oGCbtVMy8X0)

## 🌟 Features

### Core Functionality
- **Decentralized Groups**: Create expense groups with multiple members
- **Smart Bill Splitting**: Equal or custom split amounts per person
- **On-chain Settlement**: Settle balances using USDC on Base network
- **Transparent Process**: All transactions verified on BaseScan
- **Mobile-First Design**: Optimized for mobile wallet interactions

### Advanced Features
- **🎲 Gamble Mode**: All-or-nothing settlement where one random member pays all debts
- **❌ Settlement Rejection**: Cancel settlements before approval/deposit (bills remain unsettled)
- **📊 Enhanced Balance Views**: Real-time creditor/debtor breakdown
- **📋 Complete Bill History**: Track all expenses with timestamps and settlement IDs
- **🔍 Settlement Tracking**: Audit trail for every completed settlement
- **⚡ Custom Bill Splitting**: Specify exact amounts per participant
- **🏭 Gas-Efficient Groups**: EIP-1167 minimal proxy pattern for cheap group creation

## 📸 Screenshots

### Main Dashboard
![Main Page](https://raw.githubusercontent.com/CodeByNikolas/Base-Hackathon---BasedBills/main/public/Main-Page.png)

### Fund USDC Modal
![Fund Page](https://raw.githubusercontent.com/CodeByNikolas/Base-Hackathon---BasedBills/main/public/Fund-Page.png)

### Group Management
![Group Page](https://raw.githubusercontent.com/CodeByNikolas/Base-Hackathon---BasedBills/main/public/Group-Page.png)

## 🚀 Quick Start

### Frontend Development

```bash
# Install frontend dependencies
pnpm install --frozen-lockfile

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Smart Contracts

The smart contracts are deployed and verified on Base Sepolia:

```bash
cd hardhat
npm install
npm run deploy  # Deploy new contracts
```

See [hardhat/README.md](./hardhat/README.md) for detailed contract documentation.

## 🏗️ Architecture

### Frontend Stack
- **Next.js 15** - React framework
- **OnchainKit** - Coinbase's Web3 toolkit
- **wagmi** - React hooks for Ethereum
- **viem** - TypeScript interface for Ethereum

### Smart Contract Stack
- **Solidity 0.8.28** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Security-audited contract libraries
- **EIP-1167** - Minimal proxy pattern for gas efficiency

## 📱 How It Works

1. **Connect Wallet**: Users connect their Base-compatible wallet
2. **Create Group**: Start a new expense group with friends
3. **Add Bills**: Record shared expenses and split them
4. **Track Balances**: See who owes what in real-time
5. **Settle On-Chain**: Approve and fund settlements with USDC
6. **Automatic Distribution**: Smart contracts handle the payouts

## 🔗 Deployed Contracts

### Base Mainnet (Production) - **Verified & Ready**
| Contract | Address | BaseScan |
|----------|---------|----------|
| GroupFactory | [`0x97191494e97a71a2366e459f49e2c15b61fb4055`](https://basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055) | [Read Contract](https://basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055#readContract) |
| Registry | [`0x071164b35b896bc429d5f518c498695ffc69fe10`](https://basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10) | [Read Contract](https://basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10#readContract) |
| Group Logic | [`0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa`](https://basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa) | [Read Contract](https://basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa#readContract) |
| USDC | [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | [Read Contract](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913#readContract) |

### Base Sepolia (Testnet) - **Latest Deployment**
| Contract | Address | BaseScan |
|----------|---------|----------|
| GroupFactory | [`0x759dead21af026b4718635bee60487f3a71d25f9`](https://sepolia.basescan.org/address/0x759dead21af026b4718635bee60487f3a71d25f9) | [Read Contract](https://sepolia.basescan.org/address/0x759dead21af026b4718635bee60487f3a71d25f9#readContract) |
| Registry | [`0x071164b35b896bc429d5f518c498695ffc69fe10`](https://sepolia.basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10) | [Read Contract](https://sepolia.basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10#readContract) |
| Group Logic | [`0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa`](https://sepolia.basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa) | [Read Contract](https://sepolia.basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa#readContract) |
| MockUSDC | [`0x97191494e97a71a2366e459f49e2c15b61fb4055`](https://sepolia.basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055) | [Read Contract](https://sepolia.basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055#readContract) |

**🆕 New Test Feature**: The MockUSDC contract now includes a `mintForTest()` function that anyone can call to mint 100 USDC for testing purposes!

**✅ All contracts are verified** and open source on BaseScan. The app defaults to **Base Sepolia (Testnet)** for development but users can switch to **Base Mainnet** for production use.

**🟠 Smart Network Guidance**: The app shows helpful orange messages guiding users:
- On **Base Mainnet**: Suggests switching to Base Sepolia for easier testing without funds
- On **Base Sepolia**: Encourages using the `mintForTest()` function to get 100 USDC instantly

The messages are displayed in attractive orange boxes with proper line breaks for better readability.

> 📚 **For detailed smart contract documentation, API reference, and deployment guides, see [`hardhat/README.md`](./hardhat/README.md)**

## 🛠️ Development

### Environment Setup

Create a `.env` file:
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_coinbase_api_key
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── components/        # React components
│   ├── tutorial/          # OnchainKit tutorial page
│   └── page.tsx          # Main application
├── hardhat/              # Smart contracts
│   ├── contracts/        # Solidity contracts
│   ├── scripts/          # Deployment scripts
│   └── ignition/         # Hardhat Ignition modules
└── public/               # Static assets
```

## 🧪 Testing

The smart contracts have been extensively tested with:
- Multi-account group creation
- Complex bill splitting scenarios
- Settlement process validation
- USDC integration testing

### 🆕 Test USDC Minting

For testing purposes, the MockUSDC contract includes a `mintForTest()` function:
- **Anyone can call** this function to get 100 USDC
- **Perfect for testing** bill splitting and settlement flows
- **No authentication required** - just connect your wallet and call the function

```solidity
// In your wallet or frontend:
mockUSDC.mintForTest() // Mints 100 USDC to your wallet
```

## 🔐 Security

- Uses OpenZeppelin's audited contract libraries
- All contracts verified on BaseScan
- Implements proper access controls
- Follows Solidity best practices

## 📄 License

MIT License - Built for the Base hackathon

## 🤝 Contributing

This project was built for the Base hackathon. Feel free to fork and improve!

---

Built with ❤️ on [Base](https://base.org) using [OnchainKit](https://onchainkit.xyz)
## Dependency maintenance

The frontend uses a committed pnpm lockfile. Keep Next.js and its ESLint packages
on the same patched release line. OnchainKit and the Coinbase SDK are pinned to
preserve their existing APIs and bundling behavior. The workspace overrides update pinned PostCSS and WebSocket
dependencies within their compatible major versions.

Run `pnpm audit`, `pnpm exec tsc --noEmit`, and `pnpm build` after dependency
updates. Some upstream Web3 packages still depend on Zod 3, UUID 8/9,
stream-json 1, or decode-uri-component 0.2. Do not force incompatible major
versions across these packages to silence audit findings.
