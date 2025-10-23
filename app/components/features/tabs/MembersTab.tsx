'use client';

import { formatUnits } from 'viem';
import { hasCustomName } from '../../../utils/addressBook';
import { GroupMember } from '../../../utils/groupUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
import styles from './MembersTab.module.css';

interface MembersTabProps {
  members: GroupMember[];
  memberDisplayNames: {
    displayNames: Record<string, string>;
    isLoading: boolean;
    isInitialized: boolean;
    getDisplayNameForAddress: (address: `0x${string}`) => string;
  };
  userAddress?: `0x${string}`;
  onNameAdded?: () => void;
  editingAddress: `0x${string}` | null;
  setEditingAddress: (address: `0x${string}` | null) => void;
  nameInput: string;
  setNameInput: (name: string) => void;
  addAddress: (address: `0x${string}`, name: string) => void;
}

export function MembersTab({
  members,
  memberDisplayNames,
  userAddress,
  onNameAdded,
  editingAddress,
  setEditingAddress,
  nameInput,
  setNameInput,
  addAddress
}: MembersTabProps) {
  const handleAddName = (address: `0x${string}`) => {
    setEditingAddress(address);
    setNameInput('');
  };

  const handleSaveName = () => {
    if (editingAddress && nameInput.trim()) {
      addAddress(editingAddress, nameInput.trim());
      setEditingAddress(null);
      setNameInput('');
      // Trigger parent component re-render
      if (onNameAdded) {
        onNameAdded();
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setNameInput('');
  };

  return (
    <div className={styles.membersTab}>
      <div className={styles.membersList}>
        {members.map((member: GroupMember) => {
          const isPositive = member.balance > 0n;
          const isNegative = member.balance < 0n;
          const isZero = member.balance === 0n;
          const isCurrentUser = member.address.toLowerCase() === userAddress?.toLowerCase();
          const hasName = hasCustomName(member.address);
          const displayName = isCurrentUser
            ? 'You'
            : (memberDisplayNames.displayNames[member.address.toLowerCase()] || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`);

          return (
            <div key={member.address} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <div className={styles.memberName}>{displayName}</div>
                {!isCurrentUser && (
                  <div className={styles.memberAddressSection}>
                    {editingAddress === member.address ? (
                      <div className={styles.nameInputContainer}>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="Enter name..."
                          className={styles.nameInput}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <div className={styles.nameInputActions}>
                          <button
                            onClick={handleSaveName}
                            className={styles.saveNameButton}
                            disabled={!nameInput.trim()}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className={styles.cancelNameButton}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.memberAddressWithAction}>
                        <span className={styles.memberAddress}>{member.address.slice(0, 6)}...{member.address.slice(-4)}</span>
                        {!hasName && (
                          <button
                            onClick={() => handleAddName(member.address)}
                            className={styles.addNameButton}
                            title="Add name for this address"
                          >
                            + Name
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className={`${styles.memberBalance} ${isPositive ? styles.positive : isNegative ? styles.negative : styles.neutral}`}>
                {formatCurrency(member.balance)} USDC
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
