"use client";

import { useAccount, useSwitchChain, useChains } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useState, useEffect, useMemo } from 'react';
import { getContractAddresses } from '../../config/contracts';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { NetworkValidationModal } from './NetworkValidationModal';
import { useSponsoredTransactions } from '../../hooks/useSponsoredTransactions';
import { SPONSORED_FUNCTIONS } from '../../utils/sponsoredTransactions';
import { USDC_ABI } from '../../config/abis';
import styles from './NetworkSelector.module.css';

interface NetworkSelectorProps {
  usdcBalance?: bigint;
  onBalanceUpdate?: () => void;
}

export function NetworkSelector({ usdcBalance, onBalanceUpdate }: NetworkSelectorProps) {
  const { chainId, isConnected, address: userAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const validation = useNetworkValidation();
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Mint USDC functionality using sponsored transactions with graceful fallback
  const { sendTransaction, isLoading: isMinting, isSponsoredSupported } = useSponsoredTransactions();

  // Check if we should show validation modal on network change
  useEffect(() => {
    if (isConnected && validation.needsNetworkSwitch) {
      setShowValidationModal(true);
    }
  }, [isConnected, validation.needsNetworkSwitch]);

  const supportedChains = useMemo(() => {
    return [
      { id: baseSepolia.id, name: 'Base Sepolia', isTestnet: true }, // Testnet first (default)
      { id: base.id, name: 'Base', isTestnet: false }, // Mainnet second (available option)
    ].filter((chain: { id: number; name: string; isTestnet: boolean }) => {
      try {
        const addresses = getContractAddresses(chain.id);
        return addresses && addresses.registry && (addresses.registry as string) !== '';
      } catch {
        return false;
      }
    });
  }, []);

  const handleNetworkSwitch = async (targetChainId: number) => {
    try {
      await switchChainAsync({ chainId: targetChainId });
      setShowValidationModal(false); // Close modal on successful switch
    } catch (error) {
      console.error('Failed to switch network:', error);
      setShowValidationModal(true); // Show modal on failure
    }
  };

  const handleNetworkSelectorClick = () => {
    if (validation.needsNetworkSwitch) {
      setShowValidationModal(true);
    }
  };

  const handleMintUSDC = async () => {
    if (!isOnTestnet || !userAddress) return;

    const usdcAddress = getContractAddresses(chainId).usdc;
    if (!usdcAddress) return;

    try {
      // Cast ABI to any to avoid deep type instantiation issues (same pattern as ActionButtons)
      const USDC_ABI_CAST = USDC_ABI as any;

      const result = await sendTransaction({
        address: usdcAddress as `0x${string}`,
        abi: USDC_ABI_CAST,
        functionName: SPONSORED_FUNCTIONS.USDC.mintForTest,
        args: [],
      });

      if (result.hash) {
        // Trigger balance update after successful mint
        if (onBalanceUpdate) {
          onBalanceUpdate();
        }
      }
    } catch (error) {
      console.error('Failed to mint USDC:', error);
      alert(`Failed to mint USDC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Check if balance is less than 100 USDC (100 * 10^6)
  const hasLowBalance = usdcBalance !== undefined && usdcBalance < 100000000n; // 100 USDC in smallest units

  if (!isConnected) {
    return null;
  }

  const isOnMainnet = chainId === base.id;
  const isOnTestnet = chainId === baseSepolia.id;

  return (
    <div className={styles.networkSelectorContainer}>
      <div className={styles.networkSelector}>
        <select
          value={chainId || ''}
          onChange={(e) => handleNetworkSwitch(parseInt(e.target.value))}
          onClick={handleNetworkSelectorClick}
          className={`${styles.select} ${validation.needsNetworkSwitch ? styles.warning : ''}`}
          title={
            validation.needsNetworkSwitch
              ? `Currently on ${validation.currentNetwork}. Click to switch to ${validation.requiredNetwork}.`
              : 'Select network'
          }
        >
          {supportedChains.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.isTestnet ? '🧪 ' : '🔵 '}{chain.name}
              {chainId === chain.id && ' (Current)'}
            </option>
          ))}
        </select>

        {validation.needsNetworkSwitch && (
          <div className={styles.warningIndicator}>!</div>
        )}
      </div>

      {/* Helpful Network Messages */}
      {isOnMainnet && (
        <div className={styles.networkMessage}>
          <div className={styles.networkMessageContent}>
            <div className={styles.networkMessageIcon}>🧪</div>
            <p>
              <strong>For easier testing without funds:</strong><br />
              Switch to Base Sepolia testnet where you can use the <code>mintForTest()</code> function to get 100 USDC instantly!
            </p>
          </div>
        </div>
      )}

      {isOnTestnet && hasLowBalance && (
        <div className={styles.networkMessage}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <div className={styles.networkMessageIcon}>💰</div>
              <div style={{ flex: 1 }}>
                <p>
                  <strong>Your USDC balance is low!</strong><br />
                  Get 100 USDC for testing by clicking the mint button below.
                  {isSponsoredSupported ? ' (Gas fees will be sponsored!)' : ' (Will use regular transaction if sponsored not available)'}
                </p>
              </div>
            </div>
              <button
                onClick={handleMintUSDC}
                disabled={isMinting}
                className={styles.mintButton}
                title={isMinting ? 'Transaction in progress...' : isSponsoredSupported ? 'Gas fees will be sponsored!' : 'Regular transaction (gas fees required)'}
              >
                {isMinting ? 'Minting...' : isSponsoredSupported ? '🟢 Mint 100 USDC (Sponsored)' : '🟢 Mint 100 USDC (Regular)'}
              </button>
          </div>
        </div>
      )}


      <NetworkValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
      />
    </div>
  );
}
