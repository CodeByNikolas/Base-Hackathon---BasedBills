import { base, baseSepolia } from 'wagmi/chains';

// Chain configurations
const CHAINS = {
  [base.id]: {
    name: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
  },
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    usdc: '0x97191494e97a71a2366e459f49e2c15b61fb4055', // New MockUSDC with mintForTest function
  },
} as const;

// Contract addresses for current deployment
const CONTRACTS = {
  [baseSepolia.id]: {
    groupFactory: '0x759dead21af026b4718635bee60487f3a71d25f9',
    registry: '0x071164b35b896bc429d5f518c498695ffc69fe10',
    groupLogic: '0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa',
    usdc: '0x97191494e97a71a2366e459f49e2c15b61fb4055', // New MockUSDC with mintForTest function
  },
  [base.id]: {
    // Mainnet addresses - deployed and verified
    groupFactory: '0x97191494e97a71a2366e459f49e2c15b61fb4055',
    registry: '0x071164b35b896bc429d5f518c498695ffc69fe10',
    groupLogic: '0xb2a71877fbd3ea1a21ae894c7299b6f0b625a8aa',
    usdc: CHAINS[base.id].usdc,
  },
} as const;

// Network configuration - easily switch between networks
export const NETWORK_CONFIG = {
  // Change this to switch networks
  TARGET_CHAIN_ID: baseSepolia.id, // Use base.id for mainnet, baseSepolia.id for testnet

  // Chain configurations
  CHAINS,

  // Contract addresses for current deployment
  CONTRACTS,
} as const;

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [base.id]: NETWORK_CONFIG.CONTRACTS[base.id] || {
    groupFactory: '',
    registry: '',
    groupLogic: '',
    usdc: NETWORK_CONFIG.CHAINS[base.id].usdc,
  },
  [baseSepolia.id]: NETWORK_CONFIG.CONTRACTS[baseSepolia.id] || {
    groupFactory: '',
    registry: '',
    groupLogic: '',
    usdc: NETWORK_CONFIG.CHAINS[baseSepolia.id].usdc,
  },
} as const;

// Get contract addresses for current chain or target chain
export function getContractAddresses(chainId?: number) {
  // Use provided chainId if available, otherwise use target chain
  const targetChainId = chainId || NETWORK_CONFIG.TARGET_CHAIN_ID;
  const addresses = CONTRACT_ADDRESSES[targetChainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${targetChainId}`);
  }
  console.log(`🔗 Loading contract addresses for chain ${targetChainId}:`, addresses);
  return addresses;
}

// Get the target chain ID
export function getTargetChainId() {
  return NETWORK_CONFIG.TARGET_CHAIN_ID;
}

// Get the target chain configuration
export function getTargetChain() {
  return NETWORK_CONFIG.CHAINS[NETWORK_CONFIG.TARGET_CHAIN_ID];
}

// Check if we're on testnet
export function isTestnet() {
  return NETWORK_CONFIG.TARGET_CHAIN_ID === (baseSepolia.id as number);
}

// Import contract ABIs from separate files for better organization
import { GROUP_FACTORY_ABI, REGISTRY_ABI, GROUP_ABI, USDC_ABI } from './abis';

// Export ABIs for backward compatibility
export { GROUP_FACTORY_ABI, REGISTRY_ABI, GROUP_ABI, USDC_ABI };

// Network configuration
export const SUPPORTED_CHAINS = [base, baseSepolia];
export const DEFAULT_CHAIN = baseSepolia; // Use testnet for development with MockUSDC

// Block explorer URLs
export const BLOCK_EXPLORER_URLS = {
  [base.id]: 'https://basescan.org',
  [baseSepolia.id]: 'https://sepolia.basescan.org',
} as const;

export function getBlockExplorerUrl(chainId: number) {
  return BLOCK_EXPLORER_URLS[chainId as keyof typeof BLOCK_EXPLORER_URLS] || '';
}
