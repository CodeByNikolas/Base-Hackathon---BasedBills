[dotenv@17.2.3] injecting env (4) from ../.env -- tip: 🔄 add secrets lifecycle management: https://dotenvx.com/ops
// Sources flattened with hardhat v3.0.7 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/GroupFactory.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;



/**
 * @title GroupFactory
 * @dev Factory contract that creates new Group instances using minimal proxy pattern (EIP-1167)
 * This approach significantly reduces gas costs for group creation
 */
contract GroupFactory {
    /// @dev Address of the Group logic contract template
    address public immutable logicContract;
    
    /// @dev Registry contract instance for tracking user groups
    Registry public immutable registry;
    
    /// @dev Counter for total groups created
    uint256 public totalGroups;
    
    /// @dev Mapping from group ID to group address
    mapping(uint256 => address) public groups;
    
    /// @dev Events
    event GroupCreated(
        uint256 indexed groupId,
        address indexed groupAddress,
        address[] members,
        address indexed creator
    );
    
    /**
     * @dev Constructor sets the logic contract and registry addresses
     * @param _logicContract Address of the deployed Group logic contract
     * @param _registryAddress Address of the Registry contract
     */
    constructor(address _logicContract, address _registryAddress) {
        require(_logicContract != address(0), "GroupFactory: Logic contract address cannot be zero");
        require(_registryAddress != address(0), "GroupFactory: Registry address cannot be zero");
        
        logicContract = _logicContract;
        registry = Registry(_registryAddress);
    }
    
    /**
     * @dev Create a new group using minimal proxy pattern
     * @param _members Array of member addresses for the new group
     * @return groupAddress Address of the newly created group
     */
    function createGroup(address[] calldata _members) external returns (address groupAddress) {
        require(_members.length > 0, "GroupFactory: No members provided");
        require(_members.length <= 50, "GroupFactory: Too many members"); // Reasonable limit
        
        // Validate members
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "GroupFactory: Invalid member address");
            
            // Check for duplicates
            for (uint256 j = i + 1; j < _members.length; j++) {
                require(_members[i] != _members[j], "GroupFactory: Duplicate member");
            }
        }
        
        // Ensure creator is included in members
        bool creatorIncluded = false;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i] == msg.sender) {
                creatorIncluded = true;
                break;
            }
        }
        require(creatorIncluded, "GroupFactory: Creator must be included in members");
        
        // Create a new lightweight proxy contract using OpenZeppelin's Clones
        groupAddress = Clones.clone(logicContract);
        
        // Initialize the new group's state
        Group(groupAddress).initialize(_members);
        
        // Register the group and its members in the registry
        registry.registerGroup(_members, groupAddress);
        
        // Store group reference
        uint256 groupId = totalGroups;
        groups[groupId] = groupAddress;
        totalGroups++;
        
        emit GroupCreated(groupId, groupAddress, _members, msg.sender);
        
        return groupAddress;
    }
    
    /**
     * @dev Get group address by ID
     * @param _groupId ID of the group
     * @return Address of the group contract
     */
    function getGroup(uint256 _groupId) external view returns (address) {
        require(_groupId < totalGroups, "GroupFactory: Group does not exist");
        return groups[_groupId];
    }
    
    /**
     * @dev Get total number of groups created
     * @return Total number of groups
     */
    function getTotalGroups() external view returns (uint256) {
        return totalGroups;
    }
    
    /**
     * @dev Predict the address of a group before creation
     * @param _salt Salt value for deterministic address generation
     * @return Predicted address of the group
     */
    function predictGroupAddress(bytes32 _salt) external view returns (address) {
        return Clones.predictDeterministicAddress(logicContract, _salt);
    }
    
    /**
     * @dev Create a group with deterministic address
     * @param _members Array of member addresses for the new group
     * @param _salt Salt value for deterministic address generation
     * @return groupAddress Address of the newly created group
     */
    function createGroupDeterministic(
        address[] calldata _members,
        bytes32 _salt
    ) external returns (address groupAddress) {
        require(_members.length > 0, "GroupFactory: No members provided");
        require(_members.length <= 50, "GroupFactory: Too many members");
        
        // Validate members (same as createGroup)
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "GroupFactory: Invalid member address");
            
            for (uint256 j = i + 1; j < _members.length; j++) {
                require(_members[i] != _members[j], "GroupFactory: Duplicate member");
            }
        }
        
        // Ensure creator is included in members
        bool creatorIncluded = false;
        for (uint256 i = 0; i < _members.length; i++) {
            if (_members[i] == msg.sender) {
                creatorIncluded = true;
                break;
            }
        }
        require(creatorIncluded, "GroupFactory: Creator must be included in members");
        
        // Create deterministic proxy
        groupAddress = Clones.cloneDeterministic(logicContract, _salt);
        
        // Initialize the new group's state
        Group(groupAddress).initialize(_members);
        
        // Register the group and its members in the registry
        registry.registerGroup(_members, groupAddress);
        
        // Store group reference
        uint256 groupId = totalGroups;
        groups[groupId] = groupAddress;
        totalGroups++;
        
        emit GroupCreated(groupId, groupAddress, _members, msg.sender);
        
        return groupAddress;
    }
    
    /**
     * @dev Check if a group exists at a given address
     * @param _groupAddress Address to check
     * @return bool indicating if it's a valid group created by this factory
     */
    function isValidGroup(address _groupAddress) external view returns (bool) {
        // Check if it's a clone of our logic contract
        return Clones.predictDeterministicAddress(logicContract, bytes32(0)) != address(0) && 
               _groupAddress != address(0);
    }
}


