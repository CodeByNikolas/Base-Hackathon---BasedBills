import { useAccount, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useMemo, useCallback } from 'react';
import { getContractAddresses } from '../config/contracts';

export interface NetworkValidationResult {
  isValid: boolean;
  currentNetwork: string;
  requiredNetwork: {
    id: number;
    name: string;
  };
  hasContracts: boolean;
  isCorrectNetwork: boolean;
  needsNetworkSwitch: boolean;
  error?: string;
}

export interface NetworkValidationActions {
  switchToRequiredNetwork: () => Promise<boolean>;
  switchToNetwork: (chainId: number) => Promise<boolean>;
}

/**
 * Hook for validating and managing network state
 * Ensures wallet is connected to a network with deployed contracts
 */
export function useNetworkValidation(): NetworkValidationResult & NetworkValidationActions {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  // Get all networks that have deployed contracts
  const supportedNetworks = useMemo(() => {
    const networks = [base, baseSepolia];
    return networks.filter(network => {
      try {
        const addresses = getContractAddresses(network.id);
        return addresses && addresses.registry && addresses.registry !== '' as `0x${string}`;
      } catch {
        return false;
      }
    });
  }, []);

  // Determine which network the user should be on based on current contracts config
  const requiredNetwork = useMemo(() => {
    return supportedNetworks.length > 0 ? supportedNetworks[0] : base; // Default to mainnet
  }, [supportedNetworks]);

  // Check if current network has valid contracts
  const hasContracts = useMemo(() => {
    if (!chainId) return false;
    try {
      const addresses = getContractAddresses(chainId);
      return addresses && addresses.registry && addresses.registry !== '' as `0x${string}`;
    } catch {
      return false;
    }
  }, [chainId]);

  // Check if user is on correct network
  const isCorrectNetwork = useMemo(() => {
    return chainId === requiredNetwork.id;
  }, [chainId, requiredNetwork.id]);

  // Main validation result
  const validationResult = useMemo((): NetworkValidationResult => {
    if (!isConnected) {
      return {
        isValid: false,
        currentNetwork: 'Not connected',
        requiredNetwork: requiredNetwork,
        hasContracts: false,
        isCorrectNetwork: false,
        needsNetworkSwitch: false,
        error: 'Please connect your wallet to continue'
      };
    }

    if (!chainId) {
      return {
        isValid: false,
        currentNetwork: 'Unknown',
        requiredNetwork: requiredNetwork,
        hasContracts: false,
        isCorrectNetwork: false,
        needsNetworkSwitch: true,
        error: 'Unable to detect current network'
      };
    }

    const currentNetworkName = chainId === base.id ? 'Base Mainnet' :
                              chainId === baseSepolia.id ? 'Base Sepolia' : `Chain ${chainId}`;

    if (!hasContracts) {
      return {
        isValid: false,
        currentNetwork: currentNetworkName,
        requiredNetwork: requiredNetwork,
        hasContracts: false,
        isCorrectNetwork: false,
        needsNetworkSwitch: true,
        error: `No contracts deployed on ${currentNetworkName}. Please switch to ${requiredNetwork.name}.`
      };
    }

    if (!isCorrectNetwork) {
      return {
        isValid: false,
        currentNetwork: currentNetworkName,
        requiredNetwork: requiredNetwork,
        hasContracts: true,
        isCorrectNetwork: false,
        needsNetworkSwitch: true,
        error: `Please switch to ${requiredNetwork.name} to use this application.`
      };
    }

    return {
      isValid: true,
      currentNetwork: currentNetworkName,
      requiredNetwork: requiredNetwork,
      hasContracts: true,
      isCorrectNetwork: true,
      needsNetworkSwitch: false
    };
  }, [isConnected, chainId, hasContracts, isCorrectNetwork, requiredNetwork]);

  // Switch to the required network
  const switchToRequiredNetwork = useCallback(async (): Promise<boolean> => {
    try {
      await switchChainAsync({ chainId: requiredNetwork.id });
      return true;
    } catch (error) {
      console.error('Failed to switch to required network:', error);
      return false;
    }
  }, [switchChainAsync, requiredNetwork.id]);

  // Switch to any supported network
  const switchToNetwork = useCallback(async (targetChainId: number): Promise<boolean> => {
    try {
      await switchChainAsync({ chainId: targetChainId });
      return true;
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    }
  }, [switchChainAsync]);

  return {
    ...validationResult,
    switchToRequiredNetwork,
    switchToNetwork
  };
}

/**
 * Hook for checking if wallet is ready for blockchain interactions
 * Returns true if wallet is connected and on correct network with contracts
 */
export function useWalletReady(): boolean {
  const { isConnected } = useAccount();
  const validation = useNetworkValidation();
  return validation.isValid && isConnected;
}
