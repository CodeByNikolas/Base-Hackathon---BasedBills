import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnsName, useEnsAddress } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { getAddress } from '@coinbase/onchainkit/identity';
import { CdpClient } from '@coinbase/cdp-sdk';
import {
  getAddressBook,
  addToAddressBook,
  removeFromAddressBook,
  updateEnsName,
  isValidEnsName,
  isValidBaseUsername,
  isBaseUsername,
  getCachedEnsName,
  getCachedReverseEnsName,
  cacheReverseEnsName,
  resolveReverseEnsName,
  getDisplayName,
  getDisplayNameForAddress,
  hasCustomName,
  getAllAddressBookEntries,
  searchAddressBook,
  shortenAddress as _shortenAddress,
  formatAddress,
  type AddressBookEntry,
  isValidAddress,
} from '../utils/addressBook';

/**
 * Hook for managing the address book
 */
export function useAddressBook() {
  const [addressBook, setAddressBook] = useState<{ [address: string]: AddressBookEntry }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load address book on mount, but only on client side
  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    const loadAddressBook = () => {
      try {
        const book = getAddressBook();
        setAddressBook(book);
      } catch (error) {
        console.error('Error loading address book:', error);
        setAddressBook({});
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    loadAddressBook();
  }, []);

  const addAddress = useCallback((address: `0x${string}`, name: string) => {
    addToAddressBook(address, name);
    setAddressBook(getAddressBook());
  }, []);

  const removeAddress = useCallback((address: `0x${string}`) => {
    removeFromAddressBook(address);
    setAddressBook(getAddressBook());
  }, []);

  const updateAddress = useCallback((address: `0x${string}`, name: string) => {
    addToAddressBook(address, name); // Same function for add/update
    setAddressBook(getAddressBook());
  }, []);

  const getEntry = useCallback((address: `0x${string}`) => {
    const normalizedAddress = address.toLowerCase();
    return addressBook[normalizedAddress];
  }, [addressBook]);

  const getAllEntries = useCallback(() => {
    return getAllAddressBookEntries();
  }, []);

  const search = useCallback((query: string) => {
    return searchAddressBook(query);
  }, []);

  return {
    addressBook,
    isLoading,
    isInitialized,
    addAddress,
    removeAddress,
    updateAddress,
    getEntry,
    getAllEntries,
    search,
  };
}

/**
 * Hook for resolving ENS names with caching and error handling
 */
