import { normalize as _normalize } from 'viem/ens';
import { getAddress } from '@coinbase/onchainkit/identity';

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
const REVERSE_ENS_CACHE_KEY = 'basedbills_reverse_ens_cache';
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
 * Get reverse ENS cache from local storage
 */
function getReverseEnsCache(): { [address: string]: { name: string | null; timestamp: number } } {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(REVERSE_ENS_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading reverse ENS cache:', error);
    return {};
  }
}

/**
 * Save reverse ENS cache to local storage
 */
function saveReverseEnsCache(cache: { [address: string]: { name: string | null; timestamp: number } }): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(REVERSE_ENS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving reverse ENS cache:', error);
  }
}

/**
 * Get cached reverse ENS name if available and not expired
 */
export function getCachedReverseEnsName(address: `0x${string}`): string | null | undefined {
  const normalizedAddress = address.toLowerCase();
  const reverseEnsCache = getReverseEnsCache();
  const cached = reverseEnsCache[normalizedAddress];
  
  if (!cached) return undefined; // Not cached
  
  const isExpired = Date.now() - cached.timestamp > ENS_CACHE_DURATION;
  if (isExpired) {
    // Clean up expired cache entry
    delete reverseEnsCache[normalizedAddress];
    saveReverseEnsCache(reverseEnsCache);
    return undefined;
  }
  
  return cached.name;
}

/**
 * Cache reverse ENS name for an address
 */
export function cacheReverseEnsName(address: `0x${string}`, ensName: string | null): void {
  const normalizedAddress = address.toLowerCase();
  const reverseEnsCache = getReverseEnsCache();
  
  reverseEnsCache[normalizedAddress] = {
    name: ensName,
    timestamp: Date.now(),
  };
  
  saveReverseEnsCache(reverseEnsCache);
}

/**
 * Resolve reverse ENS name for an address using CDP SDK
 * This performs reverse DNS lookup to find .base.eth names
 */
export async function resolveReverseEnsName(address: `0x${string}`): Promise<string | null> {
  try {
    // Check cache first
    const cached = getCachedReverseEnsName(address);
    if (cached !== undefined) {
      return cached;
    }

    // For now, we'll return null as reverse ENS resolution requires additional setup
    // This is a placeholder for future implementation
    // In a full implementation, you would use a reverse ENS resolver here
    console.log(`Reverse ENS resolution not yet implemented for ${address}`);
    return null;
  } catch (error) {
    console.error('Error resolving reverse ENS name:', error);
    return null;
  }
}

/**
 * Get display name for an address with priority:
 * 1. Custom name from address book
 * 2. ENS name (.base.eth) - forward resolution
 * 3. Reverse ENS name (.base.eth) - reverse DNS lookup
 * 4. Shortened address
 */
