import { useCallback, useState } from 'react';
import { useAccount, useWriteContract, useSwitchChain } from 'wagmi';
import { useSendCalls } from 'wagmi/experimental';
import { encodeFunctionData, Abi } from 'viem';
import { base, baseSepolia } from 'wagmi/chains';
import { 
  PAYMASTER_CONFIG, 
  getPaymasterCapabilities, 
  isSponsoredTransactionSupported,
  logSponsoredTransaction,
  SPONSORED_TRANSACTION_ERRORS,
  SPONSORED_TRANSACTION_SUCCESS
} from '../utils/sponsoredTransactions';

export interface SponsoredTransactionParams {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}

export interface SponsoredTransactionResult {
  hash?: `0x${string}`;
  isSponsored: boolean;
  error?: string;
}

export interface SponsoredTransactionState {
  isLoading: boolean;
  error: string | null;
  isSponsored: boolean;
}

/**
 * Debug hook to check wallet and connection status
 */
export function useWalletDebug() {
  const { address, chainId, connector, isConnected } = useAccount();

  console.log('Wallet Debug Info:', {
    address,
    chainId,
    connectorName: connector?.name,
    isConnected,
    connectorId: connector?.id,
  });

  return {
    address,
    chainId,
    connectorName: connector?.name,
    isConnected,
  };
}

/**
 * Custom hook for handling sponsored transactions with fallback to regular transactions
 * This hook attempts to use sponsored transactions first, and falls back to regular transactions if needed
 */
export function useSponsoredTransactions() {
  const { address: userAddress, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendCallsAsync } = useSendCalls();
  const { switchChainAsync } = useSwitchChain();
  
  const [state, setState] = useState<SponsoredTransactionState>({
    isLoading: false,
    error: null,
    isSponsored: false,
  });

  /**
   * Check if the current chain supports sponsored transactions
   */
  const isChainSupported = useCallback((targetChainId?: number) => {
    const targetChain = targetChainId || chainId;
    return targetChain === base.id || targetChain === baseSepolia.id;
  }, [chainId]);


  /**
   * Switch to a supported chain if needed
   */
  const ensureSupportedChain = useCallback(async (targetChainId?: number) => {
    if (!targetChainId) return true;
    
    if (chainId !== targetChainId) {
      try {
        await switchChainAsync({ chainId: targetChainId });
        return true;
      } catch (error) {
        logSponsoredTransaction('Chain switch failed', error);
        return false;
      }
    }
    return true;
  }, [chainId, switchChainAsync]);

  /**
   * Attempt to send a sponsored transaction
   */
  const sendSponsoredTransaction = useCallback(async (
    params: SponsoredTransactionParams
  ): Promise<SponsoredTransactionResult> => {
    if (!userAddress) {
      throw new Error('User address not available');
    }

    if (!isSponsoredTransactionSupported()) {
      logSponsoredTransaction('Paymaster not configured, using regular transaction');
      throw new Error(SPONSORED_TRANSACTION_ERRORS.PAYMASTER_NOT_CONFIGURED);
    }

    try {
      logSponsoredTransaction('Attempting sponsored transaction', params);

      // Encode the function call
      const data = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
      });

      // Prepare the call with paymaster capabilities
      const capabilities = getPaymasterCapabilities(PAYMASTER_CONFIG.PAYMASTER_URL);
      
      if (!capabilities) {
        throw new Error(SPONSORED_TRANSACTION_ERRORS.PAYMASTER_NOT_CONFIGURED);
      }

      // Send the sponsored transaction
      const callId = await sendCallsAsync({
        calls: [
          {
            to: params.address,
            data,
            value: params.value || 0n,
          },
        ],
        capabilities,
      });

      logSponsoredTransaction('Sponsored transaction successful', { callId });
      
      // Note: useSendCalls returns a call ID, not a transaction hash
      // The actual transaction hash would be available through useCallsStatus
      return {
        hash: (callId as unknown) as `0x${string}`, // This is actually a call ID
        isSponsored: true,
      };
    } catch (error) {
      logSponsoredTransaction('Sponsored transaction failed', error);
      throw error;
    }
  }, [userAddress, sendCallsAsync]);

  /**
   * Send a regular (non-sponsored) transaction as fallback
   */
  const sendRegularTransaction = useCallback(async (
    params: SponsoredTransactionParams
  ): Promise<SponsoredTransactionResult> => {
    logSponsoredTransaction('Sending regular transaction', params);

    const hash = await writeContractAsync({
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      value: params.value,
    });

    logSponsoredTransaction('Regular transaction successful', { hash });

    return {
      hash,
      isSponsored: false,
    };
  }, [writeContractAsync]);

  /**
   * Main function to send a transaction (sponsored with fallback)
   */
  const sendTransaction = useCallback(async (
    params: SponsoredTransactionParams,
    options?: {
      targetChainId?: number;
      forceRegular?: boolean;
      onTransactionStart?: (hash: `0x${string}`) => void;
    }
  ): Promise<SponsoredTransactionResult> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Ensure we're on the correct chain
      if (options?.targetChainId) {
        const chainSwitched = await ensureSupportedChain(options.targetChainId);
        if (!chainSwitched) {
          throw new Error('Failed to switch to target chain');
        }
      }

      // Check if chain supports sponsored transactions
      if (!isChainSupported(options?.targetChainId)) {
        logSponsoredTransaction('Chain not supported for sponsored transactions');
        const result = await sendRegularTransaction(params);
        setState(prev => ({ ...prev, isLoading: false, isSponsored: false }));
        return result;
      }

      let result: SponsoredTransactionResult;

      // Try sponsored transaction first (unless forced to use regular)
      if (!options?.forceRegular && isSponsoredTransactionSupported()) {
        try {
          result = await sendSponsoredTransaction(params);
          setState(prev => ({ ...prev, isLoading: false, isSponsored: true }));
          
          if (result.hash && options?.onTransactionStart) {
            options.onTransactionStart(result.hash);
          }
          
          return result;
        } catch (sponsoredError) {
          logSponsoredTransaction('Sponsored transaction failed, falling back to regular', sponsoredError);
          
          // Fall back to regular transaction
          result = await sendRegularTransaction(params);
          setState(prev => ({ ...prev, isLoading: false, isSponsored: false }));
          
          if (result.hash && options?.onTransactionStart) {
            options.onTransactionStart(result.hash);
          }
          
          return result;
        }
      } else {
        // Send regular transaction
        result = await sendRegularTransaction(params);
        setState(prev => ({ ...prev, isLoading: false, isSponsored: false }));
        
        if (result.hash && options?.onTransactionStart) {
          options.onTransactionStart(result.hash);
        }
        
        return result;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      throw error;
    }
  }, [
    ensureSupportedChain,
    isChainSupported,
    sendSponsoredTransaction,
    sendRegularTransaction,
  ]);

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isSponsored: false,
    });
  }, []);

  return {
    sendTransaction,
    isLoading: state.isLoading,
    error: state.error,
    isSponsored: state.isSponsored,
    isSponsoredSupported: isSponsoredTransactionSupported(),
    isChainSupported,
    reset,
  };
}

/**
 * Simplified hook for components that just need to know if sponsored transactions are available
 */
export function useSponsoredTransactionStatus() {
  const { chainId } = useAccount();
  
  const isSupported = isSponsoredTransactionSupported();
  const isChainSupported = chainId === base.id || chainId === baseSepolia.id;
  
  return {
    isSupported: isSupported && isChainSupported,
    paymasterConfigured: !!PAYMASTER_CONFIG.PAYMASTER_URL,
    chainSupported: isChainSupported,
  };
}