export function useEnsResolver(address: `0x${string}` | undefined) {
  const [cachedEnsName, setCachedEnsName] = useState<string | null | undefined>();
  const [isResolved, setIsResolved] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Check cache first
  useEffect(() => {
    if (!address) {
      setCachedEnsName(undefined);
      setIsResolved(true);
      setError(null);
      setRetryCount(0);
      return;
    }

    const cached = getCachedEnsName(address);
    if (cached !== undefined) {
      setCachedEnsName(cached);
      setIsResolved(true);
      setError(null);
      setRetryCount(0);
    } else {
      setIsResolved(false);
      setError(null);
      setRetryCount(0);
    }
  }, [address]);

  // Use wagmi's ENS resolution for Base network with error handling
  const { data: ensName, isLoading: isLoadingEns, error: ensError } = useEnsName({
    address,
    chainId: base.id, // Use Base mainnet for ENS resolution
    query: {
      enabled: !!address && !isResolved,
      retry: (failureCount, error) => {
        // Retry up to 3 times with exponential backoff
        if (failureCount >= 3) return false;

        // Don't retry on certain errors (like ENS not found)
        if (error?.message?.includes('not found') ||
            error?.message?.includes('no ENS name')) {
          return false;
        }

        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    },
  });

  // Update cache when ENS name is resolved or handle errors
  useEffect(() => {
    if (address && !isLoadingEns) {
      if (ensError) {
        // ENS resolution failed - cache the failure to avoid repeated requests
        updateEnsName(address, null);
        setCachedEnsName(null);
        setError(ensError as Error);
        setIsResolved(true);
      } else if (ensName !== undefined) {
        // ENS resolution succeeded
        updateEnsName(address, ensName);
        setCachedEnsName(ensName);
        setError(null);
        setRetryCount(0);
        setIsResolved(true);
      }
    }
  }, [address, ensName, isLoadingEns, ensError]);

  // Retry mechanism for failed resolutions
  const retry = useCallback(() => {
    if (!address) return;

    setError(null);
    setIsResolved(false);
    setRetryCount(prev => prev + 1);
  }, [address]);

  return {
    ensName: cachedEnsName,
    isLoading: !isResolved && isLoadingEns,
    isResolved,
    error,
    retryCount,
    retry,
  };
}

/**
 * Hook for resolving Base usernames using CDP SDK
 * Based on CDP SDK patterns for Base username handling
 */
export function useBaseUsernameResolver(username: string | undefined) {
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when username changes
  useEffect(() => {
    if (!username) {
      setResolvedAddress(null);
      setIsResolving(false);
      setError(null);
      setRetryCount(0);
      return;
    }

    // Check if it's a valid Base username first
    if (!isValidBaseUsername(username)) {
      setError(new Error('Invalid Base username format'));
      setResolvedAddress(null);
      setIsResolving(false);
      return;
    }

    setIsResolving(true);
    setError(null);
  }, [username]);

  // Resolve Base username using CDP SDK
  useEffect(() => {
    if (!username || !isValidBaseUsername(username)) return;

    const resolveUsername = async () => {
      try {
        setIsResolving(true);
        setError(null);

        // Use CDP SDK for Base username resolution
        const cdp = new CdpClient();
        
        // Try to resolve using CDP SDK's identity resolution
        // This follows the CDP SDK pattern for Base username resolution
        const address = await getAddress({ name: username });
        
        if (address) {
          setResolvedAddress(address as `0x${string}`);
          setError(null);
          setRetryCount(0);
        } else {
          setError(new Error('Base username not found'));
          setResolvedAddress(null);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        setResolvedAddress(null);
        setRetryCount(prev => prev + 1);
      } finally {
        setIsResolving(false);
      }
    };

    resolveUsername();
  }, [username]);

  // Retry mechanism
  const retry = useCallback(() => {
    if (!username) return;

    setError(null);
    setResolvedAddress(null);
    setIsResolving(true);
    setRetryCount(prev => prev + 1);
  }, [username]);

  return {
    address: resolvedAddress,
    isResolving,
    error,
    retryCount,
    retry,
  };
}

/**
 * Hook for resolving ENS names to addresses using CDP SDK
 * Avoids viem issues on Base networks by using CDP SDK for Base ENS names
 */
export function useEnsAddressResolver(ensName: string | undefined) {
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when ENS name changes
  useEffect(() => {
    if (!ensName) {
      setResolvedAddress(null);
      setIsResolving(false);
      setError(null);
      setRetryCount(0);
      return;
    }

    // Check if it's a valid ENS name first
    if (!isValidEnsName(ensName)) {
      setError(new Error('Invalid ENS name format'));
      setResolvedAddress(null);
      setIsResolving(false);
      return;
    }

    setIsResolving(true);
    setError(null);
  }, [ensName]);

  // Determine which chain to use based on ENS name
  const chainId = useMemo(() => {
    if (!ensName) return undefined;
    if (ensName.includes('.basetest.eth')) return baseSepolia.id;
    if (ensName.includes('.base.eth')) return base.id;
    return undefined; // Default to Ethereum mainnet for .eth names
  }, [ensName]);

  // Use wagmi's ENS address resolution ONLY for Ethereum mainnet .eth names
  // Use CDP SDK for Base ENS names to avoid viem issues
  const { data: address, isLoading, error: ensError } = useEnsAddress({
    name: ensName,
    chainId: chainId === base.id || chainId === baseSepolia.id ? undefined : chainId, // Only use wagmi for .eth names
    query: {
      enabled: !!ensName && isValidEnsName(ensName) && !ensName.includes('.base.eth') && !ensName.includes('.basetest.eth'),
      retry: (failureCount, error) => {
        // Retry up to 3 times with exponential backoff
        if (failureCount >= 3) return false;

        // Don't retry on ENS not found or invalid format errors
        if (error?.message?.includes('not found') ||
            error?.message?.includes('invalid') ||
            error?.message?.includes('no address')) {
          return false;
        }

        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  });

  // Handle Base ENS names using CDP SDK
  useEffect(() => {
    if (!ensName || !isValidEnsName(ensName)) return;

    // For Base ENS names, use CDP SDK instead of wagmi to avoid viem issues
    if (ensName.includes('.base.eth') || ensName.includes('.basetest.eth')) {
      const resolveBaseEns = async () => {
        try {
          setIsResolving(true);
          setError(null);

          // Use OnchainKit's getAddress for Base ENS names
          const address = await getAddress({ name: ensName });
          
          if (address) {
            setResolvedAddress(address as `0x${string}`);
            setError(null);
            setRetryCount(0);
          } else {
            setError(new Error('Base ENS name not found'));
            setResolvedAddress(null);
          }
        } catch (err) {
          const error = err as Error;
          setError(error);
          setResolvedAddress(null);
          setRetryCount(prev => prev + 1);
        } finally {
          setIsResolving(false);
        }
      };

      resolveBaseEns();
      return;
    }
  }, [ensName]);

  // Handle wagmi resolution results for .eth names
  useEffect(() => {
    if (!ensName || ensName.includes('.base.eth') || ensName.includes('.basetest.eth')) return;

    if (ensError) {
      setError(ensError as Error);
      setResolvedAddress(null);
      setRetryCount(prev => prev + 1);
    } else if (address) {
      setResolvedAddress(address);
      setError(null);
      setRetryCount(0);
    }

    setIsResolving(false);
  }, [ensName, address, ensError]);

  // Retry mechanism
  const retry = useCallback(() => {
    if (!ensName) return;

    setError(null);
    setResolvedAddress(null);
    setIsResolving(true);
    setRetryCount(prev => prev + 1);
  }, [ensName]);

  return {
    address: resolvedAddress,
    isResolving,
    error,
    retryCount,
    retry,
    chainId,
  };
}

/**
 * Hook for resolving only .base.eth names using CDP SDK
 * Simplified to only handle Base ENS names
 */
export function useBaseEnsResolver(name: string | undefined) {
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Reset state when name changes
  useEffect(() => {
    if (!name) {
      setResolvedAddress(null);
      setIsResolving(false);
      setError(null);
      setRetryCount(0);
      return;
    }

    // Only handle .base.eth names
    if (!name.includes('.base.eth')) {
      setError(new Error('Only .base.eth names are supported'));
      setResolvedAddress(null);
      setIsResolving(false);
      return;
    }

    setIsResolving(true);
    setError(null);
  }, [name]);

  // Resolve .base.eth names using CDP SDK
  useEffect(() => {
    if (!name || !name.includes('.base.eth')) return;

    const resolveBaseEns = async () => {
      try {
        setIsResolving(true);
        setError(null);

        // Use OnchainKit's getAddress for Base ENS names
        const address = await getAddress({ name });
        
        if (address) {
          setResolvedAddress(address as `0x${string}`);
          setError(null);
          setRetryCount(0);
        } else {
          setError(new Error('Base ENS name not found'));
          setResolvedAddress(null);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        setResolvedAddress(null);
        setRetryCount(prev => prev + 1);
      } finally {
        setIsResolving(false);
      }
    };

    resolveBaseEns();
  }, [name]);

  // Retry mechanism
  const retry = useCallback(() => {
    if (!name) return;

    setError(null);
    setResolvedAddress(null);
    setIsResolving(true);
    setRetryCount(prev => prev + 1);
  }, [name]);

  return {
    address: resolvedAddress,
    isResolving,
    error,
    retryCount,
    retry,
    nameType: 'base-ens' as const,
  };
}

/**
 * Hook for reverse ENS resolution (address → .base.eth name)
 */
export function useReverseEnsName(address: `0x${string}` | undefined) {
  const [reverseEnsName, setReverseEnsName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check cache first
  const cachedReverseEnsName = useMemo(() => {
    if (!address) return null;
    return getCachedReverseEnsName(address);
  }, [address]);

  // Resolve reverse ENS name
  useEffect(() => {
    if (!address) {
      setReverseEnsName(null);
      setIsResolving(false);
      setError(null);
      return;
    }

    // Use cached value if available
    if (cachedReverseEnsName !== undefined) {
      setReverseEnsName(cachedReverseEnsName);
      setIsResolving(false);
      setError(null);
      return;
    }

    // Resolve reverse ENS name
    const resolveReverse = async () => {
      try {
        setIsResolving(true);
        setError(null);

        const resolved = await resolveReverseEnsName(address);
        setReverseEnsName(resolved);
        
        // Cache the result
        if (resolved) {
          cacheReverseEnsName(address, resolved);
        }
      } catch (err) {
        const error = err as Error;
        setError(error);
        setReverseEnsName(null);
      } finally {
        setIsResolving(false);
      }
    };

    resolveReverse();
  }, [address, cachedReverseEnsName]);

  return {
    reverseEnsName,
    isResolving,
    error,
  };
}

/**
 * Hook for getting display names with ENS and reverse ENS resolution
 */
export function useDisplayName(
  address: `0x${string}` | undefined,
  options: {
    maxLength?: number;
    fallbackToShortened?: boolean;
  } = {}
) {
  const { ensName } = useEnsResolver(address);
  const { reverseEnsName } = useReverseEnsName(address);
  const { getEntry, isInitialized } = useAddressBook();

  const displayName = address ? getDisplayName(address, {
    ensName, // Use ENS name when available, fallback to address
    reverseEnsName, // Use reverse ENS name when available
    ...options,
  }) : '';

  const entry = address ? getEntry(address) : undefined;
  const hasCustom = address ? hasCustomName(address) : false;

  return {
    displayName,
    ensName,
    reverseEnsName,
    customName: entry?.name,
    hasCustomName: hasCustom,
    isLoading: false, // Never show loading state
    isInitialized,
  };
}

/**
 * Hook for batch resolving multiple addresses
 */
export function useBatchDisplayNames(addresses: `0x${string}`[], refreshTrigger?: number) {
  const [displayNames, setDisplayNames] = useState<{ [address: string]: string }>({});
  const { addressBook, isInitialized } = useAddressBook();

  // Extract complex expressions for static checking
  const addressBookKeys = Object.keys(addressBook).join(',');

  useEffect(() => {
    const resolveNames = async () => {
      // First, immediately show addresses/custom names
      const immediateNames: { [address: string]: string } = {};
      for (const address of addresses) {
        immediateNames[address.toLowerCase()] = getDisplayName(address, {
          ensName: null, // Don't use ENS initially
          fallbackToShortened: true,
        });
      }
      setDisplayNames(immediateNames);

      // Then, update with cached ENS names
      const names: { [address: string]: string } = {};
      for (const address of addresses) {
        const cachedEns = getCachedEnsName(address);
        names[address.toLowerCase()] = getDisplayName(address, {
          ensName: cachedEns,
          fallbackToShortened: true,
        });
      }
      setDisplayNames(names);
    };

    if (addresses.length > 0) {
      resolveNames();
    } else {
      setDisplayNames({});
    }
  }, [addresses, addressBookKeys, refreshTrigger]);

  const getDisplayNameForAddress = useCallback((address: `0x${string}`) => {
    return displayNames[address.toLowerCase()] || getDisplayName(address);
  }, [displayNames]);

  return {
    displayNames,
    isLoading: false, // Never show loading state
    isInitialized,
    getDisplayNameForAddress,
  };
}

/**
 * Hook for getting a single address display name with current user context
 */
export function useAddressDisplay(
  address: `0x${string}` | undefined,
  currentUserAddress?: `0x${string}`
) {
  const { ensName } = useEnsResolver(address);
  const { getEntry, isInitialized } = useAddressBook();

  if (!address) {
    return {
      displayName: '',
      hasCustomName: false,
      ensName: null,
      isLoading: false,
      isInitialized,
    };
  }

  const displayName = getDisplayNameForAddress(address, {
    currentUserAddress,
    ensName,
  });

  const entry = getEntry(address);
  const hasCustom = hasCustomName(address);

  return {
    displayName,
    hasCustomName: hasCustom,
    ensName,
    customName: entry?.name,
    isLoading: false,
    isInitialized,
  };
}

/**
 * Hook for address book statistics
 */
export function useAddressBookStats() {
  const { getAllEntries } = useAddressBook();
  
  const stats = {
    totalEntries: 0,
    withEnsNames: 0,
    customNames: 0,
  };

  const entries = getAllEntries();
  stats.totalEntries = entries.length;
  stats.withEnsNames = entries.filter(entry => entry.ensName).length;
  stats.customNames = entries.filter(entry => entry.name).length;

  return stats;
}
