'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';

interface WalletGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * WalletGuard component that redirects to welcome page if wallet is not connected
 * This provides a clean, global wallet connection check for the entire app
 */
export function WalletGuard({ children, redirectTo: _redirectTo = '/' }: WalletGuardProps) {
  const { address: _address, isConnected, isConnecting } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    // Set initialized after a short delay to ensure wagmi is ready
    const timer = setTimeout(() => {
      setHasInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't do anything until wagmi has initialized
    if (!hasInitialized) return;

    // Don't redirect while connecting
    if (isConnecting) {
      setShouldRedirect(false);
      return;
    }

    // If connected, allow access to all pages
    if (isConnected) {
      setShouldRedirect(false);
      return;
    }

    // If not connected and not on welcome page, mark for redirect
    if (!isConnected && pathname !== '/' && hasInitialized) {
      setShouldRedirect(true);
    }
  }, [isConnected, isConnecting, pathname, hasInitialized]);

  useEffect(() => {
    // Handle the actual redirection in a separate effect to avoid calling router during render
    if (shouldRedirect) {
      router.replace('/');
    }
  }, [shouldRedirect, router]);

  // Show loading state while wagmi is initializing
  if (!hasInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="text-center text-white">
          <div className="animate-pulse text-2xl mb-4">🔗</div>
          <p className="text-lg font-medium">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show loading state while connecting
  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg font-medium">Connecting to wallet...</p>
        </div>
      </div>
    );
  }

  // If wallet is connected, show children (including welcome page)
  if (isConnected) {
    return <>{children}</>;
  }

  // If on welcome page, show welcome page content (wallet connection UI)
  if (pathname === '/') {
    return <>{children}</>;
  }

  // If should redirect, show loading state
  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="text-center text-white">
          <div className="animate-pulse text-2xl mb-4">🔗</div>
          <p className="text-lg font-medium">Redirecting to welcome page...</p>
        </div>
      </div>
    );
  }

  // Fallback
  return <>{children}</>;
}
