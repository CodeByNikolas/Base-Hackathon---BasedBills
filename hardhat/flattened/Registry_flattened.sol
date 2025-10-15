[dotenv@17.2.3] injecting env (4) from ../.env -- tip: 🔄 add secrets lifecycle management: https://dotenvx.com/ops
// Sources flattened with hardhat v3.0.7 https://hardhat.org

// SPDX-License-Identifier: MIT

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

