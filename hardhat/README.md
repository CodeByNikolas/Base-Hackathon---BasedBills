# BasedBills Smart Contracts

A decentralized bill splitting application built on Base network with on-chain USDC settlements.

## 🏗️ Architecture

The BasedBills smart contract system consists of four main contracts:

### Core Contracts

1. **`Group.sol`** - Core logic for expense groups and bill splitting
2. **`GroupFactory.sol`** - Factory contract for creating new Group instances using EIP-1167 clones
3. **`Registry.sol`** - Tracks user-to-group mappings
4. **`IUSDC.sol`** - Interface for USDC token interactions

## 📋 Contract Details

### Group Contract
- Manages group members and their expense balances
- Handles bill creation and splitting logic
- Implements settlement process with approval mechanism
- Automatically distributes USDC when settlement conditions are met

### GroupFactory Contract
- Creates new Group instances using minimal proxy pattern (EIP-1167)
- Registers new groups with the Registry
- Ensures creators are members of groups they create

### Registry Contract
- Maintains mapping of users to their groups
- Only allows GroupFactory to register new groups
- Provides view functions for frontend integration

## 🚀 Deployment

### Deployed Contracts (Base Sepolia)

| Contract | Address | Status |
|----------|---------|---------|
| Group Logic | `0xa4cf50aa00c58852c37b3fa663d7ba032843d594` | ✅ Verified |
| Registry | `0x6add08fb50b7e6def745a87a16254522713a5676` | ✅ Verified |
| GroupFactory | `0xfdf8a83a3d1dc0aa285616883452a2824e559d74` | ✅ Verified |

All contracts are verified on [BaseScan](https://sepolia.basescan.org/).

### Deploy Your Own

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your PRIVATE_KEY and ETHERSCAN_API_KEY

# Deploy contracts
npm run deploy

# Verify contracts (optional)
npm run verify
```

## 🧪 Testing

The contracts have been thoroughly tested with multi-account scenarios including:
- Group creation with multiple members
- Bill splitting (shared and personal expenses)
- Settlement process with approvals
- USDC distribution mechanics

## 🔧 Development

### Prerequisites
- Node.js 18+
- Hardhat
- Base Sepolia testnet access

### Setup
```bash
npm install
npx hardhat compile
```

### Configuration
The project is configured for Base Sepolia testnet. Update `hardhat.config.ts` for other networks.

## 📚 Usage

### Creating a Group
```solidity
// Through GroupFactory
address[] memory members = [alice, bob, charlie];
address newGroup = groupFactory.createGroup(members);
```

### Adding Bills
```solidity
// Add a shared expense
group.addBill("Dinner", 60e6, [alice, bob]); // 60 USDC split between alice and bob
```

### Settlement Process
```solidity
// 1. Trigger settlement
group.triggerSettlement();

// 2. Creditors approve
group.approveSettlement(); // Called by each creditor

// 3. Debtors fund their portion
usdc.approve(groupAddress, amountOwed);
group.fundSettlement();

// 4. Automatic distribution when conditions met
```

## 🔐 Security

- Uses OpenZeppelin contracts for proven security patterns
- Implements proper access controls and validation
- All contracts verified on BaseScan for transparency

## 📄 License

MIT License - see LICENSE file for details.