// SPDX-License-Identifier: MIT
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
