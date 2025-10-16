import { base, baseSepolia } from 'wagmi/chains';

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [base.id]: {
    // Mainnet addresses (to be deployed later)
    groupFactory: '',
    registry: '',
    groupLogic: '',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  },
  [baseSepolia.id]: {
    // Testnet addresses (updated with group name support)
    groupFactory: '0xffd6df1076a30891d662068a61aa0baae63fb1bf',
    registry: '0x6b30775dd78d0492077666708a7e2e6f8582e527',
    groupLogic: '0xe9dc0cb521cc4c45d9f0e8c881be2a2f5041ed6c',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
  },
} as const;

// Get contract addresses for current chain
export function getContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses;
}

// Import contract ABIs from separate files for better organization
import { GROUP_FACTORY_ABI, REGISTRY_ABI, GROUP_ABI, USDC_ABI } from './abis';

// Export ABIs for backward compatibility
export { GROUP_FACTORY_ABI, REGISTRY_ABI, GROUP_ABI, USDC_ABI };

// Network configuration
export const SUPPORTED_CHAINS = [base, baseSepolia];
export const DEFAULT_CHAIN = baseSepolia; // Use testnet for development

// Block explorer URLs
export const BLOCK_EXPLORER_URLS = {
  [base.id]: 'https://basescan.org',
  [baseSepolia.id]: 'https://sepolia.basescan.org',
} as const;

export function getBlockExplorerUrl(chainId: number) {
  return BLOCK_EXPLORER_URLS[chainId as keyof typeof BLOCK_EXPLORER_URLS] || '';
}