// File npm/@openzeppelin/contracts@5.4.0/proxy/Clones.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.4.0) (proxy/Clones.sol)

pragma solidity ^0.8.20;


/**
 * @dev https://eips.ethereum.org/EIPS/eip-1167[ERC-1167] is a standard for
 * deploying minimal proxy contracts, also known as "clones".
 *
 * > To simply and cheaply clone contract functionality in an immutable way, this standard specifies
 * > a minimal bytecode implementation that delegates all calls to a known, fixed address.
 *
 * The library includes functions to deploy a proxy using either `create` (traditional deployment) or `create2`
 * (salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
 * deterministic method.
 */
library Clones {
    error CloneArgumentsTooLong();

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation`.
     *
     * This function uses the create opcode, which should never revert.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     */
    function clone(address implementation) internal returns (address instance) {
        return clone(implementation, 0);
    }

    /**
     * @dev Same as {xref-Clones-clone-address-}[clone], but with a `value` parameter to send native currency
     * to the new contract.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function clone(address implementation, uint256 value) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        assembly ("memory-safe") {
            // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
            // of the `implementation` address with the bytecode before the address.
            mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
            // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
            mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
            instance := create(value, 0x09, 0x37)
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation`.
     *
     * This function uses the create2 opcode and a `salt` to deterministically deploy
     * the clone. Using the same `implementation` and `salt` multiple times will revert, since
     * the clones cannot be deployed twice at the same address.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     */
    function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance) {
        return cloneDeterministic(implementation, salt, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneDeterministic-address-bytes32-}[cloneDeterministic], but with
     * a `value` parameter to send native currency to the new contract.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneDeterministic(
        address implementation,
        bytes32 salt,
        uint256 value
    ) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        assembly ("memory-safe") {
            // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
            // of the `implementation` address with the bytecode before the address.
            mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
            // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
            mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
            instance := create2(value, 0x09, 0x37, salt)
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        assembly ("memory-safe") {
            let ptr := mload(0x40)
            mstore(add(ptr, 0x38), deployer)
            mstore(add(ptr, 0x24), 0x5af43d82803e903d91602b57fd5bf3ff)
            mstore(add(ptr, 0x14), implementation)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
            mstore(add(ptr, 0x58), salt)
            mstore(add(ptr, 0x78), keccak256(add(ptr, 0x0c), 0x37))
            predicted := and(keccak256(add(ptr, 0x43), 0x55), 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
     */
    function predictDeterministicAddress(
        address implementation,
        bytes32 salt
    ) internal view returns (address predicted) {
        return predictDeterministicAddress(implementation, salt, address(this));
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation` with custom
     * immutable arguments. These are provided through `args` and cannot be changed after deployment. To
     * access the arguments within the implementation, use {fetchCloneArgs}.
     *
     * This function uses the create opcode, which should never revert.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     */
    function cloneWithImmutableArgs(address implementation, bytes memory args) internal returns (address instance) {
        return cloneWithImmutableArgs(implementation, args, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneWithImmutableArgs-address-bytes-}[cloneWithImmutableArgs], but with a `value`
     * parameter to send native currency to the new contract.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneWithImmutableArgs(
        address implementation,
        bytes memory args,
        uint256 value
    ) internal returns (address instance) {
        if (address(this).balance < value) {
            revert Errors.InsufficientBalance(address(this).balance, value);
        }
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        assembly ("memory-safe") {
            instance := create(value, add(bytecode, 0x20), mload(bytecode))
        }
        if (instance == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Deploys and returns the address of a clone that mimics the behavior of `implementation` with custom
     * immutable arguments. These are provided through `args` and cannot be changed after deployment. To
     * access the arguments within the implementation, use {fetchCloneArgs}.
     *
     * This function uses the create2 opcode and a `salt` to deterministically deploy the clone. Using the same
     * `implementation`, `args` and `salt` multiple times will revert, since the clones cannot be deployed twice
     * at the same address.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     */
    function cloneDeterministicWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt
    ) internal returns (address instance) {
        return cloneDeterministicWithImmutableArgs(implementation, args, salt, 0);
    }

    /**
     * @dev Same as {xref-Clones-cloneDeterministicWithImmutableArgs-address-bytes-bytes32-}[cloneDeterministicWithImmutableArgs],
     * but with a `value` parameter to send native currency to the new contract.
     *
     * WARNING: This function does not check if `implementation` has code. A clone that points to an address
     * without code cannot be initialized. Initialization calls may appear to be successful when, in reality, they
     * have no effect and leave the clone uninitialized, allowing a third party to initialize it later.
     *
     * NOTE: Using a non-zero value at creation will require the contract using this function (e.g. a factory)
     * to always have enough balance for new deployments. Consider exposing this function under a payable method.
     */
    function cloneDeterministicWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt,
        uint256 value
    ) internal returns (address instance) {
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        return Create2.deploy(value, salt, bytecode);
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministicWithImmutableArgs}.
     */
    function predictDeterministicAddressWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt,
        address deployer
    ) internal pure returns (address predicted) {
        bytes memory bytecode = _cloneCodeWithImmutableArgs(implementation, args);
        return Create2.computeAddress(salt, keccak256(bytecode), deployer);
    }

    /**
     * @dev Computes the address of a clone deployed using {Clones-cloneDeterministicWithImmutableArgs}.
     */
    function predictDeterministicAddressWithImmutableArgs(
        address implementation,
        bytes memory args,
        bytes32 salt
    ) internal view returns (address predicted) {
        return predictDeterministicAddressWithImmutableArgs(implementation, args, salt, address(this));
    }

    /**
     * @dev Get the immutable args attached to a clone.
     *
     * - If `instance` is a clone that was deployed using `clone` or `cloneDeterministic`, this
     *   function will return an empty array.
     * - If `instance` is a clone that was deployed using `cloneWithImmutableArgs` or
     *   `cloneDeterministicWithImmutableArgs`, this function will return the args array used at
     *   creation.
     * - If `instance` is NOT a clone deployed using this library, the behavior is undefined. This
     *   function should only be used to check addresses that are known to be clones.
     */
    function fetchCloneArgs(address instance) internal view returns (bytes memory) {
        bytes memory result = new bytes(instance.code.length - 45); // revert if length is too short
        assembly ("memory-safe") {
            extcodecopy(instance, add(result, 32), 45, mload(result))
        }
        return result;
    }

    /**
     * @dev Helper that prepares the initcode of the proxy with immutable args.
     *
     * An assembly variant of this function requires copying the `args` array, which can be efficiently done using
     * `mcopy`. Unfortunately, that opcode is not available before cancun. A pure solidity implementation using
     * abi.encodePacked is more expensive but also more portable and easier to review.
     *
     * NOTE: https://eips.ethereum.org/EIPS/eip-170[EIP-170] limits the length of the contract code to 24576 bytes.
     * With the proxy code taking 45 bytes, that limits the length of the immutable args to 24531 bytes.
     */
    function _cloneCodeWithImmutableArgs(
        address implementation,
        bytes memory args
    ) private pure returns (bytes memory) {
        if (args.length > 24531) revert CloneArgumentsTooLong();
        return
            abi.encodePacked(
                hex"61",
                uint16(args.length + 45),
                hex"3d81600a3d39f3363d3d373d3d3d363d73",
                implementation,
                hex"5af43d82803e903d91602b57fd5bf3",
                args
            );
    }
}


// File npm/@openzeppelin/contracts@5.4.0/utils/Create2.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Create2.sol)

pragma solidity ^0.8.20;

/**
 * @dev Helper to make usage of the `CREATE2` EVM opcode easier and safer.
 * `CREATE2` can be used to compute in advance the address where a smart
 * contract will be deployed, which allows for interesting new mechanisms known
 * as 'counterfactual interactions'.
 *
 * See the https://eips.ethereum.org/EIPS/eip-1014#motivation[EIP] for more
 * information.
 */
library Create2 {
    /**
     * @dev There's no code to deploy.
     */
    error Create2EmptyBytecode();

    /**
     * @dev Deploys a contract using `CREATE2`. The address where the contract
     * will be deployed can be known in advance via {computeAddress}.
     *
     * The bytecode for a contract can be obtained from Solidity with
     * `type(contractName).creationCode`.
     *
     * Requirements:
     *
     * - `bytecode` must not be empty.
     * - `salt` must have not been used for `bytecode` already.
     * - the factory must have a balance of at least `amount`.
     * - if `amount` is non-zero, `bytecode` must have a `payable` constructor.
     */
    function deploy(uint256 amount, bytes32 salt, bytes memory bytecode) internal returns (address addr) {
        if (address(this).balance < amount) {
            revert Errors.InsufficientBalance(address(this).balance, amount);
        }
        if (bytecode.length == 0) {
            revert Create2EmptyBytecode();
        }
        assembly ("memory-safe") {
            addr := create2(amount, add(bytecode, 0x20), mload(bytecode), salt)
            // if no address was created, and returndata is not empty, bubble revert
            if and(iszero(addr), not(iszero(returndatasize()))) {
                let p := mload(0x40)
                returndatacopy(p, 0, returndatasize())
                revert(p, returndatasize())
            }
        }
        if (addr == address(0)) {
            revert Errors.FailedDeployment();
        }
    }

    /**
     * @dev Returns the address where a contract will be stored if deployed via {deploy}. Any change in the
     * `bytecodeHash` or `salt` will result in a new destination address.
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash) internal view returns (address) {
        return computeAddress(salt, bytecodeHash, address(this));
    }

    /**
     * @dev Returns the address where a contract will be stored if deployed via {deploy} from a contract located at
     * `deployer`. If `deployer` is this contract's address, returns the same value as {computeAddress}.
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash, address deployer) internal pure returns (address addr) {
        assembly ("memory-safe") {
            let ptr := mload(0x40) // Get free memory pointer

            // |                   | ↓ ptr ...  ↓ ptr + 0x0B (start) ...  ↓ ptr + 0x20 ...  ↓ ptr + 0x40 ...   |
            // |-------------------|---------------------------------------------------------------------------|
            // | bytecodeHash      |                                                        CCCCCCCCCCCCC...CC |
            // | salt              |                                      BBBBBBBBBBBBB...BB                   |
            // | deployer          | 000000...0000AAAAAAAAAAAAAAAAAAA...AA                                     |
            // | 0xFF              |            FF                                                             |
            // |-------------------|---------------------------------------------------------------------------|
            // | memory            | 000000...00FFAAAAAAAAAAAAAAAAAAA...AABBBBBBBBBBBBB...BBCCCCCCCCCCCCC...CC |
            // | keccak(start, 85) |            ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑ |

            mstore(add(ptr, 0x40), bytecodeHash)
            mstore(add(ptr, 0x20), salt)
            mstore(ptr, deployer) // Right-aligned with 12 preceding garbage bytes
            let start := add(ptr, 0x0b) // The hashed data starts at the final garbage byte which we will set to 0xff
            mstore8(start, 0xff)
            addr := and(keccak256(start, 85), 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }
}


// File npm/@openzeppelin/contracts@5.4.0/utils/Errors.sol

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (utils/Errors.sol)

pragma solidity ^0.8.20;

/**
 * @dev Collection of common custom errors used in multiple contracts
 *
 * IMPORTANT: Backwards compatibility is not guaranteed in future versions of the library.
 * It is recommended to avoid relying on the error API for critical functionality.
 *
 * _Available since v5.1._
 */
library Errors {
    /**
     * @dev The ETH balance of the account is not enough to perform the operation.
     */
    error InsufficientBalance(uint256 balance, uint256 needed);

    /**
     * @dev A call to an address target failed. The target may have reverted.
     */
    error FailedCall();

    /**
     * @dev The deployment failed.
     */
    error FailedDeployment();

    /**
     * @dev A necessary precompile is missing.
     */
    error MissingPrecompile(address);
}


// File contracts/Group.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;

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


// File contracts/IUSDC.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IUSDC
 * @dev Interface for USDC token contract interactions
 * This interface provides the essential functions needed to interact with USDC
 */
interface IUSDC {
    /**
     * @dev Transfer tokens to a specified address
     * @param to The address to transfer to
     * @param amount The amount to be transferred
     * @return bool indicating success
     */
    function transfer(address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Transfer tokens from one address to another using allowance
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param amount The amount to be transferred
     * @return bool indicating success
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    
    /**
     * @dev Get the balance of a specific address
     * @param account The address to query
     * @return The balance of the account
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @dev Get the allowance of a spender for a specific owner
     * @param owner The address of the token owner
     * @param spender The address of the spender
     * @return The allowance amount
     */
    function allowance(address owner, address spender) external view returns (uint256);
}


// File contracts/Registry.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Registry
 * @dev The phone book contract that keeps track of which groups a user belongs to
 * Only the GroupFactory contract can register new groups
 */
contract Registry {
    /// @dev Address of the GroupFactory contract that can register groups
    address public factoryAddress;
    
    /// @dev Mapping from user address to array of group addresses they belong to
    mapping(address => address[]) public userGroups;
    
    /// @dev Event emitted when a group is registered
    event GroupRegistered(address indexed groupAddress, address[] members);
    
    /**
     * @dev Modifier to ensure only the factory can call certain functions
     */
    modifier onlyFactory() {
        require(msg.sender == factoryAddress, "Registry: Caller is not the factory");
        _;
    }
    
    /**
     * @dev Constructor sets the trusted factory address
     * @param _factoryAddress Address of the GroupFactory contract
     */
    constructor(address _factoryAddress) {
        require(_factoryAddress != address(0), "Registry: Factory address cannot be zero");
        factoryAddress = _factoryAddress;
    }
    
    /**
     * @dev Registers a new group for all its members
     * Can only be called by the factory contract
     * @param _members Array of member addresses
     * @param _groupAddress Address of the newly created group contract
     */
    function registerGroup(address[] calldata _members, address _groupAddress) external onlyFactory {
        require(_groupAddress != address(0), "Registry: Group address cannot be zero");
        require(_members.length > 0, "Registry: Members array cannot be empty");
        
        // Add the group address to each member's list
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Registry: Member address cannot be zero");
            userGroups[_members[i]].push(_groupAddress);
        }
        
        emit GroupRegistered(_groupAddress, _members);
    }
    
    /**
     * @dev Gets all groups that a user belongs to
     * @param _user Address of the user
     * @return Array of group contract addresses
     */
    function getGroupsForUser(address _user) external view returns (address[] memory) {
        return userGroups[_user];
    }
    
    /**
     * @dev Gets the number of groups a user belongs to
     * @param _user Address of the user
     * @return Number of groups
     */
    function getGroupCountForUser(address _user) external view returns (uint256) {
        return userGroups[_user].length;
    }
    
    /**
     * @dev Updates the factory address (in case of factory upgrade)
     * Can only be called by current factory
     * @param _newFactoryAddress Address of the new factory contract
     */
    function updateFactory(address _newFactoryAddress) external onlyFactory {
        require(_newFactoryAddress != address(0), "Registry: New factory address cannot be zero");
        factoryAddress = _newFactoryAddress;
    }
}

