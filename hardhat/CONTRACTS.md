# BasedBills Smart Contract Architecture

This document describes the smart contract system for BasedBills, a decentralized bill splitting application on Base network.

## Overview

The system consists of four main contracts that work together to enable trustless bill splitting and USDC settlements:

1. **IUSDC.sol** - Interface for USDC token interactions
2. **Registry.sol** - Tracks which groups users belong to
3. **Group.sol** - Core logic for bill management and settlements
4. **GroupFactory.sol** - Creates new groups using minimal proxy pattern

## Contract Details

### IUSDC Interface
- Defines standard ERC20 functions needed for USDC interactions
- Used by Group contracts to handle USDC transfers
- Points to official USDC contract on Base network

### Registry Contract
- Acts as a "phone book" for user groups
- Maps user addresses to their group memberships
- Only the GroupFactory can register new groups
- Provides easy lookup for frontend applications

### Group Contract (Core Logic)
- Manages individual group expenses and balances
- Handles bill splitting calculations
- Implements trustless settlement process
- Key features:
  - **Bill Management**: Add expenses and split among participants
  - **Balance Tracking**: Positive = owed money, negative = owes money
  - **Settlement Process**: Multi-step approval and funding system
  - **Automatic Distribution**: Funds distributed when all conditions met

### GroupFactory Contract
- Creates new Group instances using EIP-1167 minimal proxy pattern
- Significantly reduces gas costs (proxy ~2000 gas vs full deployment ~200k gas)
- Validates group members and prevents duplicates
- Registers new groups with the Registry

## Settlement Flow

The settlement process is designed to be trustless and automatic:

1. **Trigger Settlement**: Any group member can initiate settlement
   - Calculates total debt amount
   - Resets approval/funding status
   - Sets settlement as active

2. **Creditor Approval**: Members owed money must approve
   - Only creditors (positive balance) can approve
   - Prevents unauthorized settlements

3. **Debtor Funding**: Members who owe money must deposit USDC
   - Requires prior USDC approval for the Group contract
   - Funds held in escrow until all conditions met

4. **Automatic Distribution**: When both conditions are met:
   - All debts funded (fundedAmount == totalOwed)
   - All creditors approved
   - Contract automatically distributes USDC to creditors
   - All balances reset to zero

## Security Features

- **Access Control**: Only group members can interact with group functions
- **Validation**: Extensive input validation and state checks
- **Reentrancy Protection**: State changes before external calls
- **Overflow Protection**: Uses Solidity 0.8+ built-in overflow checks
- **Trustless Settlement**: No admin intervention required

## Gas Optimization

- **Minimal Proxy Pattern**: ~99% reduction in deployment costs
- **Efficient Storage**: Optimized data structures
- **Batch Operations**: Multiple balance updates in single transaction

## Deployment

The contracts are deployed in this order:
1. Group logic contract (template)
2. Registry contract
3. GroupFactory contract
4. Update Registry with Factory address

## Testing

Comprehensive test suite covers:
- Group creation and validation
- Bill addition and balance calculations
- Settlement process edge cases
- Access control and security

## Base Network Integration

- **USDC Address**: Uses official Base USDC contract
- **Network Compatibility**: Optimized for Base L2
- **Low Fees**: Takes advantage of Base's low transaction costs

## Usage Example

```solidity
// 1. Create a group
address[] memory members = [alice, bob, charlie];
address groupAddress = groupFactory.createGroup(members);

// 2. Add a bill
Group group = Group(groupAddress);
group.addBill("Dinner", 100e6, [alice, bob]); // 100 USDC split between alice and bob

// 3. Settle balances
group.triggerSettlement();
group.approveSettlement(); // Alice approves (she's owed money)
group.fundSettlement();    // Bob funds his debt
// Automatic distribution occurs when both conditions are met
```

## Future Enhancements

- **Multi-token Support**: Support for other stablecoins
- **Recurring Bills**: Automatic bill creation for subscriptions
- **Advanced Splitting**: Percentage-based and weighted splits
- **Group Management**: Add/remove members, group metadata
- **Integration**: Direct integration with payment providers
