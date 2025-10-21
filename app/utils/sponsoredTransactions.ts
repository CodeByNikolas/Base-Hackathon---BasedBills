// Sponsored Transaction Configuration
// This file contains constants and utilities for implementing gasless transactions using Base Paymaster

import { getContractAddresses } from '../config/contracts';

// Paymaster configuration
export const PAYMASTER_CONFIG = {
  // Paymaster endpoint URL from environment variables
  PAYMASTER_URL: process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT,

  // Fallback to regular transactions if paymaster is not available
  ENABLE_SPONSORED_TRANSACTIONS: !!process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT,

  // Maximum retry attempts for sponsored transactions
  MAX_RETRY_ATTEMPTS: 3,

  // Timeout for sponsored transaction confirmation (in milliseconds)
  TRANSACTION_TIMEOUT: 30000,
} as const;

// Debug logging for environment variables (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Environment Variables Debug:', {
    hasOnchainKitKey: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    hasPaymasterEndpoint: !!process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT,
    paymasterEndpoint: process.env.NEXT_PUBLIC_PAYMASTER_ENDPOINT,
    nodeEnv: process.env.NODE_ENV,
    isClient: typeof window !== 'undefined',
  });
}

// Contract functions that should be sponsored
export const SPONSORED_FUNCTIONS = {
  // Group contract functions
  GROUP: {
    addBill: 'addBill',
    addCustomBill: 'addCustomBill',
    approveSettlement: 'approveSettlement',
    fundSettlement: 'fundSettlement',
    proposeGamble: 'proposeGamble',
    voteOnGamble: 'voteOnGamble',
    addMember: 'addMember',
    updateGroupName: 'updateGroupName',
  },

  // GroupFactory contract functions
  GROUP_FACTORY: {
    createGroup: 'createGroup',
  },

  // USDC contract functions (for approvals)
  USDC: {
    approve: 'approve',
  },
} as const;

// Union type of all possible sponsored function names
export type SponsoredFunctionName =
  | 'addBill'
  | 'addCustomBill'
  | 'approveSettlement'
  | 'fundSettlement'
  | 'proposeGamble'
  | 'voteOnGamble'
  | 'addMember'
  | 'updateGroupName'
  | 'createGroup'
  | 'approve';

// Get contract addresses for sponsored transactions
export function getSponsoredContractAddresses(chainId?: number) {
  return getContractAddresses(chainId);
}

// Check if a function should be sponsored
export function shouldSponsorFunction(contractType: keyof typeof SPONSORED_FUNCTIONS, functionName: SponsoredFunctionName): boolean {
  if (!PAYMASTER_CONFIG.ENABLE_SPONSORED_TRANSACTIONS) {
    return false;
  }

  const sponsoredFunctions = SPONSORED_FUNCTIONS[contractType];
  return (Object.values(sponsoredFunctions) as readonly SponsoredFunctionName[]).includes(functionName);
}

// Error messages for sponsored transactions
export const SPONSORED_TRANSACTION_ERRORS = {
  PAYMASTER_NOT_CONFIGURED: 'Paymaster is not configured. Falling back to regular transaction.',
  SMART_WALLET_REQUIRED: 'Sponsored transactions require a Smart Wallet. Please connect with Coinbase Smart Wallet.',
  TRANSACTION_FAILED: 'Sponsored transaction failed. Falling back to regular transaction.',
  NETWORK_NOT_SUPPORTED: 'Sponsored transactions are not supported on this network.',
  INSUFFICIENT_ALLOWANCE: 'Contract not allowlisted for sponsored transactions.',
} as const;

// Success messages
export const SPONSORED_TRANSACTION_SUCCESS = {
  TRANSACTION_SPONSORED: 'Transaction sponsored successfully! No gas fees required.',
  FALLBACK_SUCCESS: 'Transaction completed using regular gas payment.',
} as const;

// Utility function to format paymaster capabilities
export function getPaymasterCapabilities(paymasterUrl?: string) {
  if (!paymasterUrl || !PAYMASTER_CONFIG.ENABLE_SPONSORED_TRANSACTIONS) {
    return undefined;
  }
  
  return {
    paymasterService: {
      url: paymasterUrl,
    },
  };
}

// Check if the current environment supports sponsored transactions
export function isSponsoredTransactionSupported(): boolean {
  return PAYMASTER_CONFIG.ENABLE_SPONSORED_TRANSACTIONS && !!PAYMASTER_CONFIG.PAYMASTER_URL;
}

// Log sponsored transaction events for debugging
export function logSponsoredTransaction(event: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Sponsored Transaction] ${event}`, data);
  }
}
