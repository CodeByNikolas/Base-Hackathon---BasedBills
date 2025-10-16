"use client";
import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useAddressBook, useAddressBookStats } from '../../hooks/useAddressBook';
import { useUserGroups, useMultipleGroupsData } from '../../hooks/useGroups';
import { AddressDisplay, AddressInput } from './AddressDisplay';
import { isValidAddress, exportAddressBook, importAddressBook, hasCustomName } from '../../utils/addressBook';
import styles from './AddressBookManager.module.css';

interface AddressBookManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddressBookManager({ isOpen, onClose }: AddressBookManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { address: userAddress } = useAccount();
  const addressBookData = useAddressBook();
  const { getAllEntries, search, addAddress, removeAddress, isInitialized } = addressBookData;
  const stats = useAddressBookStats();

  // Get user's groups to suggest addresses (only if address book is initialized)
  const { groupAddresses } = useUserGroups();
  const { groupsData } = useMultipleGroupsData(groupAddresses);

  // Get suggested addresses from groups (addresses without custom names, excluding user's own address)
  const suggestedAddresses = useMemo(() => {
    const allAddresses = new Set<`0x${string}`>();

    groupsData.forEach(group => {
      group.members.forEach(member => {
        // Exclude user's own address and addresses that already have custom names
        if (member.address.toLowerCase() !== userAddress?.toLowerCase() &&
            !hasCustomName(member.address)) {
          allAddresses.add(member.address);
        }
      });
    });

    return Array.from(allAddresses);
  }, [groupsData, userAddress]);

  // Show loading state while address book is initializing
  if (!isInitialized) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading address book...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const entries = searchQuery ? search(searchQuery) : getAllEntries();

  const handleAddAddress = () => {
    if (!isValidAddress(newAddress)) {
      setMessage({ type: 'error', text: 'Invalid address format' });
      return;
    }

    if (!newName.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }

    addAddress(newAddress as `0x${string}`, newName.trim());
    setNewAddress('');
    setNewName('');
    setShowAddForm(false);
    setMessage({ type: 'success', text: 'Address added successfully' });
    
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRemoveAddress = (address: `0x${string}`) => {
    removeAddress(address);
    setMessage({ type: 'success', text: 'Address removed successfully' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    const data = exportAddressBook();
    navigator.clipboard.writeText(data).then(() => {
      setMessage({ type: 'success', text: 'Address book copied to clipboard' });
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleImport = () => {
    if (importAddressBook(importData)) {
      setImportData('');
      setShowImportExport(false);
      setMessage({ type: 'success', text: 'Address book imported successfully' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: 'Invalid import data format' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Address Book</h2>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>

        <div className={styles.modalContent}>
          {message && (
            <div className={`${styles.message} ${styles[message.type]}`}>
              {message.text}
            </div>
          )}

          <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalEntries}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.customNames}</span>
            <span className={styles.statLabel}>Named</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.withEnsNames}</span>
            <span className={styles.statLabel}>ENS</span>
          </div>
        </div>

        <div className={styles.sectionsContainer}>
          {/* Add Address Section */}
          <div className={styles.section}>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                // Close other sections when opening this one
                if (!showAddForm) {
                  setShowSuggestions(false);
                  setShowImportExport(false);
                }
              }}
              className={`${styles.actionButton} ${showAddForm ? styles.active : ''}`}
            >
              {showAddForm ? '▼' : '▶'} Add Address
            </button>
            
            {showAddForm && (
              <div className={styles.addForm}>
                <h3>Add New Address</h3>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Address</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x..."
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter a name for this address"
                    className={styles.input}
                  />
                </div>
                <div className={styles.formActions}>
                  <button
                    onClick={handleAddAddress}
                    className={styles.saveButton}
                    disabled={!newAddress || !newName}
                  >
                    Save Address
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewAddress('');
                      setNewName('');
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Suggestions Section */}
          {suggestedAddresses.length > 0 && (
            <div className={styles.section}>
              <button
                onClick={() => {
                  setShowSuggestions(!showSuggestions);
                  // Close other sections when opening this one
                  if (!showSuggestions) {
                    setShowAddForm(false);
                    setShowImportExport(false);
                  }
                }}
                className={`${styles.actionButton} ${showSuggestions ? styles.active : ''}`}
              >
                {showSuggestions ? '▼' : '▶'} Suggestions ({suggestedAddresses.length})
              </button>
              
              {showSuggestions && (
                <div className={styles.suggestionsSection}>
                  <h3>Suggested from Your Groups</h3>
                  <p className={styles.suggestionsDescription}>
                    These addresses are from your groups but don't have custom names yet.
                  </p>
                  <div className={styles.suggestionsList}>
                    {suggestedAddresses.slice(0, 10).map((address) => (
                      <div key={address} className={styles.suggestionItem}>
                        <AddressDisplay
                          address={address}
                          showEditButton={false}
                          showExplorerLink={false}
                          maxLength={25}
                        />
                        <button
                          onClick={() => {
                            setNewAddress(address);
                            setNewName('');
                            setShowAddForm(true);
                            setShowSuggestions(false);
                          }}
                          className={styles.addSuggestionButton}
                          title="Add name for this address"
                        >
                          Add Name
                        </button>
                      </div>
                    ))}
                  </div>
                  {suggestedAddresses.length > 10 && (
                    <p className={styles.moreSuggestions}>
                      And {suggestedAddresses.length - 10} more addresses from your groups...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import/Export Section */}
          <div className={styles.section}>
            <button
              onClick={() => {
                setShowImportExport(!showImportExport);
                // Close other sections when opening this one
                if (!showImportExport) {
                  setShowAddForm(false);
                  setShowSuggestions(false);
                }
              }}
              className={`${styles.actionButton} ${showImportExport ? styles.active : ''}`}
            >
              {showImportExport ? '▼' : '▶'} Import/Export
            </button>
            
            {showImportExport && (
              <div className={styles.importExport}>
                <h3>Import/Export</h3>
                <div className={styles.exportSection}>
                  <button onClick={handleExport} className={styles.exportButton}>
                    Export to Clipboard
                  </button>
                  <p className={styles.exportDescription}>
                    Copy all your address book entries as JSON
                  </p>
                </div>
                <div className={styles.importSection}>
                  <label className={styles.label}>Import from JSON</label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste JSON data here..."
                    className={styles.importTextarea}
                    rows={4}
                  />
                  <button onClick={handleImport} className={styles.importButton}>
                    Import Addresses
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.searchSection}>
          <AddressInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search addresses or names..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.entriesList}>
          {entries.length === 0 ? (
            <div className={styles.emptyState}>
              {searchQuery ? (
                <p>No addresses match your search.</p>
              ) : (
                <p>No addresses in your address book yet.</p>
              )}
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.address} className={styles.entry}>
                <div className={styles.entryInfo}>
                  <AddressDisplay
                    address={entry.address}
                    showEditButton={false}
                    showExplorerLink={true}
                    maxLength={30}
                  />
                  {entry.ensName && (
                    <div className={styles.ensName}>
                      ENS: {entry.ensName}
                    </div>
                  )}
                  <div className={styles.entryMeta}>
                    Added {new Date(entry.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveAddress(entry.address)}
                  className={styles.removeButton}
                  title="Remove from address book"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
