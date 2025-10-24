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
- **NEW**: Custom group names instead of auto-generated ones
- Handles bill creation and splitting logic (including custom amounts)
- Implements settlement process with approval mechanism
- **NEW**: Gamble feature for all-or-nothing settlements
- Automatically distributes USDC when settlement conditions are met
- **NEW**: Complete settlement history tracking

### GroupFactory Contract
- Creates new Group instances using minimal proxy pattern (EIP-1167)
- **NEW**: Accepts group names during creation
- Registers new groups with the Registry
- Ensures creators are members of groups they create

### Registry Contract
- Maintains mapping of users to their groups
- Only allows GroupFactory to register new groups
- Provides view functions for frontend integration

## 🚀 Deployment

### Deployed Contracts

#### Base Mainnet (Production)
| Contract | Address | BaseScan |
|----------|---------|----------|
| Group Logic | [`0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa`](https://basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa) | [Read Contract](https://basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa#readContract) |
| Registry | [`0x071164b35b896bc429d5f518c498695ffc69fe10`](https://basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10) | [Read Contract](https://basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10#readContract) |
| GroupFactory | [`0x97191494e97a71a2366e459f49e2c15b61fb4055`](https://basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055) | [Read Contract](https://basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055#readContract) |
| USDC | [`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) | [Read Contract](https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913#readContract) |

#### Base Sepolia (Testnet) - **Latest Deployment (2025-10-24)**
| Contract | Address | BaseScan |
|----------|---------|----------|
| Group Logic | [`0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa`](https://sepolia.basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa) | [Read Contract](https://sepolia.basescan.org/address/0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa#readContract) |
| Registry | [`0x071164b35b896bc429d5f518c498695ffc69fe10`](https://sepolia.basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10) | [Read Contract](https://sepolia.basescan.org/address/0x071164b35b896bc429d5f518c498695ffc69fe10#readContract) |
| GroupFactory | [`0x759dead21af026b4718635bee60487f3a71d25f9`](https://sepolia.basescan.org/address/0x759dead21af026b4718635bee60487f3a71d25f9) | [Read Contract](https://sepolia.basescan.org/address/0x759dead21af026b4718635bee60487f3a71d25f9#readContract) |
| MockUSDC | [`0x97191494e97a71a2366e459f49e2c15b61fb4055`](https://sepolia.basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055) | [Read Contract](https://sepolia.basescan.org/address/0x97191494e97a71a2366e459f49e2c15b61fb4055#readContract) |

**🆕 Enhanced MockUSDC Features:**
- Added `mintForTest()` function - anyone can mint 100 USDC for testing
- Perfect for testing bill splitting and settlement flows
- No authentication required - just connect wallet and call the function

**✅ All contracts are verified** on [BaseScan](https://basescan.org/) and [Base Sepolia](https://sepolia.basescan.org/).

**🌐 Network Default**: The frontend now defaults to **Base Sepolia (Testnet)** for development, with **Base Mainnet** available as an alternative option.

**🟠 Smart Network Guidance**: The app provides helpful orange messages to guide users:
- On **Base Mainnet**: Suggests switching to Base Sepolia for easier testing without funds
- On **Base Sepolia**: Encourages using the `mintForTest()` function to get 100 USDC instantly for testing

The messages are displayed in attractive orange boxes with proper line breaks for better readability.

### ✨ Latest Features (v2.2)
- **Group Names**: Groups now have custom names instead of generated ones
- **Address Book Suggestions**: Frontend suggests addresses from groups
- **Enhanced Bill Splitting**: Custom amounts per participant
- **Gamble Feature**: All-or-nothing settlement alternative
- **Settlement Rejection**: Cancel settlements before approval/deposit (bills remain unsettled)
- **Settlement Tracking**: Complete history of settlements
- **Auto-deployment**: `deployments.json` automatically updated on deploy
- **🆕 Test USDC Minting**: `mintForTest()` function in MockUSDC for easy testing
- **🆕 Smart Error Handling**: No more infinite API retries - shows clear error messages
- **🆕 Smart Network Guidance**: Orange messages guide users between networks and testing features

### Universal Verification Script

The project includes a comprehensive verification script (`verify-all-contracts.ts`) that:

- ✅ **Dynamically generates constructor arguments** using viem's `encodeAbiParameters`
- ✅ **Loads deployment addresses** from `deployments.json` automatically  
- ✅ **Resolves all dependencies** (OpenZeppelin, local contracts) automatically
- ✅ **Handles all contract types** (Group, Registry, GroupFactory) with proper configurations
- ✅ **Supports both BaseScan and Blockscout** verification
- ✅ **Provides EIP-1167 proxy verification** instructions
- ✅ **Rate limiting and error handling** built-in

**Usage:**
```bash
npm run verify  # Universal verification script
```

The script automatically:
1. Checks current verification status
2. Generates constructor arguments for each contract
3. Submits unverified contracts for verification
4. Monitors verification progress
5. Provides proxy verification instructions

### Deploy to Base Sepolia (Testnet)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your PRIVATE_KEY and ETHERSCAN_API_KEY

# Deploy contracts to Base Sepolia
npm run deploy

# Verify contracts on BaseScan (automatic)
npm run verify
```

### Deploy to Base Mainnet (Production)

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your PRIVATE_KEY and ETHERSCAN_API_KEY

# Deploy contracts to Base Mainnet (uses real USDC)
npm run deploy-mainnet

# Verify contracts on BaseScan (automatic)
npm run verify-mainnet
```

⚠️ **Important**: The mainnet deployment uses the real USDC contract address (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`) instead of MockUSDC.

### Multi-Network Support

The frontend application supports both networks simultaneously:
- **Base Mainnet**: Production environment with real USDC
- **Base Sepolia**: Testnet environment with MockUSDC for testing

Users can switch between networks using the network selector in the app interface.

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

## 🎲 Gamble Feature

The gamble feature provides a fun, all-or-nothing alternative to traditional settlements:

### How It Works
1. **Propose**: Any member can propose a gamble when there are unsettled debts
2. **Vote**: ALL members must unanimously vote "yes" for the gamble to proceed
3. **Execute**: A random member is selected as the "loser" who pays for all unsettled bills
4. **Settle**: The loser owes the full amount to the original bill payers

### Gamble Logic
- **Fair Distribution**: The loser reimburses original payers for the full gross amount
- **Clean Slate**: All previous balances are reset before applying gamble results
- **Audit Trail**: Bills are marked as settled with a settlement ID for tracking
- **Automatic Settlement**: After gamble execution, a new settlement is triggered

### Security Considerations
⚠️ **IMPORTANT**: The current randomness uses `block.prevrandao` which is **NOT SECURE** for production. For real-world use with actual value, implement **Chainlink VRF** for verifiable randomness.

### Example Scenario
```
Before Gamble:
- Alice paid $60 lunch (Bob owes $30, Charlie owes $30)  
- Bob paid $40 groceries (Alice owes $20, Charlie owes $20)
- Net: Alice owes $10, Bob is owed $10, Charlie owes $20

After Gamble (Charlie loses):
- Charlie owes Alice $60 (for lunch bill)
- Charlie owes Bob $40 (for groceries bill)  
- Total: Charlie owes $100, Alice/Bob get reimbursed fully
```

## 🔐 Security

- Uses OpenZeppelin contracts for proven security patterns
- Implements proper access controls and validation
- All contracts verified on BaseScan for transparency
- **Gamble randomness is NOT production-ready** - use Chainlink VRF for real deployments

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

// Reject/cancel settlement before approval/deposit (creditors/debtors)
function rejectSettlement() external
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

#### Gamble Functions (New!)
```solidity
// Propose a gamble to settle all debts (requires unanimous approval)
function proposeGamble() external

// Vote on an active gamble proposal
function voteOnGamble(bool _accept) external

// Cancel a gamble (only proposer can call)
function cancelGamble() external

// Get current gamble status
function getGambleStatus() external view returns (
    bool active,
    address proposer, 
    uint256 voteCount,
    uint256 totalMembers,
    bool hasVoted
)
```

#### Settlement Tracking Functions (New!)
```solidity
// Get bills that haven't been settled yet
function getUnsettledBills() external view returns (Bill[] memory)

// Get bills settled in a specific settlement
function getBillsBySettlement(uint256 _settlementId) external view returns (Bill[] memory)
```

### Enhanced Bill Structure
```solidity
struct Bill {
    uint256 id;              // Unique bill ID
    string description;      // Bill description
    uint256 totalAmount;     // Total bill amount (USDC with 6 decimals)
    address payer;           // Who paid the bill
    address[] participants;  // Who participated in the expense
    uint256[] amounts;       // Exact amount each participant owes
    uint256 timestamp;       // When bill was created (block.timestamp)
    uint256 settlementId;    // ID of settlement that cleared this bill (0 = unsettled)
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

// === NEW: Gamble Feature ===

// Propose a gamble (alternative to normal settlement)
await group.write.proposeGamble();

// Vote on a gamble
await group.write.voteOnGamble([true]); // Accept
// await group.write.voteOnGamble([false]); // Reject

// Check gamble status
const [active, proposer, voteCount, totalMembers, hasVoted] = await group.read.getGambleStatus();
console.log(`Gamble active: ${active}, Votes: ${voteCount}/${totalMembers}`);

// Cancel gamble (only proposer)
await group.write.cancelGamble();

// === NEW: Settlement Tracking ===

// Get unsettled bills
const unsettledBills = await group.read.getUnsettledBills();
console.log(`${unsettledBills.length} bills pending settlement`);

// Get bills from a specific settlement
const settlementBills = await group.read.getBillsBySettlement([1]); // Settlement ID 1
console.log(`Settlement 1 included ${settlementBills.length} bills`);
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

// Custom hook for gamble feature (NEW!)
function useGambleStatus(groupAddress: string) {
    const [gambleStatus, setGambleStatus] = useState({
        active: false,
        proposer: '',
        voteCount: 0,
        totalMembers: 0,
        hasVoted: false
    });
    
    useEffect(() => {
        async function fetchGambleStatus() {
            const [active, proposer, voteCount, totalMembers, hasVoted] = await group.read.getGambleStatus();
            setGambleStatus({
                active,
                proposer,
                voteCount: Number(voteCount),
                totalMembers: Number(totalMembers),
                hasVoted
            });
        }
        fetchGambleStatus();
    }, [groupAddress]);

    return gambleStatus;
}

// Custom hook for bill tracking (NEW!)
function useBillTracking(groupAddress: string) {
    const [unsettledBills, setUnsettledBills] = useState<Bill[]>([]);
    const [settlementHistory, setSettlementHistory] = useState<{[key: number]: Bill[]}>({});
    
    useEffect(() => {
        async function fetchBillData() {
            const unsettled = await group.read.getUnsettledBills();
            setUnsettledBills(unsettled);
            
            // Fetch settlement history (example for settlements 1-5)
            const history: {[key: number]: Bill[]} = {};
            for (let i = 1; i <= 5; i++) {
                try {
                    const settlementBills = await group.read.getBillsBySettlement([i]);
                    if (settlementBills.length > 0) {
                        history[i] = settlementBills;
                    }
                } catch (error) {
                    // Settlement doesn't exist yet
                    break;
                }
            }
            setSettlementHistory(history);
        }
        fetchBillData();
    }, [groupAddress]);

    return { unsettledBills, settlementHistory };
}
```

## 📄 License

MIT License - see LICENSE file for details.