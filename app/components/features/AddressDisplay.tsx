"use client";
import { useState } from 'react';
import { useDisplayName, useAddressBook } from '../../hooks/useAddressBook';
import { getBlockExplorerUrl } from '../../config/contracts';
import { useChainId } from 'wagmi';
import styles from './AddressDisplay.module.css';

interface AddressDisplayProps {
  address: `0x${string}`;
  showFullAddress?: boolean;
  showEditButton?: boolean;
  showExplorerLink?: boolean;
  maxLength?: number;
  className?: string;
  onClick?: () => void;
}

export function AddressDisplay({
  address,
  showFullAddress = false,
  showEditButton = true,
  showExplorerLink = false,
  maxLength = 20,
  className = '',
  onClick,
}: AddressDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const chainId = useChainId();
  
  const { displayName, customName, hasCustomName, isLoading, isInitialized: _displayNameInitialized } = useDisplayName(address, {
    maxLength: showFullAddress ? undefined : maxLength,
    fallbackToShortened: !showFullAddress,
  });
  
  const { addAddress, removeAddress, isInitialized: _addressBookInitialized } = useAddressBook();

  const handleEdit = () => {
    setEditName(customName || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editName.trim()) {
      addAddress(address, editName.trim());
    } else if (hasCustomName) {
      removeAddress(address);
    }
    setIsEditing(false);
    setEditName('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const explorerUrl = chainId ? getBlockExplorerUrl(chainId) : '';
  const fullExplorerUrl = explorerUrl ? `${explorerUrl}/address/${address}` : '';

  if (isLoading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loading}>
          <div className={styles.skeleton}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} onClick={onClick}>
      {isEditing ? (
        <div className={styles.editContainer}>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter name..."
            className={styles.editInput}
            autoFocus
            maxLength={50}
          />
          <div className={styles.editButtons}>
            <button
              onClick={handleSave}
              className={`${styles.editButton} ${styles.saveButton}`}
              title="Save"
            >
              ✓
            </button>
            <button
              onClick={handleCancel}
              className={`${styles.editButton} ${styles.cancelButton}`}
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.displayContainer}>
          <span 
            className={`${styles.displayName} ${hasCustomName ? styles.customName : ''}`}
            title={showFullAddress ? address : `${displayName} (${address})`}
          >
            {showFullAddress ? address : displayName}
          </span>
          
          <div className={styles.actions}>
            {showEditButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                className={styles.actionButton}
                title={hasCustomName ? 'Edit name' : 'Add name'}
              >
                {hasCustomName ? '✏️' : '📝'}
              </button>
            )}
            
            {showExplorerLink && fullExplorerUrl && (
              <a
                href={fullExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={styles.actionButton}
                title="View on block explorer"
              >
                🔗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AddressListProps {
  addresses: `0x${string}`[];
  showEditButtons?: boolean;
  showExplorerLinks?: boolean;
  maxLength?: number;
  className?: string;
  onAddressClick?: (address: `0x${string}`) => void;
}

export function AddressList({
  addresses,
  showEditButtons = true,
  showExplorerLinks = false,
  maxLength = 20,
  className = '',
  onAddressClick,
}: AddressListProps) {
  return (
    <div className={`${styles.list} ${className}`}>
      {addresses.map((address) => (
        <AddressDisplay
          key={address}
          address={address}
          showEditButton={showEditButtons}
          showExplorerLink={showExplorerLinks}
          maxLength={maxLength}
          onClick={() => onAddressClick?.(address)}
          className={styles.listItem}
        />
      ))}
    </div>
  );
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: `0x${string}`) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter address or ENS name...",
  className = '',
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<`0x${string}`[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { search, isInitialized: _addressBookInitialized } = useAddressBook();

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (inputValue.length > 2) {
      const results = search(inputValue);
      setSuggestions(results.map(entry => entry.address));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (address: `0x${string}`) => {
    onChange(address);
    setShowSuggestions(false);
    onAddressSelect?.(address);
  };

  return (
    <div className={`${styles.inputContainer} ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        className={styles.input}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.slice(0, 5).map((address) => (
            <div
              key={address}
              className={styles.suggestion}
              onClick={() => handleSuggestionClick(address)}
            >
              <AddressDisplay
                address={address}
                showEditButton={false}
                showExplorerLink={false}
                maxLength={30}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
