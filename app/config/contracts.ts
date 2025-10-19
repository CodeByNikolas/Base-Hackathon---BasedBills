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
      usdc: '0x9524c95e71b59a235e1efe8bd78149d1ac68f4ca', // MockUSDC for testing
    },
  },

  // Contract addresses for current deployment
  CONTRACTS: {
    [baseSepolia.id]: {
      groupFactory: '0x55edcbc218b7b6490685818f5621f441e1144ee4',
      registry: '0xc1c32631f9aa52e8d51bbf4aa1726370529a1a74',
      groupLogic: '0xfe9f9e4dc2408eb226ff90febb7f871f4e8e8f79',
      usdc: '0x9524c95e71b59a235e1efe8bd78149d1ac68f4ca',
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
