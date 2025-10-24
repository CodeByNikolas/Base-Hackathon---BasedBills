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
      { id: base.id, name: 'Base', isTestnet: false },
      { id: baseSepolia.id, name: 'Base Sepolia', isTestnet: true },
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

  return (
    <>
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

      <NetworkValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
      />
    </>
  );
}
