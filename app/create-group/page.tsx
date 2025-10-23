'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletGuard } from '../components/features/WalletGuard';
import { HeaderBar } from '../components/ui/HeaderBar';
import { Modal } from '../components/ui/Modal';
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { useAddressBook } from '../hooks/useAddressBook';
import { useUserGroups } from '../hooks/useGroups';
import { GROUP_FACTORY_ABI, getContractAddresses } from '../config/contracts';
import { isValidAddress } from '../utils/addressBook';
import styles from './CreateGroup.module.css';

export default function CreateGroupPage() {
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const addressBookData = useAddressBook();
  const { addressBook, isInitialized } = addressBookData;
  const { refetch: refetchGroups } = useUserGroups();

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(true);
  const [selectedAddressBookMembers, setSelectedAddressBookMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<LifecycleStatus | null>(null);
  const [useGasSponsorship, setUseGasSponsorship] = useState(true);
  const [, setCreatedGroupAddress] = useState('');
  const [transactionStartTime, setTransactionStartTime] = useState<number | null>(null);

  // Initialize with current user as first member
  useEffect(() => {
    if (userAddress && !members.includes(userAddress)) {
      setMembers([userAddress]);
    }
  }, [userAddress, members]);

  // Timeout mechanism for stuck transactions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isCreating && transactionStartTime) {
      // If transaction has been running for more than 2 minutes, reset it
      timeoutId = setTimeout(() => {
        if (isCreating) {
          setIsCreating(false);
          setTransactionStatus(null);
          setTransactionStartTime(null);
          alert('Transaction timed out. Please try again.');
        }
      }, 120000); // 2 minutes
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCreating, transactionStartTime]);

  // Transaction calls for group creation
  const getTransactionCalls = async () => {
    const allMembers = getAllMembers();
    return [{
      address: getContractAddresses().groupFactory as `0x${string}`,
      abi: GROUP_FACTORY_ABI,
      functionName: 'createGroup',
      args: [allMembers as `0x${string}`[], groupName.trim()],
    }];
  };

  // Handle transaction status updates
  const handleTransactionStatus = (status: LifecycleStatus) => {
    setTransactionStatus(status);

    // Track when transaction starts
    if (status.statusName === 'transactionPending' && !transactionStartTime) {
      setTransactionStartTime(Date.now());
    }

    if (status.statusName === 'success') {
      setIsCreating(false);
      setTransactionStartTime(null);
      setShowSuccessModal(true);
      refetchGroups();
    } else if (status.statusName === 'error') {
      setIsCreating(false);
      setTransactionStartTime(null);
      console.error('Transaction failed:', status.statusData);

      // Check if it's a gas sponsorship issue
      if (status.statusData?.message?.includes('paymaster') ||
          status.statusData?.message?.includes('gas') ||
          status.statusData?.code === '-32000') {
        alert('Gas sponsorship failed. You can try again with gas sponsorship or proceed with regular transaction (you\'ll need ETH for gas).');
        // Reset to allow retry without sponsorship
        setUseGasSponsorship(false);
      } else {
        alert('Failed to create group. Please try again.');
      }
    } else if (status.statusName === 'transactionIdle') {
      // Transaction was cancelled or declined by user
      setIsCreating(false);
      setTransactionStartTime(null);
    }
  };

  const handleAddMember = () => {
    if (newMemberAddress && isValidAddress(newMemberAddress) && !members.includes(newMemberAddress)) {
      setMembers([...members, newMemberAddress]);
      setNewMemberAddress('');
    }
  };

  const handleCancelTransaction = () => {
    setIsCreating(false);
    setTransactionStatus(null);
    setTransactionStartTime(null);
  };

  const handleRemoveMember = (address: string) => {
    setMembers(members.filter(member => member !== address));
    setSelectedAddressBookMembers(prev => {
      const newSet = new Set(prev);
      newSet.delete(address);
      return newSet;
    });
  };

  const handleAddressBookToggle = (address: string) => {
    const newSelected = new Set(selectedAddressBookMembers);

    if (newSelected.has(address)) {
      newSelected.delete(address);
      // Remove from members if it was added from address book
      setMembers(members.filter(member => member !== address));
    } else {
      newSelected.add(address);
      // Add to members if not already there
      if (!members.includes(address)) {
        setMembers([...members, address]);
      }
    }

    setSelectedAddressBookMembers(newSelected);
  };

  const getAllMembers = () => {
    const addressBookMembers = Array.from(selectedAddressBookMembers);
    return [...new Set([...members, ...addressBookMembers])];
  };

  const getDisplayName = (address: string) => {
    if (address.toLowerCase() === userAddress?.toLowerCase()) {
      return 'You';
    }

    const addressBookEntry = addressBook[address.toLowerCase()];
    return addressBookEntry?.name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleCreateGroup = () => {
    if (!groupName.trim() || getAllMembers().length < 2) {
      alert('Please enter a group name and select at least 2 members');
      return;
    }

    setIsCreating(true);
    setTransactionStatus(null);
  };

  const handleGoToGroup = () => {
    setShowSuccessModal(false);
    router.push('/');
  };

  const addressBookEntries = isInitialized ? (Object.values(addressBook) as Array<{address: string, name: string, ensName?: string}>) : [];

  // Show loading state while address book is initializing
  if (!isInitialized) {
    return (
      <WalletGuard>
        <div className={styles.container}>
          <HeaderBar />
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading address book...</p>
          </div>
        </div>
      </WalletGuard>
    );
  }

  return (
    <WalletGuard>
      <div className={styles.container}>
        <HeaderBar />

        {/* Back Button */}
        <div className={styles.backButtonContainer}>
          <button
            onClick={() => router.push('/')}
            className={styles.backButton}
            title="Back to Groups"
          >
            ← Back to Groups
          </button>
        </div>

        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.createGroupCard}>
              <div className={styles.header}>
                <h1>Create New Group</h1>
                <p>Set up a new expense sharing group with friends</p>
              </div>

              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
                {/* Group Name */}
                <div className={styles.formGroup}>
                  <label htmlFor="groupName" className={styles.label}>
                    Group Name *
                  </label>
                  <input
                    id="groupName"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className={styles.input}
                    placeholder="e.g., Weekend Trip, Roommates, etc."
                    required
                    disabled={isCreating}
                  />
                </div>

                {/* Member Selection Method */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Add Members</label>
                  <div className={styles.methodToggle}>
                    <button
                      type="button"
                      className={`${styles.toggleButton} ${useAddressBookToggle ? styles.active : ''}`}
                      onClick={() => setUseAddressBookToggle(true)}
                    >
                      From Address Book
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleButton} ${!useAddressBookToggle ? styles.active : ''}`}
                      onClick={() => setUseAddressBookToggle(false)}
                    >
                      Manual Entry
                    </button>
                  </div>
                </div>

                {/* Address Book Selection */}
                {useAddressBookToggle && addressBookEntries.length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Select from Address Book</label>
                    <div className={styles.addressBookList}>
                      {addressBookEntries.map((entry) => (
                        <label key={entry.address} className={styles.addressBookItem}>
                          <input
                            type="checkbox"
                            checked={selectedAddressBookMembers.has(entry.address)}
                            onChange={() => handleAddressBookToggle(entry.address)}
                            disabled={isCreating}
                          />
                          <div className={styles.addressBookInfo}>
                            <span className={styles.addressBookName}>{entry.name}</span>
                            <span className={styles.addressBookAddress}>
                              {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Manual Member Entry */}
                {!useAddressBookToggle && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Add Member Address</label>
                    <div className={styles.manualEntry}>
                      <input
                        type="text"
                        value={newMemberAddress}
                        onChange={(e) => setNewMemberAddress(e.target.value)}
                        className={styles.input}
                        placeholder="0x..."
                        disabled={isCreating}
                      />
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className={styles.addButton}
                        disabled={!newMemberAddress || !isValidAddress(newMemberAddress) || members.includes(newMemberAddress)}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Current Members */}
                {getAllMembers().length > 0 && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Group Members ({getAllMembers().length})</label>
                    <div className={styles.membersList}>
                      {getAllMembers().map((member) => {
                        const displayName = getDisplayName(member);

                        return (
                          <div key={member} className={styles.memberItem}>
                            <span className={styles.memberName}>{displayName}</span>
                            <span className={styles.memberAddress}>{member.slice(0, 6)}...{member.slice(-4)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              className={styles.removeButton}
                              disabled={isCreating || member === userAddress}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Submit Button or Transaction Component */}
                {!isCreating ? (
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className={styles.cancelButton}
                      disabled={isCreating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.createButton}
                      disabled={isCreating || !groupName.trim() || getAllMembers().length < 2}
                    >
                      {`Create Group (${getAllMembers().length} members)`}
                    </button>
                  </div>
                ) : (
                  <div className={styles.formActions}>
                    <button
                      type="button"
                      onClick={handleCancelTransaction}
                      className={styles.cancelButton}
                    >
                      Cancel
                    </button>
                    <div className={styles.transactionWrapper}>
                      <Transaction
                        calls={getTransactionCalls()}
                        onStatus={handleTransactionStatus}
                        isSponsored={useGasSponsorship}
                      >
                        <TransactionButton
                          className={styles.createButton}
                          disabled={!groupName.trim() || getAllMembers().length < 2}
                          text={`Create Group (${getAllMembers().length} members)${useGasSponsorship ? ' - Gas Free!' : ''}`}
                        />
                        <TransactionSponsor />
                        <TransactionStatus>
                          <TransactionStatusLabel />
                          <TransactionStatusAction />
                        </TransactionStatus>
                      </Transaction>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>

        {/* Success Modal */}
        <Modal isOpen={showSuccessModal} onClose={handleGoToGroup} title="Group Created!">
          <div className={styles.successContent}>
            <div className={styles.successIcon}>🎉</div>
            <h3>Group Created Successfully!</h3>
            <p>
              &quot;{groupName}&quot; has been created with {getAllMembers().length} members.
              You can now start adding bills and splitting expenses with your group.
            </p>
            <button onClick={handleGoToGroup} className={styles.successButton}>
              Go to Groups
            </button>
          </div>
        </Modal>
      </div>
    </WalletGuard>
  );
}
