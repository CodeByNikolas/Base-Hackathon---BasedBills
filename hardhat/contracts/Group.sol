// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IUSDC.sol";

/**
 * @title Group
 * @dev Core logic contract for managing group expenses and settlements.
 * This contract handles bill splitting, automatic USDC settlements, and an optional gamble feature.
 */
contract Group {
    // --- State Variables ---

    string public groupName;
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => int256) public balances;
    address public usdcAddress;
    bool private initialized;

    // Bill tracking
    struct Bill {
        uint256 id;
        string description;
        uint256 totalAmount;
        address payer;
        address[] participants;
        uint256[] amounts;
        uint256 timestamp;
        uint256 settlementId; // ID of the settlement that cleared this bill
    }
    Bill[] public bills;
    uint256 public billCounter;

    // Settlement state
    bool public settlementActive;
    uint256 public totalOwed;
    uint256 public fundedAmount;
    mapping(address => bool) public hasFunded;
    mapping(address => bool) public hasApproved;
    uint256 public settlementCounter; // Counter for completed settlements
    uint256 public settlementStartTime; // ADDED: Timestamp for settlement timeout
    uint256 public constant SETTLEMENT_TIMEOUT = 7 days; // ADDED: Timeout duration

    // Gamble state
    bool public gambleActive;
    address public gambleProposer;
    mapping(address => bool) public hasVotedOnGamble;
    uint256 public gambleVoteCount;

    // --- Events ---

    event BillAdded(uint256 indexed billId, string description, uint256 amount, address[] participants, uint256[] amounts, address payer);
    event CustomBillAdded(uint256 indexed billId, string description, uint256 totalAmount, address[] participants, uint256[] customAmounts, address payer);
    event MemberAdded(address indexed member);
    event GroupNameUpdated(string newName, address indexed updatedBy);

    // Settlement Events
    event SettlementTriggered(uint256 indexed settlementId, uint256 totalOwed);
    event SettlementApproved(address indexed creditor);
    event SettlementFunded(address indexed debtor, uint256 amount);
    event SettlementCompleted(uint256 indexed settlementId, uint256 totalDistributed);
    event SettlementCancelled(uint256 indexed settlementId); // ADDED: Event for cancellation

    // Gamble Events
    event GambleProposed(address indexed proposer);
    event GambleVoteCast(address indexed voter, bool vote);
    event GambleExecuted(address indexed loser, uint256 amount);
    event GambleCancelled();

    // --- Modifiers ---

    modifier onlyMember() {
        require(isMember[msg.sender], "Group: Caller is not a member");
        _;
    }

    modifier settlementIsActive() {
        require(settlementActive, "Group: No active settlement");
        _;
    }

    modifier noActiveProcess() {
        require(!settlementActive, "Group: Settlement is active");
        require(!gambleActive, "Group: Gamble is active");
        _;
    }

    // --- Initialization ---

    function initialize(address[] calldata _members, string calldata _groupName) external {
        require(!initialized, "Group: Already initialized");
        require(_members.length > 0, "Group: No members provided");
        require(bytes(_groupName).length > 0, "Group: Group name cannot be empty");
        require(bytes(_groupName).length <= 100, "Group: Group name too long");
        
        groupName = _groupName;
        usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
        
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Group: Invalid member address");
            require(!isMember[_members[i]], "Group: Duplicate member");
            
            members.push(_members[i]);
            isMember[_members[i]] = true;
            emit MemberAdded(_members[i]);
        }
        
        initialized = true;
        settlementCounter = 1; // Start settlement IDs from 1
    }

    // --- Bill Management ---

    function addBill(
        string calldata _description,
        uint256 _amount,
        address[] calldata _participants
    ) external onlyMember noActiveProcess {
        require(_amount > 0, "Group: Amount must be positive");
        require(_participants.length > 0, "Group: No participants provided");
        
        for (uint256 i = 0; i < _participants.length; i++) {
            require(isMember[_participants[i]], "Group: Participant not a member");
        }
        
        uint256 amountPerPerson = _amount / _participants.length;
        uint256 remainder = _amount % _participants.length;
        
        uint256[] memory amounts = new uint256[](_participants.length);
        
        balances[msg.sender] += int256(_amount);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            uint256 personalShare = amountPerPerson;
            if (i == 0) {
                personalShare += remainder;
            }
            amounts[i] = personalShare;
            balances[_participants[i]] -= int256(personalShare);
        }
        
        bills.push(Bill({
            id: billCounter,
            description: _description,
            totalAmount: _amount,
            payer: msg.sender,
            participants: _participants,
            amounts: amounts,
            timestamp: block.timestamp,
            settlementId: 0 // 0 means unsettled
        }));
        
        emit BillAdded(billCounter, _description, _amount, _participants, amounts, msg.sender);
        billCounter++;
    }

    function addCustomBill(
        string calldata _description,
        address[] calldata _participants,
        uint256[] calldata _amounts
    ) external onlyMember noActiveProcess {
        require(_participants.length > 0, "Group: No participants provided");
        require(_participants.length == _amounts.length, "Group: Participants and amounts length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _participants.length; i++) {
            require(isMember[_participants[i]], "Group: Participant not a member");
            require(_amounts[i] > 0, "Group: Amount must be positive");
            totalAmount += _amounts[i];
        }
        
        require(totalAmount > 0, "Group: Total amount must be positive");
        
        balances[msg.sender] += int256(totalAmount);
        
        for (uint256 i = 0; i < _participants.length; i++) {
            balances[_participants[i]] -= int256(_amounts[i]);
        }
        
        bills.push(Bill({
            id: billCounter,
            description: _description,
            totalAmount: totalAmount,
            payer: msg.sender,
            participants: _participants,
            amounts: _amounts,
            timestamp: block.timestamp,
            settlementId: 0 // 0 means unsettled
        }));
        
        emit CustomBillAdded(billCounter, _description, totalAmount, _participants, _amounts, msg.sender);
        billCounter++;
    }

    // --- Settlement Logic ---

    // NEW FUNCTION: Internal function to activate the settlement state.
    function _activateSettlement() internal {
        uint256 _totalOwed = _calculateTotalOwed();
        require(_totalOwed > 0, "Group: No debts to settle");

        // This check is important to ensure a gamble isn't active
        require(!gambleActive, "Group: Gamble is active");

        totalOwed = _totalOwed;
        fundedAmount = 0;
        settlementActive = true;
        settlementStartTime = block.timestamp;

        emit SettlementTriggered(settlementCounter, _totalOwed);
    }

    // MODIFIED: Now triggers a settlement if one is not active.
    function approveSettlement() external onlyMember {
        if (!settlementActive) {
            _activateSettlement();
        }

        require(balances[msg.sender] > 0, "Group: Only creditors can approve");
        require(!hasApproved[msg.sender], "Group: Already approved");

        hasApproved[msg.sender] = true;
        emit SettlementApproved(msg.sender);

        _checkAndDistribute();
    }

    // MODIFIED: Now triggers a settlement if one is not active.
    function fundSettlement() external onlyMember {
        if (!settlementActive) {
            _activateSettlement();
        }

        require(balances[msg.sender] < 0, "Group: Only debtors can fund");
        require(!hasFunded[msg.sender], "Group: Already funded");

        uint256 amountOwed = uint256(-balances[msg.sender]);

        require(IUSDC(usdcAddress).transferFrom(msg.sender, address(this), amountOwed), "Group: USDC transfer failed");

        hasFunded[msg.sender] = true;
        fundedAmount += amountOwed;

        emit SettlementFunded(msg.sender, amountOwed);

        _checkAndDistribute();
    }

    // ADDED: New function to cancel a stalled settlement
    function cancelSettlement() external settlementIsActive {
        require(block.timestamp >= settlementStartTime + SETTLEMENT_TIMEOUT, "Group: Settlement timeout not reached");

        // Refund any debtors who have already paid
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            // Check if they are a debtor AND they have funded
            if (balances[member] < 0 && hasFunded[member]) {
                uint256 amountToRefund = uint256(-balances[member]);
                if (amountToRefund > 0) {
                    require(IUSDC(usdcAddress).transfer(member, amountToRefund), "Group: USDC refund failed");
                }
            }
        }

        emit SettlementCancelled(settlementCounter);
        
        // Reset the state back to non-settlement mode
        _resetSettlementState();
    }

    function _checkAndDistribute() internal {
        if (fundedAmount != totalOwed) return;
        
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0 && !hasApproved[members[i]]) {
                return;
            }
        }
        
        uint256 totalDistributed = 0;
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) {
                uint256 amountToReceive = uint256(balances[members[i]]);
                require(IUSDC(usdcAddress).transfer(members[i], amountToReceive), "Group: USDC distribution failed");
                totalDistributed += amountToReceive;
            }
        }

        // Mark all unsettled bills as settled with current settlement ID
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                bills[i].settlementId = settlementCounter;
            }
        }
        
        // Reset all balances to zero
        for (uint256 i = 0; i < members.length; i++) {
            balances[members[i]] = 0;
        }

        emit SettlementCompleted(settlementCounter, totalDistributed);
        
        _resetSettlementState();
        settlementCounter++;
    }

    // MODIFIED: Now resets all settlement-related state
    function _resetSettlementState() internal {
        settlementActive = false;
        totalOwed = 0;
        fundedAmount = 0;
        settlementStartTime = 0; // MODIFIED: Reset start time

        // MODIFIED: Centralized reset for member-specific flags
        for (uint256 i = 0; i < members.length; i++) {
            hasFunded[members[i]] = false;
            hasApproved[members[i]] = false;
        }
    }

    // --- Gamble Logic ---

    function proposeGamble() external onlyMember noActiveProcess {
        require(_calculateTotalOwed() > 0, "Group: No debts to gamble");
        gambleActive = true;
        gambleProposer = msg.sender;
        
        gambleVoteCount = 0;
        for(uint i = 0; i < members.length; i++) {
            hasVotedOnGamble[members[i]] = false;
        }

        emit GambleProposed(msg.sender);
    }

    function voteOnGamble(bool _accept) external onlyMember {
        require(gambleActive, "Group: No active gamble");
        require(!hasVotedOnGamble[msg.sender], "Group: Already voted");

        hasVotedOnGamble[msg.sender] = true;

        if (_accept) {
            gambleVoteCount++;
            emit GambleVoteCast(msg.sender, true);

            if (gambleVoteCount == members.length) {
                _executeGamble();
            }
        } else {
            emit GambleVoteCast(msg.sender, false);
            _cancelGamble();
        }
    }

    function cancelGamble() external {
        require(gambleActive, "Group: No active gamble");
        require(msg.sender == gambleProposer, "Group: Only proposer can cancel");
        _cancelGamble();
    }

    function _executeGamble() internal {
        // WARNING: Insecure pseudo-randomness. Use Chainlink VRF for production.
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, members))) % members.length;
        address loser = members[randomIndex];

        // Step 1: Calculate total unsettled amount
        uint256 totalUnsettledAmount = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                totalUnsettledAmount += bills[i].totalAmount;
            }
        }

        // Step 2: Reset all member balances to zero for a clean slate
        for (uint i = 0; i < members.length; i++) {
            balances[members[i]] = 0;
        }

        // Step 3: Assign the total debt to the loser
        balances[loser] -= int256(totalUnsettledAmount);

        // Step 4: Credit the original payers for their unsettled bills
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                balances[bills[i].payer] += int256(bills[i].totalAmount);
            }
        }

        // Step 5: Mark all unsettled bills as settled with current settlement ID
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                bills[i].settlementId = settlementCounter;
            }
        }

        // Step 6: Clean up gamble state
        gambleActive = false;
        gambleVoteCount = 0;
        
        emit GambleExecuted(loser, totalUnsettledAmount);
        emit SettlementCompleted(settlementCounter, 0);
        settlementCounter++;

        // Step 7: If there are still debts after gamble, trigger a new settlement
        uint256 newTotalOwed = _calculateTotalOwed();
        if (newTotalOwed > 0) {
            totalOwed = newTotalOwed;
            fundedAmount = 0;
            settlementActive = true;
            
            for (uint256 i = 0; i < members.length; i++) {
                hasFunded[members[i]] = false;
                hasApproved[members[i]] = false;
            }
            
            emit SettlementTriggered(settlementCounter, newTotalOwed);
        }
    }

    function _cancelGamble() internal {
        gambleActive = false;
        gambleProposer = address(0);
        gambleVoteCount = 0;
        emit GambleCancelled();
    }

    // --- View Functions ---

    function _calculateTotalOwed() internal view returns (uint256) {
        uint256 _totalOwed = 0;
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] < 0) {
                _totalOwed += uint256(-balances[members[i]]);
            }
        }
        return _totalOwed;
    }
    
    function getMembers() external view returns (address[] memory) {
        return members;
    }
    
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }
    
    function getGroupName() external view returns (string memory) {
        return groupName;
    }
    
    function updateGroupName(string calldata _newName) external onlyMember {
        require(bytes(_newName).length > 0, "Group: Group name cannot be empty");
        require(bytes(_newName).length <= 100, "Group: Group name too long");
        groupName = _newName;
        emit GroupNameUpdated(_newName, msg.sender);
    }
    
    function getBalance(address _member) external view returns (int256) {
        return balances[_member];
    }
    
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
    
    function getAllBalances() external view returns (address[] memory memberAddresses, int256[] memory memberBalances) {
        memberAddresses = new address[](members.length);
        memberBalances = new int256[](members.length);
        
        for (uint256 i = 0; i < members.length; i++) {
            memberAddresses[i] = members[i];
            memberBalances[i] = balances[members[i]];
        }
        
        return (memberAddresses, memberBalances);
    }
    
    function getSettlementAmounts() external view returns (
        address[] memory creditors,
        uint256[] memory creditorAmounts,
        address[] memory debtors,
        uint256[] memory debtorAmounts
    ) {
        uint256 creditorCount = 0;
        uint256 debtorCount = 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) {
                creditorCount++;
            } else if (balances[members[i]] < 0) {
                debtorCount++;
            }
        }
        
        creditors = new address[](creditorCount);
        creditorAmounts = new uint256[](creditorCount);
        debtors = new address[](debtorCount);
        debtorAmounts = new uint256[](debtorCount);
        
        uint256 creditorIndex = 0;
        uint256 debtorIndex = 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) {
                creditors[creditorIndex] = members[i];
                creditorAmounts[creditorIndex] = uint256(balances[members[i]]);
                creditorIndex++;
            } else if (balances[members[i]] < 0) {
                debtors[debtorIndex] = members[i];
                debtorAmounts[debtorIndex] = uint256(-balances[members[i]]);
                debtorIndex++;
            }
        }
        
        return (creditors, creditorAmounts, debtors, debtorAmounts);
    }
    
    function getAllBills() external view returns (Bill[] memory) {
        return bills;
    }
    
    function getBill(uint256 _billId) external view returns (Bill memory) {
        require(_billId < bills.length, "Group: Bill does not exist");
        return bills[_billId];
    }
    
    function getBillCount() external view returns (uint256) {
        return bills.length;
    }
    
    function getBillsPaginated(uint256 _offset, uint256 _limit) external view returns (Bill[] memory) {
        require(_offset < bills.length, "Group: Offset out of bounds");
        
        uint256 end = _offset + _limit;
        if (end > bills.length) {
            end = bills.length;
        }
        
        Bill[] memory result = new Bill[](end - _offset);
        for (uint256 i = _offset; i < end; i++) {
            result[i - _offset] = bills[i];
        }
        
        return result;
    }
    
    function getBillsByPayer(address _payer) external view returns (uint256[] memory) {
        require(isMember[_payer], "Group: Address is not a member");
        
        uint256 count = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].payer == _payer) {
                count++;
            }
        }
        
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].payer == _payer) {
                result[index] = bills[i].id;
                index++;
            }
        }
        
        return result;
    }

    // --- Additional View Functions for Gamble Feature ---

    function getUnsettledBills() external view returns (Bill[] memory) {
        uint256 unsettledCount = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                unsettledCount++;
            }
        }
        
        Bill[] memory unsettledBills = new Bill[](unsettledCount);
        uint256 index = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                unsettledBills[index] = bills[i];
                index++;
            }
        }
        
        return unsettledBills;
    }

    function getBillsBySettlement(uint256 _settlementId) external view returns (Bill[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == _settlementId) {
                count++;
            }
        }
        
        Bill[] memory result = new Bill[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == _settlementId) {
                result[index] = bills[i];
                index++;
            }
        }
        
        return result;
    }

    function getGambleStatus() external view returns (
        bool active,
        address proposer,
        uint256 voteCount,
        uint256 totalMembers,
        bool hasVoted
    ) {
        return (
            gambleActive,
            gambleProposer,
            gambleVoteCount,
            members.length,
            hasVotedOnGamble[msg.sender]
        );
    }
}