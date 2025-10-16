"use client";
import { useState } from 'react';
import { useAddressBook, useAddressBookStats } from '../hooks/useAddressBook';
import { AddressDisplay, AddressInput } from './AddressDisplay';
import { isValidAddress, exportAddressBook, importAddressBook } from '../utils/addressBook';
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
  const [importData, setImportData] = useState('');
  const [showImportExport, setShowImportExport] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getAllEntries, search, addAddress, removeAddress } = useAddressBook();
  const stats = useAddressBookStats();

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

        <div className={styles.actions}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className={styles.actionButton}
          >
            {showAddForm ? 'Cancel' : 'Add Address'}
          </button>
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className={styles.actionButton}
          >
            Import/Export
          </button>
        </div>

        {showAddForm && (
          <div className={styles.addForm}>
            <h3>Add New Address</h3>
            <div className={styles.formGroup}>
              <label>Address</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x..."
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter a name..."
                className={styles.input}
                maxLength={50}
              />
            </div>
            <div className={styles.formButtons}>
              <button onClick={handleAddAddress} className={styles.saveButton}>
                Add Address
              </button>
              <button 
                onClick={() => setShowAddForm(false)} 
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showImportExport && (
          <div className={styles.importExport}>
            <h3>Import/Export</h3>
            <div className={styles.exportSection}>
              <button onClick={handleExport} className={styles.exportButton}>
                Export to Clipboard
              </button>
              <p className={styles.helpText}>
                Copy your address book data for backup
              </p>
            </div>
            <div className={styles.importSection}>
              <label>Import Data</label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste exported address book data here..."
                className={styles.textarea}
                rows={4}
              />
              <div className={styles.formButtons}>
                <button onClick={handleImport} className={styles.saveButton}>
                  Import
                </button>
                <button 
                  onClick={() => setShowImportExport(false)} 
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

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
  );
}
