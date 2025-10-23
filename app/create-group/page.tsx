'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletGuard } from '../components/features/WalletGuard';
import { HeaderBar } from '../components/ui/HeaderBar';
import { Modal } from '../components/ui/Modal';
import { useAddressBook } from '../hooks/useAddressBook';
import { useUserGroups } from '../hooks/useGroups';
import { useSponsoredTransactions } from '../hooks/useSponsoredTransactions';
import { GROUP_FACTORY_ABI, getContractAddresses } from '../config/contracts';
import { isValidAddress, formatAddress, getDisplayNameForAddress } from '../utils/addressBook';
import styles from './CreateGroup.module.css';

export default function CreateGroupPage() {
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const addressBookData = useAddressBook();
  const { addressBook, isInitialized } = addressBookData;
  const { refetch: refetchGroups } = useUserGroups();
  const { sendTransaction, isLoading: isTransactionLoading } = useSponsoredTransactions();

  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [useAddressBookToggle, setUseAddressBookToggle] = useState(true);
  const [selectedAddressBookMembers, setSelectedAddressBookMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // Initialize with current user as first member
  useEffect(() => {
    if (userAddress && !members.includes(userAddress)) {
      setMembers([userAddress]);
    }
  }, [userAddress, members]);


  const handleAddMember = () => {
    if (newMemberAddress && isValidAddress(newMemberAddress) && !members.includes(newMemberAddress)) {
      setMembers([...members, newMemberAddress]);
      setNewMemberAddress('');
    }
  };

  const handleCancelTransaction = () => {
    setIsCreating(false);
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
    return getDisplayNameForAddress(address as `0x${string}`, { currentUserAddress: userAddress });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || getAllMembers().length < 2) {
      alert('Please enter a group name and select at least 2 members');
      return;
    }

    setIsCreating(true);

    try {
      const allMembers = getAllMembers();
      const result = await sendTransaction({
        address: getContractAddresses().groupFactory as `0x${string}`,
        abi: GROUP_FACTORY_ABI,
        functionName: 'createGroup',
        args: [allMembers as `0x${string}`[], groupName.trim()],
      });

      // Transaction successful
      setIsCreating(false);
      setShowSuccessModal(true);
      refetchGroups();

    } catch (error) {
      console.error('Error creating group:', error);
      setIsCreating(false);
      alert('Failed to create group. Please try again.');
    }
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

              <form className={styles.form}>
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
                              {formatAddress(entry.address as `0x${string}`)}
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
                            <span className={styles.memberAddress}>{formatAddress(member as `0x${string}`)}</span>
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
                      type="button"
                      className={styles.createButton}
                      onClick={handleCreateGroup}
                      disabled={isCreating || isTransactionLoading || !groupName.trim() || getAllMembers().length < 2}
                    >
                      Create Group ({getAllMembers().length} members)
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
                    <button
                      type="button"
                      className={styles.createButton}
                      onClick={handleCreateGroup}
                      disabled={isTransactionLoading || !groupName.trim() || getAllMembers().length < 2}
                    >
                      {isTransactionLoading ? 'Creating Group...' : 'Create Group (' + getAllMembers().length + ' members)'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>

        {/* Success Modal */}
        <Modal isOpen={showSuccessModal} onClose={handleGoToGroup}>
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
