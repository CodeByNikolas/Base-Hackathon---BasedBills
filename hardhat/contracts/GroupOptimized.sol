// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IUSDC.sol";

contract GroupOptimized {
    // --- Core State Variables ---
    address[] public members;
    mapping(address => bool) public isMember;
    mapping(address => int256) public balances;
    address public usdcAddress;
    bool private initialized;

    // --- Settlement State ---
    bool public settlementActive;
    uint256 public totalOwed;
    uint256 public fundedAmount;
    mapping(address => bool) public hasFunded;
    mapping(address => bool) public hasApproved;
    uint256 public settlementCounter;

    // --- Bill Management ---
    struct Bill {
        uint256 id;
        string description;
        uint256 totalAmount;
        address payer;
        address[] participants;
        uint256[] amounts;
        uint256 timestamp;
        uint256 settlementId;
    }
    
    Bill[] public bills;
    uint256 public billCounter;

    // --- Gamble State ---
    bool public gambleActive;
    address public gambleProposer;
    mapping(address => bool) public hasVotedOnGamble;
    uint256 public gambleVoteCount;

    // --- Events ---
    event BillAdded(uint256 indexed billId, string description, uint256 amount, address[] participants, uint256[] amounts, address payer);
    event CustomBillAdded(uint256 indexed billId, string description, address[] participants, uint256[] amounts, address payer);
    event SettlementTriggered(uint256 indexed settlementId, uint256 totalAmount);
    event SettlementCompleted(uint256 indexed settlementId, uint256 totalAmount);
    event MemberInitialized(address member);
    event GambleProposed(address proposer);
    event GambleVoteCast(address voter, bool accept);
    event GambleExecuted(address loser, uint256 totalAmount);
    event GambleCancelled();

    // --- Modifiers ---
    modifier onlyMember() {
        require(isMember[msg.sender], "Group: Caller is not a member");
        _;
    }

    modifier noActiveProcess() {
        require(!settlementActive, "Group: Settlement is active");
        require(!gambleActive, "Group: Gamble is active");
        _;
    }

    // --- Initialization ---
    function initialize(address[] calldata _members) external {
        require(!initialized, "Group: Already initialized");
        require(_members.length > 0, "Group: No members provided");
        
        usdcAddress = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // Base Sepolia USDC
        
        for (uint i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Group: Invalid member address");
            require(!isMember[_members[i]], "Group: Duplicate member");
            
            members.push(_members[i]);
            isMember[_members[i]] = true;
            emit MemberInitialized(_members[i]);
        }
        
        initialized = true;
        settlementCounter = 1;
    }

    // --- Bill Management ---
    function addBill(string calldata _description, uint256 _amount, address[] calldata _participants) external onlyMember noActiveProcess {
        require(_amount > 0, "Group: Amount must be positive");
        require(_participants.length > 0, "Group: No participants provided");
        
        for (uint i = 0; i < _participants.length; i++) {
            require(isMember[_participants[i]], "Group: Participant not a member");
        }
        
        uint256 amountPerPerson = _amount / _participants.length;
        uint256 remainder = _amount % _participants.length;
        
        uint256[] memory amounts = new uint256[](_participants.length);
        
        balances[msg.sender] += int256(_amount);
        
        for (uint i = 0; i < _participants.length; i++) {
            uint256 share = amountPerPerson;
            if (i == 0) share += remainder;
            amounts[i] = share;
            balances[_participants[i]] -= int256(share);
        }
        
        bills.push(Bill({
            id: billCounter,
            description: _description,
            totalAmount: _amount,
            payer: msg.sender,
            participants: _participants,
            amounts: amounts,
            timestamp: block.timestamp,
            settlementId: 0
        }));
        
        emit BillAdded(billCounter, _description, _amount, _participants, amounts, msg.sender);
        billCounter++;
    }

    function addCustomBill(string calldata _description, address[] calldata _participants, uint256[] calldata _amounts) external onlyMember noActiveProcess {
        require(_participants.length > 0, "Group: No participants provided");
        require(_participants.length == _amounts.length, "Group: Participants and amounts length mismatch");
        
        uint256 totalAmount = 0;
        for (uint i = 0; i < _participants.length; i++) {
            require(isMember[_participants[i]], "Group: Participant not a member");
            require(_amounts[i] > 0, "Group: Amount must be positive");
            totalAmount += _amounts[i];
        }
        require(totalAmount > 0, "Group: Total amount must be positive");
        
        balances[msg.sender] += int256(totalAmount);
        
        for (uint i = 0; i < _participants.length; i++) {
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
            settlementId: 0
        }));
        
        emit CustomBillAdded(billCounter, _description, _participants, _amounts, msg.sender);
        billCounter++;
    }

    // --- Settlement Logic ---
    function triggerSettlement() external onlyMember noActiveProcess {
        uint256 totalOwedAmount = _calculateTotalOwed();
        require(totalOwedAmount > 0, "Group: No debts to settle");
        
        totalOwed = totalOwedAmount;
        fundedAmount = 0;
        settlementActive = true;
        
        for (uint256 i = 0; i < members.length; i++) {
            hasFunded[members[i]] = false;
            hasApproved[members[i]] = false;
        }
        
        emit SettlementTriggered(settlementCounter, totalOwedAmount);
    }

    function approveSettlement() external onlyMember {
        require(settlementActive, "Group: No active settlement");
        require(balances[msg.sender] > 0, "Group: Only creditors can approve");
        require(!hasApproved[msg.sender], "Group: Already approved");
        
        hasApproved[msg.sender] = true;
        _checkAndDistribute();
    }

    function fundSettlement() external onlyMember {
        require(settlementActive, "Group: No active settlement");
        require(balances[msg.sender] < 0, "Group: Only debtors can fund");
        require(!hasFunded[msg.sender], "Group: Already funded");
        
        uint256 amountToFund = uint256(-balances[msg.sender]);
        
        bool success = IUSDC(usdcAddress).transferFrom(msg.sender, address(this), amountToFund);
        require(success, "Group: USDC transfer failed");
        
        hasFunded[msg.sender] = true;
        fundedAmount += amountToFund;
        
        _checkAndDistribute();
    }

    function _checkAndDistribute() internal {
        if (!canCompleteSettlement()) return;
        
        // Mark all unsettled bills as settled
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                bills[i].settlementId = settlementCounter;
            }
        }
        
        // Distribute to creditors
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) {
                uint256 amountOwed = uint256(balances[members[i]]);
                bool success = IUSDC(usdcAddress).transfer(members[i], amountOwed);
                require(success, "Group: USDC distribution failed");
                balances[members[i]] = 0;
            }
        }
        
        // Reset debtor balances
        for (uint256 i = 0; i < members.length; i++) {
            if (balances[members[i]] < 0) {
                balances[members[i]] = 0;
            }
        }
        
        emit SettlementCompleted(settlementCounter, totalOwed);
        settlementCounter++;
        settlementActive = false;
        totalOwed = 0;
        fundedAmount = 0;
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

        // Calculate total unsettled amount
        uint256 totalUnsettledAmount = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                totalUnsettledAmount += bills[i].totalAmount;
            }
        }

        // Reset all member balances to zero
        for (uint i = 0; i < members.length; i++) {
            balances[members[i]] = 0;
        }

        // Assign the total debt to the loser
        balances[loser] -= int256(totalUnsettledAmount);

        // Credit the original payers for their unsettled bills
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                balances[bills[i].payer] += int256(bills[i].totalAmount);
            }
        }

        // Mark all unsettled bills as settled
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                bills[i].settlementId = settlementCounter;
            }
        }

        // Clean up gamble state
        gambleActive = false;
        gambleVoteCount = 0;
        
        emit GambleExecuted(loser, totalUnsettledAmount);
        emit SettlementCompleted(settlementCounter, 0);
        settlementCounter++;

        // If there are still debts after gamble, trigger a new settlement
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
        gambleVoteCount = 0;
        emit GambleCancelled();
    }

    // --- View Functions ---
    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function getMemberCount() external view returns (uint256) {
        return members.length;
    }

    function getBalance(address _member) external view returns (int256) {
        return balances[_member];
    }

    function getAllBalances() external view returns (address[] memory memberAddresses, int256[] memory memberBalances) {
        memberAddresses = new address[](members.length);
        memberBalances = new int256[](members.length);
        
        for (uint i = 0; i < members.length; i++) {
            memberAddresses[i] = members[i];
            memberBalances[i] = balances[members[i]];
        }
    }

    function getBillCount() external view returns (uint256) {
        return bills.length;
    }

    function getAllBills() external view returns (Bill[] memory) {
        return bills;
    }

    function getBill(uint256 _billId) external view returns (Bill memory) {
        require(_billId < bills.length, "Group: Bill does not exist");
        return bills[_billId];
    }

    function getGambleStatus(address _user) external view returns (bool active, address proposer, uint256 voteCount, uint256 totalMembers, bool hasVoted) {
        return (gambleActive, gambleProposer, gambleVoteCount, members.length, hasVotedOnGamble[_user]);
    }

    function getUnsettledBills() external view returns (Bill[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) count++;
        }
        
        Bill[] memory result = new Bill[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == 0) {
                result[index++] = bills[i];
            }
        }
        return result;
    }

    function getBillsBySettlement(uint256 _settlementId) external view returns (Bill[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == _settlementId) count++;
        }
        
        Bill[] memory result = new Bill[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < bills.length; i++) {
            if (bills[i].settlementId == _settlementId) {
                result[index++] = bills[i];
            }
        }
        return result;
    }

    function getSettlementAmounts() external view returns (
        address[] memory creditors,
        uint256[] memory creditorAmounts,
        address[] memory debtors,
        uint256[] memory debtorAmounts
    ) {
        uint256 creditorCount = 0;
        uint256 debtorCount = 0;
        
        for (uint i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0) creditorCount++;
            else if (balances[members[i]] < 0) debtorCount++;
        }
        
        creditors = new address[](creditorCount);
        creditorAmounts = new uint256[](creditorCount);
        debtors = new address[](debtorCount);
        debtorAmounts = new uint256[](debtorCount);
        
        uint256 creditorIndex = 0;
        uint256 debtorIndex = 0;
        
        for (uint i = 0; i < members.length; i++) {
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
    }

    function canCompleteSettlement() public view returns (bool) {
        if (!settlementActive || totalOwed != fundedAmount) return false;
        
        for (uint i = 0; i < members.length; i++) {
            if (balances[members[i]] > 0 && !hasApproved[members[i]]) {
                return false;
            }
        }
        return true;
    }

    function _calculateTotalOwed() internal view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < members.length; i++) {
            if (balances[members[i]] < 0) {
                total += uint256(-balances[members[i]]);
            }
        }
        return total;
    }
}
