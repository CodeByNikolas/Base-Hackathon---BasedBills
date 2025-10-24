"use client";

import { ReactNode, useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetworkValidation } from '../../hooks/useNetworkValidation';
import { NetworkValidationModal } from './NetworkValidationModal';
import styles from './Modal.module.css';

interface NetworkGuardProps {
  children: ReactNode;
  requireValidNetwork?: boolean;
  fallback?: ReactNode;
  showModalOnInvalid?: boolean;
}

export function NetworkGuard({
  children,
  requireValidNetwork = true,
  fallback,
  showModalOnInvalid = true
}: NetworkGuardProps) {
  const { isConnected } = useAccount();
  const validation = useNetworkValidation();
  const [showModal, setShowModal] = useState(false);

  // Show modal when network becomes invalid
  useEffect(() => {
    if (isConnected && validation.needsNetworkSwitch && showModalOnInvalid) {
      setShowModal(true);
    }
  }, [isConnected, validation.needsNetworkSwitch, showModalOnInvalid]);

  // If not connected, show fallback or nothing
  if (!isConnected) {
    return fallback || null;
  }

  // If network is valid, show children
  if (validation.isValid) {
    return <>{children}</>;
  }

  // If network is invalid and we require valid network, show fallback or modal
  if (requireValidNetwork) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showModalOnInvalid) {
      return (
        <>
          <div style={{
            opacity: 0.5,
            pointerEvents: 'none',
            filter: 'grayscale(100%)'
          }}>
            {children}
          </div>
          <NetworkValidationModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
          />
        </>
      );
    }

    // Show disabled state without modal
    return (
      <div style={{
        opacity: 0.5,
        pointerEvents: 'none',
        filter: 'grayscale(100%)',
        position: 'relative'
      }}>
        {children}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #ccc',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>
            Please switch to {validation.requiredNetwork.name} to use this feature
          </p>
        </div>
      </div>
    );
  }

  // If we don't require valid network, show children anyway but with warning
  return (
    <>
      {children}
      {showModalOnInvalid && (
        <NetworkValidationModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// Higher-order component for protecting components that need network validation
export function withNetworkGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<NetworkGuardProps, 'children'> = {}
) {
  return function NetworkGuardedComponent(props: P) {
    return (
      <NetworkGuard {...options}>
        <Component {...props} />
      </NetworkGuard>
    );
  };
}
