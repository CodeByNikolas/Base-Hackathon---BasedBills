'use client';

import { useAccount } from 'wagmi';
import { useUserGroups } from '../hooks/useGroups';

/**
 * Debug component to troubleshoot wallet connection issues
 * Add this temporarily to your main page to see what's happening
 */
export function WalletDebug() {
  const { address, isConnected, chainId, connector } = useAccount();
  const { groupAddresses, isLoading, error: addressesError, contractAddresses, hasValidContracts } = useUserGroups();

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return null;

//   return (
//     <div style={{
//       position: 'fixed',
//       bottom: '20px',
//       right: '20px',
//       background: 'rgba(0,0,0,0.8)',
//       color: 'white',
//       padding: '10px',
//       borderRadius: '8px',
//       fontSize: '12px',
//       maxWidth: '400px',
//       zIndex: 9999,
//       fontFamily: 'monospace',
//     }}>
//       <h4>🔍 Wallet Debug</h4>
//       <div>Connected: {isConnected ? '✅' : '❌'}</div>
//       <div>Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'None'}</div>
//       <div>Chain: {chainId === 84532 ? 'Base Sepolia' : chainId === 8453 ? 'Base' : `Chain ${chainId}`}</div>
//       <div>Connector: {connector?.name || 'None'}</div>
//       <div>Registry: {contractAddresses?.registry ? `${contractAddresses.registry.slice(0, 6)}...${contractAddresses.registry.slice(-4)}` : 'None'}</div>
//       <div>Valid Contracts: {hasValidContracts ? '✅' : '❌'}</div>
//       <div>Groups: {groupAddresses?.length || 0} found</div>
//       <div>Loading: {isLoading ? '⏳' : '✅'}</div>
//       {addressesError && <div style={{color: 'red'}}>Error: {addressesError.message}</div>}
//     </div>
//   );
}