export function getDisplayName(
  address: `0x${string}`, 
  options: {
    ensName?: string | null;
    reverseEnsName?: string | null;
    fallbackToShortened?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { ensName, reverseEnsName, fallbackToShortened = true, maxLength = 20 } = options;
  const normalizedAddress = address.toLowerCase();
  const addressBook = getAddressBook();
  const entry = addressBook[normalizedAddress];
  
  // 1. Custom name from address book (highest priority)
  if (entry?.name) {
    return entry.name.length > maxLength 
      ? `${entry.name.slice(0, maxLength - 3)}...` 
      : entry.name;
  }
  
  // 2. ENS name (.base.eth or other) - forward resolution
  const resolvedEnsName = ensName || entry?.ensName;
  if (resolvedEnsName) {
    return resolvedEnsName.length > maxLength 
      ? `${resolvedEnsName.slice(0, maxLength - 3)}...` 
      : resolvedEnsName;
  }
  
  // 3. Reverse ENS name (.base.eth) - reverse DNS lookup
  const resolvedReverseEnsName = reverseEnsName || getCachedReverseEnsName(address);
  if (resolvedReverseEnsName) {
    return resolvedReverseEnsName.length > maxLength 
      ? `${resolvedReverseEnsName.slice(0, maxLength - 3)}...` 
      : resolvedReverseEnsName;
  }
  
  // 4. Shortened address (fallback)
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
 * Shorten an Ethereum address with consistent 6+4 format (for backward compatibility)
 */
export function formatAddress(address: `0x${string}`): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get display name for an address with priority: custom name → ENS → reverse ENS → shortened address
 * This is the main utility function for displaying addresses consistently
 */
export function getDisplayNameForAddress(
  address: `0x${string}`,
  options: {
    currentUserAddress?: `0x${string}`;
    ensName?: string | null;
    reverseEnsName?: string | null;
    fallbackToShortened?: boolean;
    maxLength?: number;
  } = {}
): string {
  const { currentUserAddress, ensName, reverseEnsName, fallbackToShortened = true, maxLength = 20 } = options;

  // 1. Current user gets "You"
  if (currentUserAddress && address.toLowerCase() === currentUserAddress.toLowerCase()) {
    return 'You';
  }

  // 2. Get display name using existing logic with reverse ENS support
  return getDisplayName(address, {
    ensName,
    reverseEnsName,
    fallbackToShortened,
    maxLength
  });
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
    
    for (const [_address, entry] of Object.entries(imported)) {
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
 * Validate ENS name format with detailed error reporting
 */
export function isValidEnsName(name: string): boolean {
  try {
    if (!name || typeof name !== 'string') {
      return false;
    }

    // Enhanced validation for ENS names including Base ENS names
    // Supports: name.eth, name.base.eth (mainnet), name.basetest.eth (testnet)
    const isValidFormat = /^[a-zA-Z0-9-]+\.(eth|base\.eth|basetest\.eth)$/.test(name);
    const isValidLength = name.length >= 7;

    // Additional validation: no consecutive dots or dots at start/end
    const hasConsecutiveDots = /\.\./.test(name);
    const startsWithDot = name.startsWith('.');
    const endsWithDot = name.endsWith('.');

    return isValidFormat && isValidLength && !hasConsecutiveDots && !startsWithDot && !endsWithDot;
  } catch {
    return false;
  }
}

/**
 * Validate Base username (Basename) format
 * Base usernames are simple names without domain extensions
 */
export function isValidBaseUsername(name: string): boolean {
  try {
    if (!name || typeof name !== 'string') {
      return false;
    }

    // Base usernames are simple names without domain extensions
    // Must be 3-20 characters, alphanumeric and hyphens only
    const isValidFormat = /^[a-zA-Z0-9-]{3,20}$/.test(name);
    const noConsecutiveHyphens = !/--/.test(name);
    const noLeadingTrailingHyphens = !name.startsWith('-') && !name.endsWith('-');

    return isValidFormat && noConsecutiveHyphens && noLeadingTrailingHyphens;
  } catch {
    return false;
  }
}

/**
 * Check if a name is a Base username (not an ENS name)
 */
export function isBaseUsername(name: string): boolean {
  return isValidBaseUsername(name) && !isValidEnsName(name);
}

/**
 * Get validation details for an ENS name (for debugging)
 */
export function getEnsNameValidationDetails(name: string): {
  isValid: boolean;
  formatValid: boolean;
  lengthValid: boolean;
  noConsecutiveDots: boolean;
  noLeadingTrailingDots: boolean;
  supportedDomains: string[];
  error?: string;
} {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      formatValid: false,
      lengthValid: false,
      noConsecutiveDots: true,
      noLeadingTrailingDots: true,
      supportedDomains: ['.eth', '.base.eth', '.basetest.eth'],
      error: 'Invalid input type'
    };
  }

  const formatValid = /^[a-zA-Z0-9-]+\.(eth|base\.eth|basetest\.eth)$/.test(name);
  const lengthValid = name.length >= 7;
  const noConsecutiveDots = !/\.\./.test(name);
  const noLeadingTrailingDots = !name.startsWith('.') && !name.endsWith('.');
  const isValid = formatValid && lengthValid && noConsecutiveDots && noLeadingTrailingDots;

  let error: string | undefined;
  if (!formatValid) {
    error = 'Invalid format - must be name.eth, name.base.eth, or name.basetest.eth';
  } else if (!lengthValid) {
    error = 'Name too short - minimum 7 characters required';
  } else if (!noConsecutiveDots) {
    error = 'Consecutive dots not allowed';
  } else if (!noLeadingTrailingDots) {
    error = 'Name cannot start or end with a dot';
  }

  return {
    isValid,
    formatValid,
    lengthValid,
    noConsecutiveDots,
    noLeadingTrailingDots,
    supportedDomains: ['.eth', '.base.eth', '.basetest.eth'],
    error
  };
}

/**
 * Get validation details for a Base username (for debugging)
 */
export function getBaseUsernameValidationDetails(name: string): {
  isValid: boolean;
  formatValid: boolean;
  lengthValid: boolean;
  noConsecutiveHyphens: boolean;
  noLeadingTrailingHyphens: boolean;
  error?: string;
} {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      formatValid: false,
      lengthValid: false,
      noConsecutiveHyphens: true,
      noLeadingTrailingHyphens: true,
      error: 'Invalid input type'
    };
  }

  const formatValid = /^[a-zA-Z0-9-]{3,20}$/.test(name);
  const lengthValid = name.length >= 3 && name.length <= 20;
  const noConsecutiveHyphens = !/--/.test(name);
  const noLeadingTrailingHyphens = !name.startsWith('-') && !name.endsWith('-');
  const isValid = formatValid && lengthValid && noConsecutiveHyphens && noLeadingTrailingHyphens;

  let error: string | undefined;
  if (!formatValid) {
    error = 'Invalid format - must be 3-20 characters, alphanumeric and hyphens only';
  } else if (!lengthValid) {
    error = 'Name must be 3-20 characters long';
  } else if (!noConsecutiveHyphens) {
    error = 'Consecutive hyphens not allowed';
  } else if (!noLeadingTrailingHyphens) {
    error = 'Name cannot start or end with a hyphen';
  }

  return {
    isValid,
    formatValid,
    lengthValid,
    noConsecutiveHyphens,
    noLeadingTrailingHyphens,
    error
  };
}

