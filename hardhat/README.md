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
| Group Logic | `0x56bfa92a6e788f8a157e3f479dd326d93a9458ea` | ✅ Verified |
| Registry | `0x01856ca0017a4f6f708b7f8df57a20d9ddf8dc74` | ✅ Verified |
| GroupFactory | `0x06043efb63514bcc98f142bc4936ec66732a0729` | ✅ Verified |

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

# Verify contracts on Blockscout (automatic)
npm run verify

# Verify contracts on BaseScan (requires API key)
npm run verify-basescan
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

## 📚 Complete API Reference

### GroupFactory Contract

#### Write Functions
```solidity
// Create a new group with specified members
function createGroup(address[] calldata _members) external returns (address groupAddress)

// Create a group with deterministic address (advanced)
function createGroupDeterministic(address[] calldata _members, bytes32 _salt) external returns (address groupAddress)
```

#### View Functions
```solidity
// Get group address by ID
function getGroup(uint256 _groupId) external view returns (address)

// Get total number of groups created
function getTotalGroups() external view returns (uint256)

// Predict deterministic group address
function predictGroupAddress(bytes32 _salt) external view returns (address)

// Check if address is a valid group from this factory
function isValidGroup(address _groupAddress) external view returns (bool)
```

### Registry Contract

#### View Functions
```solidity
// Get all groups a user belongs to
function getGroupsForUser(address _user) external view returns (address[] memory)

// Get number of groups a user belongs to
function getGroupCountForUser(address _user) external view returns (uint256)
```

### Group Contract

#### Write Functions
```solidity
// Add a bill with equal split among participants
function addBill(
    string calldata _description,
    uint256 _amount,
    address[] calldata _participants
) external

// Add a bill with custom amounts per participant
function addCustomBill(
    string calldata _description,
    address[] calldata _participants,
    uint256[] calldata _amounts
) external

// Trigger settlement process (any member can call)
function triggerSettlement() external

// Approve settlement (creditors only)
function approveSettlement() external

// Fund settlement with USDC (debtors only)
function fundSettlement() external
```

#### Enhanced View Functions
```solidity
// Get all member addresses
function getMembers() external view returns (address[] memory)

// Get number of members
function getMemberCount() external view returns (uint256)

// Get balance for specific member (positive = owed, negative = owes)
function getBalance(address _member) external view returns (int256)

// Get all member balances at once
function getAllBalances() external view returns (
    address[] memory memberAddresses, 
    int256[] memory memberBalances
)

// Get settlement breakdown (creditors vs debtors)
function getSettlementAmounts() external view returns (
    address[] memory creditors,
    uint256[] memory creditorAmounts,
    address[] memory debtors,
    uint256[] memory debtorAmounts
)

// Check if settlement can be completed
function canCompleteSettlement() external view returns (bool)
```

#### Bill History Functions
```solidity
// Get all bills in the group
function getAllBills() external view returns (Bill[] memory)

// Get specific bill by ID
function getBill(uint256 _billId) external view returns (Bill memory)

// Get total number of bills
function getBillCount() external view returns (uint256)

// Get bills with pagination
function getBillsPaginated(uint256 _offset, uint256 _limit) external view returns (Bill[] memory)

// Get bills paid by specific member
function getBillsByPayer(address _payer) external view returns (uint256[] memory)
```

#### State Variables (Public)
```solidity
address[] public members;                    // Array of group members
mapping(address => bool) public isMember;    // Check if address is member
mapping(address => int256) public balances;  // Member balances
address public usdcAddress;                  // USDC contract address
bool public settlementActive;                // Is settlement in progress
uint256 public totalOwed;                    // Total amount to be settled
uint256 public fundedAmount;                 // Amount already funded
uint256 public billCounter;                  // Number of bills created
mapping(address => bool) public hasFunded;   // Has member funded settlement
mapping(address => bool) public hasApproved; // Has member approved settlement
```

### Bill Structure
```solidity
struct Bill {
    uint256 id;              // Unique bill ID
    string description;      // Bill description
    uint256 totalAmount;     // Total bill amount (USDC with 6 decimals)
    address payer;           // Who paid the bill
    address[] participants;  // Who participated in the expense
    uint256[] amounts;       // Exact amount each participant owes
    uint256 timestamp;       // When bill was created (block.timestamp)
}
```

## 🔧 Frontend Integration Examples

### TypeScript/JavaScript Usage

```typescript
import { parseUnits, formatUnits } from 'viem';

// Create a new group
const members = [alice.address, bob.address, charlie.address];
const groupAddress = await groupFactory.write.createGroup([members]);

// Add equal split bill
await group.write.addBill([
    "Team Lunch",
    parseUnits("60", 6), // 60 USDC
    [alice.address, bob.address]
]);

// Add custom split bill
await group.write.addCustomBill([
    "Groceries",
    [alice.address, bob.address, charlie.address],
    [parseUnits("40", 6), parseUnits("25", 6), parseUnits("35", 6)] // $40, $25, $35
]);

// Get all balances
const [addresses, balances] = await group.read.getAllBalances();
balances.forEach((balance, i) => {
    const name = getNameFromAddress(addresses[i]);
    const amount = formatUnits(balance < 0 ? -balance : balance, 6);
    const status = balance < 0 ? "owes" : "owed";
    console.log(`${name}: $${amount} ${status}`);
});

// Get bill history
const bills = await group.read.getAllBills();
bills.forEach(bill => {
    console.log(`Bill ${bill.id}: ${bill.description}`);
    console.log(`Total: $${formatUnits(bill.totalAmount, 6)}`);
    console.log(`Paid by: ${getNameFromAddress(bill.payer)}`);
    console.log(`Date: ${new Date(Number(bill.timestamp) * 1000).toLocaleDateString()}`);
});

// Get settlement breakdown
const [creditors, creditorAmounts, debtors, debtorAmounts] = await group.read.getSettlementAmounts();

// Trigger settlement
await group.write.triggerSettlement();

// Approve settlement (if you're a creditor)
await group.write.approveSettlement();

// Fund settlement (if you're a debtor)
// First approve USDC spending
const amountOwed = debtorAmounts[debtorIndex];
await usdc.write.approve([groupAddress, amountOwed]);
await group.write.fundSettlement();
```

### React Hook Examples

```typescript
// Custom hook for group data
function useGroupData(groupAddress: string) {
    const [members, setMembers] = useState<string[]>([]);
    const [balances, setBalances] = useState<{address: string, balance: bigint}[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);

    useEffect(() => {
        async function fetchData() {
            const [addresses, balanceAmounts] = await group.read.getAllBalances();
            const allBills = await group.read.getAllBills();
            
            setMembers(addresses);
            setBalances(addresses.map((addr, i) => ({
                address: addr,
                balance: balanceAmounts[i]
            })));
            setBills(allBills);
        }
        fetchData();
    }, [groupAddress]);

    return { members, balances, bills };
}

// Custom hook for settlement status
function useSettlementStatus(groupAddress: string) {
    const [canSettle, setCanSettle] = useState(false);
    const [settlementActive, setSettlementActive] = useState(false);
    
    useEffect(() => {
        async function checkStatus() {
            const canComplete = await group.read.canCompleteSettlement();
            const isActive = await group.read.settlementActive();
            setCanSettle(canComplete);
            setSettlementActive(isActive);
        }
        checkStatus();
    }, [groupAddress]);

    return { canSettle, settlementActive };
}
```

## 📄 License

MIT License - see LICENSE file for details.