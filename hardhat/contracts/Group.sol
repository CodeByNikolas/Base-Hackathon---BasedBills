// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IUSDC.sol";

/**
 * @title Group
 * @dev Core logic contract for managing group expenses and settlements
 * This contract handles bill splitting and automatic USDC settlements
 */
contract Group {
    /// @dev Array of group member addresses
    address[] public members;
    
    /// @dev Mapping to check if an address is a member
    mapping(address => bool) public isMember;
    
    /// @dev Member balances: positive = owed money, negative = owes money
    mapping(address => int256) public balances;
    
    /// @dev Address of the USDC contract on Base network
    address public usdcAddress;
    
    /// @dev Flag indicating if a settlement process is active
    bool public settlementActive;
    
    /// @dev Total amount that needs to be deposited by debtors
    uint256 public totalOwed;
    
    /// @dev Amount currently deposited in the contract for settlement
    uint256 public fundedAmount;
    
    /// @dev Tracks which debtors have deposited their share
    mapping(address => bool) public hasFunded;
    
    /// @dev Tracks which creditors have approved the settlement
    mapping(address => bool) public hasApproved;
    
    /// @dev Flag to prevent reinitialization
    bool private initialized;
    
    /// @dev Events
    event BillAdded(string description, uint256 amount, address[] participants, address payer);
    event SettlementTriggered(uint256 totalOwed);
    event SettlementApproved(address indexed creditor);
    event SettlementFunded(address indexed debtor, uint256 amount);
    event SettlementCompleted(uint256 totalDistributed);
    event MemberAdded(address indexed member);
    
    /**
     * @dev Modifier to ensure only group members can call certain functions
     */
    modifier onlyMember() {
        require(isMember[msg.sender], "Group: Caller is not a member");
        _;
    }
    
    /**
     * @dev Modifier to ensure settlement is active
     */
    modifier settlementIsActive() {
        require(settlementActive, "Group: No active settlement");
        _;
    }
    
    /**
     * @dev Modifier to ensure settlement is not active
     */
    modifier settlementNotActive() {
        require(!settlementActive, "Group: Settlement is active");
        _;
    }
    
    /**
     * @dev Initialize the group with members (called by factory after deployment)
     * @param _members Array of member addresses
     */
    function initialize(address[] calldata _members) external {
        require(!initialized, "Group: Already initialized");
        require(_members.length > 0, "Group: No members provided");
        
        // Set USDC address for Base network (this should be updated for mainnet)
        // For Base Sepolia testnet: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
        // For Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC for testing
        
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Group: Invalid member address");
            require(!isMember[_members[i]], "Group: Duplicate member");
            
            members.push(_members[i]);
            isMember[_members[i]] = true;
            emit MemberAdded(_members[i]);
        }
        
        initialized = true;
    }
    
    /**
     * @dev Add a new bill and update member balances
     * @param _description Description of the bill
     * @param _amount Total amount of the bill in USDC (with 6 decimals)
     * @param _participants Array of addresses who participated in this expense
     */
    function addBill(
        string calldata _description,
        uint256 _amount,
        address[] calldata _participants
    ) external onlyMember settlementNotActive {
        require(_amount > 0, "Group: Amount must be positive");
        require(_participants.length > 0, "Group: No participants provided");
        
        // Verify all participants are members
        for (uint256 i = 0; i < _participants.length; i++) {
            require(isMember[_participants[i]], "Group: Participant not a member");
        }
        
        // Calculate amount per participant
        uint256 amountPerPerson = _amount / _participants.length;
        uint256 remainder = _amount % _participants.length;
        
        // Update balances: payer gets positive balance, participants get negative
        balances[msg.sender] += int256(_amount);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            uint256 personalShare = amountPerPerson;
            // First person gets the remainder if amount doesn't divide evenly
            if (i == 0) {
                personalShare += remainder;
            }
            balances[_participants[i]] -= int256(personalShare);
        }
        
        emit BillAdded(_description, _amount, _participants, msg.sender);
    }
    
    /**
     * @dev Trigger a settlement process
     * Calculates total owed and prepares for funding/approval
     */
    function triggerSettlement() external onlyMember settlementNotActive {
        uint256 _totalOwed = 0;
        
        // Calculate total amount owed by debtors
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] < 0) {
                _totalOwed += uint256(-balances[members[i]]);
            }
        }
        
        require(_totalOwed > 0, "Group: No debts to settle");
        
        // Reset settlement state
        totalOwed = _totalOwed;
        fundedAmount = 0;
        settlementActive = true;
        
        // Reset funding and approval status for all members
        for (uint256 i = 0; i < members.length; i++) {
            hasFunded[members[i]] = false;
            hasApproved[members[i]] = false;
        }
        
        emit SettlementTriggered(_totalOwed);
    }
    
    /**
     * @dev Approve settlement (for creditors with positive balances)
     */
    function approveSettlement() external onlyMember settlementIsActive {
        require(balances[msg.sender] > 0, "Group: Only creditors can approve");
        require(!hasApproved[msg.sender], "Group: Already approved");
        
        hasApproved[msg.sender] = true;
        emit SettlementApproved(msg.sender);
        
        _checkAndDistribute();
    }
    
    /**
     * @dev Fund settlement (for debtors with negative balances)
     * Requires prior USDC approval for this contract
     */
    function fundSettlement() external onlyMember settlementIsActive {
        require(balances[msg.sender] < 0, "Group: Only debtors can fund");
        require(!hasFunded[msg.sender], "Group: Already funded");
        
        uint256 amountOwed = uint256(-balances[msg.sender]);
        
        // Transfer USDC from debtor to this contract
        require(
            IUSDC(usdcAddress).transferFrom(msg.sender, address(this), amountOwed),
            "Group: USDC transfer failed"
        );
        
        hasFunded[msg.sender] = true;
        fundedAmount += amountOwed;
        
        emit SettlementFunded(msg.sender, amountOwed);
        
        _checkAndDistribute();
    }
    
    /**
     * @dev Internal function to check if settlement can be completed and distribute funds
     */
    function _checkAndDistribute() internal {
        // Check if all funds are collected
        if (fundedAmount != totalOwed) {
            return;
        }
        
        // Check if all creditors have approved
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0 && !hasApproved[members[i]]) {
                return; // Not all creditors have approved yet
            }
        }
        
        // All conditions met - distribute funds
        uint256 totalDistributed = 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) {
                uint256 amountOwed = uint256(balances[members[i]]);
                require(
                    IUSDC(usdcAddress).transfer(members[i], amountOwed),
                    "Group: USDC distribution failed"
                );
                totalDistributed += amountOwed;
                balances[members[i]] = 0;
            } else if (balances[members[i]] < 0) {
                balances[members[i]] = 0;
            }
        }
        
        // Reset settlement state
        settlementActive = false;
        totalOwed = 0;
        fundedAmount = 0;
        
        emit SettlementCompleted(totalDistributed);
    }
    
    /**
     * @dev Get all group members
     * @return Array of member addresses
     */
    function getMembers() external view returns (address[] memory) {
        return members;
    }
    
    /**
     * @dev Get member count
     * @return Number of members in the group
     */
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }
    
    /**
     * @dev Get balance for a specific member
     * @param _member Address of the member
     * @return Balance (positive = owed, negative = owes)
     */
    function getBalance(address _member) external view returns (int256) {
        return balances[_member];
    }
    
    /**
     * @dev Check if settlement conditions are met
     * @return bool indicating if settlement can be completed
     */
    function canCompleteSettlement() external view returns (bool) {
        if (!settlementActive || fundedAmount != totalOwed) {
            return false;
        }
        
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0 && !hasApproved[members[i]]) {
                return false;
            }
        }
        
        return true;
    }
}
