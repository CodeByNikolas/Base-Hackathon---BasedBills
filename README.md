# BasedBills 💰

A decentralized bill splitting application built on Base network with on-chain USDC settlements. Split expenses with friends and settle them transparently on-chain.

## 🌟 Features

### Core Functionality
- **Decentralized Groups**: Create expense groups with multiple members
- **Smart Bill Splitting**: Equal or custom split amounts per person
- **On-chain Settlement**: Settle balances using USDC on Base network
- **Transparent Process**: All transactions verified on BaseScan
- **Mobile-First Design**: Optimized for mobile wallet interactions

### Advanced Features
- **🎲 Gamble Mode**: All-or-nothing settlement where one random member pays all debts
- **📊 Enhanced Balance Views**: Real-time creditor/debtor breakdown
- **📋 Complete Bill History**: Track all expenses with timestamps and settlement IDs
- **🔍 Settlement Tracking**: Audit trail for every completed settlement
- **⚡ Custom Bill Splitting**: Specify exact amounts per participant
- **🏭 Gas-Efficient Groups**: EIP-1167 minimal proxy pattern for cheap group creation

## 🚀 Quick Start

### Frontend Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
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

| Contract | Address | BaseScan |
|----------|---------|----------|
| GroupFactory | [`0x38904476fe6586e5735a3cff701f2bb1031b6ec4`](https://sepolia.basescan.org/address/0x38904476fe6586e5735a3cff701f2bb1031b6ec4) | [Read Contract](https://sepolia.basescan.org/address/0x38904476fe6586e5735a3cff701f2bb1031b6ec4#readContract) |
| Registry | [`0xc269e9d996c89f22a3719a80d37f780c439cb4d2`](https://sepolia.basescan.org/address/0xc269e9d996c89f22a3719a80d37f780c439cb4d2) | [Read Contract](https://sepolia.basescan.org/address/0xc269e9d996c89f22a3719a80d37f780c439cb4d2#readContract) |
| Group Logic | [`0x9cf7c53d5702da0c5d79d5fa5bcfe9a9a3dbe1f8`](https://sepolia.basescan.org/address/0x9cf7c53d5702da0c5d79d5fa5bcfe9a9a3dbe1f8) | [Read Contract](https://sepolia.basescan.org/address/0x9cf7c53d5702da0c5d79d5fa5bcfe9a9a3dbe1f8#readContract) |
| MockUSDC | [`0xf5eee5b1fcfc4601db9bcbfd2753bd062c918735`](https://sepolia.basescan.org/address/0xf5eee5b1fcfc4601db9bcbfd2753bd062c918735) | [Read Contract](https://sepolia.basescan.org/address/0xf5eee5b1fcfc4601db9bcbfd2753bd062c918735#readContract) |

All contracts are **verified** and open source on BaseScan.

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