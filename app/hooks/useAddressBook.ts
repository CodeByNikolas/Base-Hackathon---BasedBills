import { useState, useEffect, useCallback } from 'react';
import { useEnsName } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import {
  getAddressBook,
  addToAddressBook,
  removeFromAddressBook,
  updateEnsName,
  getCachedEnsName,
  getDisplayName,
  hasCustomName,
  getAllAddressBookEntries,
  searchAddressBook,
  type AddressBookEntry,
} from '../utils/addressBook';

/**
 * Hook for managing the address book
 */
export function useAddressBook() {
  const [addressBook, setAddressBook] = useState<{ [address: string]: AddressBookEntry }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load address book on mount
  useEffect(() => {
    const loadAddressBook = () => {
      try {
        const book = getAddressBook();
        setAddressBook(book);
      } catch (error) {
        console.error('Error loading address book:', error);
      } finally {
        setIsLoading(false);
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
    addAddress,
    removeAddress,
    updateAddress,
    getEntry,
    getAllEntries,
    search,
  };
}

/**
 * Hook for resolving ENS names with caching
 */
export function useEnsResolver(address: `0x${string}` | undefined) {
  const [cachedEnsName, setCachedEnsName] = useState<string | null | undefined>();
  const [isResolved, setIsResolved] = useState(false);

  // Check cache first
  useEffect(() => {
    if (!address) {
      setCachedEnsName(undefined);
      setIsResolved(true);
      return;
    }

    const cached = getCachedEnsName(address);
    if (cached !== undefined) {
      setCachedEnsName(cached);
      setIsResolved(true);
    } else {
      setIsResolved(false);
    }
  }, [address]);

  // Use wagmi's ENS resolution for Base network
  const { data: ensName, isLoading: isLoadingEns } = useEnsName({
    address,
    chainId: base.id, // Use Base mainnet for ENS resolution
    query: {
      enabled: !!address && !isResolved,
    },
  });

  // Update cache when ENS name is resolved
  useEffect(() => {
    if (address && ensName !== undefined && !isLoadingEns) {
      updateEnsName(address, ensName);
      setCachedEnsName(ensName);
      setIsResolved(true);
    }
  }, [address, ensName, isLoadingEns]);

  return {
    ensName: cachedEnsName,
    isLoading: !isResolved && isLoadingEns,
    isResolved,
  };
}

/**
 * Hook for getting display names with ENS resolution
 */
export function useDisplayName(
  address: `0x${string}` | undefined,
  options: {
    maxLength?: number;
    fallbackToShortened?: boolean;
  } = {}
) {
  const { ensName, isLoading } = useEnsResolver(address);
  const { getEntry } = useAddressBook();

  const displayName = address ? getDisplayName(address, {
    ensName,
    ...options,
  }) : '';

  const entry = address ? getEntry(address) : undefined;
  const hasCustom = address ? hasCustomName(address) : false;

  return {
    displayName,
    ensName,
    customName: entry?.name,
    hasCustomName: hasCustom,
    isLoading,
  };
}

/**
 * Hook for batch resolving multiple addresses
 */
export function useBatchDisplayNames(addresses: `0x${string}`[]) {
  const [displayNames, setDisplayNames] = useState<{ [address: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const { addressBook } = useAddressBook();

  useEffect(() => {
    const resolveNames = async () => {
      setIsLoading(true);
      const names: { [address: string]: string } = {};

      for (const address of addresses) {
        // Get cached ENS name
        const cachedEns = getCachedEnsName(address);
        
        names[address.toLowerCase()] = getDisplayName(address, {
          ensName: cachedEns,
          fallbackToShortened: true,
        });
      }

      setDisplayNames(names);
      setIsLoading(false);
    };

    if (addresses.length > 0) {
      resolveNames();
    } else {
      setDisplayNames({});
      setIsLoading(false);
    }
  }, [addresses, addressBook]);

  const getDisplayNameForAddress = useCallback((address: `0x${string}`) => {
    return displayNames[address.toLowerCase()] || getDisplayName(address);
  }, [displayNames]);

  return {
    displayNames,
    isLoading,
    getDisplayNameForAddress,
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
