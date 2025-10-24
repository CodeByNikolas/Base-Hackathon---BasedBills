"use client";

import { useAccount, useSwitchChain, useChains } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useMemo, useState, useEffect } from 'react';
import { getContractAddresses } from '../../config/contracts';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { NetworkValidationModal } from './NetworkValidationModal';
import styles from './NetworkSelector.module.css';

export function NetworkSelector() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const validation = useNetworkValidation();
  const [showValidationModal, setShowValidationModal] = useState(false);

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
    ].filter(chain => {
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

      {isOnTestnet && (
        <div className={styles.networkMessage}>
          <div className={styles.networkMessageContent}>
            <div className={styles.networkMessageIcon}>💰</div>
            <p>
              <strong>Ready for testing!</strong><br />
              Use the <code>mintForTest()</code> function on the MockUSDC contract to get 100 USDC for testing bill splitting.
            </p>
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
