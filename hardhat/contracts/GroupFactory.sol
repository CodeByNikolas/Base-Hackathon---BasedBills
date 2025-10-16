// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Registry.sol";
import "./Group.sol";

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
        string groupName,
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
     * @param _groupName Name for the new group
     * @return groupAddress Address of the newly created group
     */
    function createGroup(address[] calldata _members, string calldata _groupName) external returns (address groupAddress) {
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
        Group(groupAddress).initialize(_members, _groupName);
        
        // Register the group and its members in the registry
        registry.registerGroup(_members, groupAddress);
        
        // Store group reference
        uint256 groupId = totalGroups;
        groups[groupId] = groupAddress;
        totalGroups++;
        
        emit GroupCreated(groupId, groupAddress, _members, _groupName, msg.sender);
        
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
        string calldata _groupName,
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
        Group(groupAddress).initialize(_members, _groupName);
        
        // Register the group and its members in the registry
        registry.registerGroup(_members, groupAddress);
        
        // Store group reference
        uint256 groupId = totalGroups;
        groups[groupId] = groupAddress;
        totalGroups++;
        
        emit GroupCreated(groupId, groupAddress, _members, _groupName, msg.sender);
        
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