/**
 * Get validation details for any name (ENS or Base username)
 */
export function getNameValidationDetails(name: string): {
  type: 'ens' | 'base-username' | 'address' | 'invalid';
  isValid: boolean;
  ensDetails?: ReturnType<typeof getEnsNameValidationDetails>;
  baseUsernameDetails?: ReturnType<typeof getBaseUsernameValidationDetails>;
  error?: string;
} {
  if (!name || typeof name !== 'string') {
    return {
      type: 'invalid',
      isValid: false,
      error: 'Invalid input type'
    };
  }

  // Check if it's an address first
  if (isValidAddress(name)) {
    return {
      type: 'address',
      isValid: true
    };
  }

  // Check if it's an ENS name
  if (isValidEnsName(name)) {
    const ensDetails = getEnsNameValidationDetails(name);
    return {
      type: 'ens',
      isValid: ensDetails.isValid,
      ensDetails,
      error: ensDetails.error
    };
  }

  // Check if it's a Base username
  if (isValidBaseUsername(name)) {
    const baseUsernameDetails = getBaseUsernameValidationDetails(name);
    return {
      type: 'base-username',
      isValid: baseUsernameDetails.isValid,
      baseUsernameDetails,
      error: baseUsernameDetails.error
    };
  }

  return {
    type: 'invalid',
    isValid: false,
    error: 'Not a valid address, ENS name, or Base username'
  };
}

/**
 * Check if ENS name is a Base ENS name (mainnet or testnet)
 */
export function isBaseEnsName(name: string): boolean {
  return name.endsWith('.base.eth') || name.endsWith('.basetest.eth');
}
