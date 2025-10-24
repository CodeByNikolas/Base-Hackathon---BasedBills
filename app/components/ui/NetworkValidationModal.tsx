"use client";

import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { base, baseSepolia } from 'wagmi/chains';
import styles from './Modal.module.css';

interface NetworkValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NetworkValidationModal({ isOpen, onClose }: NetworkValidationModalProps) {
  const validation = useNetworkValidation();

  if (!isOpen || validation.isValid) {
    return null;
  }

  const handleSwitchNetwork = async () => {
    const success = await validation.switchToRequiredNetwork();
    if (success) {
      onClose();
    }
  };

  const handleManualSwitch = async (chainId: number) => {
    const success = await validation.switchToNetwork(chainId);
    if (success) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>⚠️ Network Mismatch</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Current Network:</strong> {validation.currentNetwork}</p>
            <p><strong>Required Network:</strong> {validation.requiredNetwork.name}</p>
          </div>

          {validation.error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#c33'
            }}>
              {validation.error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              This application works on the following networks:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#fff3e0',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                🧪 Base Sepolia (Testnet) - Recommended
              </span>
              <span style={{
                backgroundColor: '#e3f2fd',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}>
                🔵 Base Mainnet (Production)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              className={styles.button}
              style={{ backgroundColor: '#f5f5f5', color: '#333' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={styles.button}
              style={{ backgroundColor: '#1976d2', color: 'white' }}
              onClick={handleSwitchNetwork}
            >
              Switch to {validation.requiredNetwork.name}
            </button>
          </div>

          {validation.needsNetworkSwitch && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                Or manually switch to:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleManualSwitch(baseSepolia.id)}
                  style={{
                    backgroundColor: baseSepolia.id === validation.requiredNetwork.id ? '#1976d2' : '#f5f5f5',
                    color: baseSepolia.id === validation.requiredNetwork.id ? 'white' : '#333',
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  🧪 Base Sepolia (Recommended)
                </button>
                <button
                  onClick={() => handleManualSwitch(base.id)}
                  style={{
                    backgroundColor: base.id === validation.requiredNetwork.id ? '#1976d2' : '#f5f5f5',
                    color: base.id === validation.requiredNetwork.id ? 'white' : '#333',
                    padding: '0.5rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  🔵 Base Mainnet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
