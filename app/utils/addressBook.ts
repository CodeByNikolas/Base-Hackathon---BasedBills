import { normalize } from 'viem/ens';

// Types for address book
export interface AddressBookEntry {
  address: `0x${string}`;
  name: string;
  ensName?: string;
  lastUpdated: number;
}

export interface AddressBook {
  [address: string]: AddressBookEntry;
}

// Local storage key
const ADDRESS_BOOK_KEY = 'basedbills_address_book';
const ENS_CACHE_KEY = 'basedbills_ens_cache';
const ENS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get the address book from local storage
 */
export function getAddressBook(): AddressBook {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(ADDRESS_BOOK_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading address book:', error);
    return {};
  }
}

/**
 * Save the address book to local storage
 */
export function saveAddressBook(addressBook: AddressBook): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ADDRESS_BOOK_KEY, JSON.stringify(addressBook));
  } catch (error) {
    console.error('Error saving address book:', error);
  }
}

/**
 * Add or update an address in the address book
 */
export function addToAddressBook(address: `0x${string}`, name: string): void {
  const addressBook = getAddressBook();
  const normalizedAddress = address.toLowerCase();
  
  addressBook[normalizedAddress] = {
    address,
    name: name.trim(),
    ensName: addressBook[normalizedAddress]?.ensName, // Preserve existing ENS name
    lastUpdated: Date.now(),
  };
  
  saveAddressBook(addressBook);
}

/**
 * Remove an address from the address book
 */
export function removeFromAddressBook(address: `0x${string}`): void {
  const addressBook = getAddressBook();
  const normalizedAddress = address.toLowerCase();
  
  delete addressBook[normalizedAddress];
  saveAddressBook(addressBook);
}

/**
 * Get ENS cache from local storage
 */
function getEnsCache(): { [address: string]: { name: string | null; timestamp: number } } {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(ENS_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading ENS cache:', error);
    return {};
  }
}

/**
 * Save ENS cache to local storage
 */
function saveEnsCache(cache: { [address: string]: { name: string | null; timestamp: number } }): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(ENS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving ENS cache:', error);
  }
}

/**
 * Update ENS name in address book and cache
 */
export function updateEnsName(address: `0x${string}`, ensName: string | null): void {
  const normalizedAddress = address.toLowerCase();
  
  // Update ENS cache
  const ensCache = getEnsCache();
  ensCache[normalizedAddress] = {
    name: ensName,
    timestamp: Date.now(),
  };
  saveEnsCache(ensCache);
  
  // Update address book if entry exists
  const addressBook = getAddressBook();
  if (addressBook[normalizedAddress]) {
    addressBook[normalizedAddress].ensName = ensName || undefined;
    addressBook[normalizedAddress].lastUpdated = Date.now();
    saveAddressBook(addressBook);
  }
}

/**
 * Get cached ENS name if available and not expired
 */
export function getCachedEnsName(address: `0x${string}`): string | null | undefined {
  const normalizedAddress = address.toLowerCase();
  const ensCache = getEnsCache();
  const cached = ensCache[normalizedAddress];
  
  if (!cached) return undefined; // Not cached
  
  const isExpired = Date.now() - cached.timestamp > ENS_CACHE_DURATION;
  if (isExpired) {
    // Clean up expired cache entry
    delete ensCache[normalizedAddress];
    saveEnsCache(ensCache);
    return undefined;
  }
  
  return cached.name;
}

/**
 * Get display name for an address with priority:
 * 1. Custom name from address book
 * 2. ENS name (.base.eth)
 * 3. Shortened address
 */
export function getDisplayName(
  address: `0x${string}`, 
  options: {
    ensName?: string | null;
    fallbackToShortened?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { ensName, fallbackToShortened = true, maxLength = 20 } = options;
  const normalizedAddress = address.toLowerCase();
  const addressBook = getAddressBook();
  const entry = addressBook[normalizedAddress];
  
  // 1. Custom name from address book (highest priority)
  if (entry?.name) {
    return entry.name.length > maxLength 
      ? `${entry.name.slice(0, maxLength - 3)}...` 
      : entry.name;
  }
  
  // 2. ENS name (.base.eth or other)
  const resolvedEnsName = ensName || entry?.ensName;
  if (resolvedEnsName) {
    return resolvedEnsName.length > maxLength 
      ? `${resolvedEnsName.slice(0, maxLength - 3)}...` 
      : resolvedEnsName;
  }
  
  // 3. Shortened address (fallback)
  if (fallbackToShortened) {
    return shortenAddress(address);
  }
  
  return address;
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: `0x${string}`, chars = 4): string {
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

/**
 * Check if an address has a custom name
 */
export function hasCustomName(address: `0x${string}`): boolean {
  const normalizedAddress = address.toLowerCase();
  const addressBook = getAddressBook();
  return !!addressBook[normalizedAddress]?.name;
}

/**
 * Get all addresses in the address book
 */
export function getAllAddressBookEntries(): AddressBookEntry[] {
  const addressBook = getAddressBook();
  return Object.values(addressBook).sort((a, b) => b.lastUpdated - a.lastUpdated);
}

/**
 * Search address book entries
 */
export function searchAddressBook(query: string): AddressBookEntry[] {
  const entries = getAllAddressBookEntries();
  const lowerQuery = query.toLowerCase();
  
  return entries.filter(entry => 
    entry.name.toLowerCase().includes(lowerQuery) ||
    entry.address.toLowerCase().includes(lowerQuery) ||
    (entry.ensName && entry.ensName.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Import/export address book for backup
 */
export function exportAddressBook(): string {
  const addressBook = getAddressBook();
  return JSON.stringify(addressBook, null, 2);
}

export function importAddressBook(jsonData: string): boolean {
  try {
    const imported = JSON.parse(jsonData);
    
    // Validate the structure
    if (typeof imported !== 'object') return false;
    
    for (const [address, entry] of Object.entries(imported)) {
      if (typeof entry !== 'object' || entry === null || 
          !('address' in entry) || !('name' in entry) ||
          typeof entry.address !== 'string' || typeof entry.name !== 'string') {
        return false;
      }
    }
    
    saveAddressBook(imported);
    return true;
  } catch (error) {
    console.error('Error importing address book:', error);
    return false;
  }
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate ENS name format
 */
export function isValidEnsName(name: string): boolean {
  try {
    // Basic validation for ENS names
    return /^[a-zA-Z0-9-]+\.(eth|base\.eth)$/.test(name) && name.length >= 7;
  } catch (error) {
    return false;
  }
}
