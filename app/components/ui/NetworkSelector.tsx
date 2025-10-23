"use client";

import { useAccount, useSwitchChain, useChains } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useMemo } from 'react';
import { getContractAddresses } from '../../config/contracts';
import styles from './NetworkSelector.module.css';

export function NetworkSelector() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const chains = useChains();

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

  const currentChain = supportedChains.find(chain => chain.id === chainId);
  const hasValidContracts = supportedChains.some(chain => chain.id === chainId);
  const isWrongNetwork = isConnected && !hasValidContracts;

  const handleNetworkSwitch = async (targetChainId: number) => {
    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className={styles.networkSelector}>
      <select
        value={chainId || ''}
        onChange={(e) => handleNetworkSwitch(parseInt(e.target.value))}
        className={`${styles.select} ${isWrongNetwork ? styles.warning : ''}`}
        title={isWrongNetwork ? 'Currently on unsupported network - switch to a network with deployed contracts' : 'Select network'}
      >
        {supportedChains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.isTestnet ? '🧪 ' : '🟢 '}{chain.name}
            {chainId === chain.id && ' (Current)'}
          </option>
        ))}
      </select>

      {isWrongNetwork && (
        <div className={styles.warningIndicator}>!</div>
      )}
    </div>
  );
}
