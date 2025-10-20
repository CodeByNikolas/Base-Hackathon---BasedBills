import { base, baseSepolia } from 'wagmi/chains';

// Network configuration - easily switch between networks
export const NETWORK_CONFIG = {
  // Change this to switch networks
  TARGET_CHAIN_ID: baseSepolia.id, // Use base.id for mainnet, baseSepolia.id for testnet

  // Chain configurations
  CHAINS: {
    [base.id]: {
      name: 'Base',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
    },
    [baseSepolia.id]: {
      name: 'Base Sepolia',
      usdc: '0x1253ceb0a7b27b002c59ad2240fb6a884fdb2b37', // MockUSDC for testing
    },
  },

  // Contract addresses for current deployment
  CONTRACTS: {
    [baseSepolia.id]: {
      groupFactory: '0x42238a47f2ab7508296c009a0b672770474debe0',
      registry: '0x97d4e2631aa14c141ebe703efbc00f789329822a',
      groupLogic: '0x9ebb981e56c90db163bc06ceac0fbb1558956e7f',
      usdc: '0x1253ceb0a7b27b002c59ad2240fb6a884fdb2b37',
    },
  },
} as const;

// Get contract addresses for the target network
function getContractAddressesForNetwork() {
  const contracts = NETWORK_CONFIG.CONTRACTS[NETWORK_CONFIG.TARGET_CHAIN_ID as keyof typeof NETWORK_CONFIG.CONTRACTS];

  if (!contracts) {
    throw new Error(`No contract addresses configured for chain ID: ${NETWORK_CONFIG.TARGET_CHAIN_ID}`);
  }

  return contracts;
}

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  [base.id]: {
    // Mainnet addresses (to be deployed later)
    groupFactory: '',
    registry: '',
    groupLogic: '',
    usdc: NETWORK_CONFIG.CHAINS[base.id].usdc,
  },
  [baseSepolia.id]: getContractAddressesForNetwork(),
} as const;

// Get contract addresses for current chain or target chain
export function getContractAddresses(chainId?: number) {
  // Use target chain if no chainId provided, otherwise use provided chainId
  const targetChainId = chainId || NETWORK_CONFIG.TARGET_CHAIN_ID;
  const addresses = CONTRACT_ADDRESSES[targetChainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${targetChainId}`);
  }
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
  return NETWORK_CONFIG.TARGET_CHAIN_ID === baseSepolia.id;
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
