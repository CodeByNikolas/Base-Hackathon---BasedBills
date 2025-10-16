'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { HeaderBar } from '../../components/HeaderBar';
import { Modal } from '../../components/Modal';
import { AddBillModal } from '../../components/AddBillModal';
import { WalletGuard } from '../../components/WalletGuard';
import { useGroupData } from '../../hooks/useGroups';
import { useBatchDisplayNames, useAddressBook } from '../../hooks/useAddressBook';
import { formatUnits } from 'viem';
import { hasCustomName } from '../../utils/addressBook';
import styles from './GroupPage.module.css';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const groupAddress = params.address as `0x${string}`;

  const { groupData, isLoading, error } = useGroupData(groupAddress);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'members'>('overview');
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get display names for all members
  const memberDisplayNames = useBatchDisplayNames(
    groupData?.members.map((m: { address: `0x${string}` }) => m.address) || [],
    refreshTrigger
  );

  const handleNameAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (error) {
      console.error('Error loading group:', error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <HeaderBar />
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (error || !groupData) {
    return (
      <div className={styles.container}>
        <HeaderBar />
        <div className={styles.error}>
          <h2>Group Not Found</h2>
          <p>The group you're looking for doesn't exist or you don't have access to it.</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            ← Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const userBalance = groupData.members.find(m => m.address.toLowerCase() === userAddress?.toLowerCase())?.balance || 0n;
  const isUserCreditor = userBalance > 0n;
  const isUserDebtor = userBalance < 0n;

  return (
    <WalletGuard>
      <div className={styles.container}>
        <HeaderBar />

        {/* Group Header */}
      <div className={styles.groupHeader}>
        <div className={styles.groupInfo}>
          <h1 className={styles.groupName}>{groupData.name}</h1>
          <p className={styles.groupAddress}>{groupAddress.slice(0, 6)}...{groupAddress.slice(-4)}</p>
        </div>

        <div className={styles.groupStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Members</span>
            <span className={styles.statValue}>{groupData.memberCount}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Bills</span>
            <span className={styles.statValue}>{groupData.bills.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Unsettled Bills</span>
            <span className={styles.statValue}>{groupData.unsettledBills.length}</span>
          </div>
        </div>
      </div>

      {/* User Balance Card */}
      <div className={styles.balanceCard}>
        <h3>Your Balance</h3>
        <div className={`${styles.balance} ${isUserCreditor ? styles.positive : isUserDebtor ? styles.negative : styles.neutral}`}>
          {isUserCreditor ? '+' : ''}{formatUnits(userBalance, 6)} USDC
        </div>
        <p className={styles.balanceDescription}>
          {isUserCreditor ? 'Others owe you money' :
           isUserDebtor ? 'You owe others money' :
           'All settled up!'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'bills' ? styles.active : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          Bills ({groupData.bills.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'members' ? styles.active : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({groupData.memberCount})
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && <OverviewTab groupData={groupData} memberDisplayNames={memberDisplayNames} />}
        {activeTab === 'bills' && <BillsTab bills={groupData.bills} />}
        {activeTab === 'members' && <MembersTab members={groupData.members} memberDisplayNames={memberDisplayNames} userAddress={userAddress} onNameAdded={handleNameAdded} />}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${styles.primary}`}
          onClick={() => setShowAddBillModal(true)}
        >
          ➕ Add Bill
        </button>

        {groupData.totalOwed > 0n && (
          <>
            <button className={`${styles.actionButton} ${styles.secondary}`}>
              ⚖️ Settle Up
            </button>
            <button className={`${styles.actionButton} ${styles.accent}`}>
              🎲 Gamble
            </button>
          </>
        )}
      </div>

        {/* Add Bill Modal */}
        <AddBillModal
          isOpen={showAddBillModal}
          onClose={() => setShowAddBillModal(false)}
          groupAddress={groupAddress}
          groupMembers={groupData.members}
        />
      </div>
    </WalletGuard>
  );
}

// Overview Tab Component
function OverviewTab({ groupData, memberDisplayNames }: { groupData: any, memberDisplayNames: any }) {
  return (
    <div className={styles.overviewTab}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <h4>Total Owed</h4>
          <div className={styles.amount}>{formatUnits(groupData.totalOwed, 6)} USDC</div>
        </div>

        <div className={styles.summaryCard}>
          <h4>Settlement Status</h4>
          <div className={styles.status}>
            {groupData.settlementActive ? '🔄 Active' : '✅ Settled'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <h4>Gamble Status</h4>
          <div className={styles.status}>
            {groupData.gambleActive ? '🎲 Active' : '⏸️ Inactive'}
          </div>
        </div>
      </div>

      <div className={styles.recentActivity}>
        <h4>Recent Activity</h4>
        <div className={styles.activityList}>
          {groupData.bills.slice(0, 3).map((bill: any) => (
            <div key={bill.id} className={styles.activityItem}>
              <div className={styles.activityInfo}>
                <span className={styles.activityDescription}>{bill.description}</span>
                <span className={styles.activityDate}>
                  {new Date(Number(bill.timestamp) * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.activityAmount}>
                {formatUnits(bill.totalAmount, 6)} USDC
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Bills Tab Component
function BillsTab({ bills }: { bills: any[] }) {
  return (
    <div className={styles.billsTab}>
      <div className={styles.billsList}>
        {bills.map((bill) => (
          <div key={bill.id} className={styles.billCard}>
            <div className={styles.billHeader}>
              <h4>{bill.description}</h4>
              <span className={styles.billAmount}>{formatUnits(bill.totalAmount, 6)} USDC</span>
            </div>
            <div className={styles.billDetails}>
              <span>Payer: {bill.payer.slice(0, 6)}...{bill.payer.slice(-4)}</span>
              <span>{new Date(Number(bill.timestamp) * 1000).toLocaleDateString()}</span>
            </div>
            <div className={styles.billParticipants}>
              <span>Split between {bill.participants.length} people</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Members Tab Component
function MembersTab({ members, memberDisplayNames, userAddress, onNameAdded }: { members: any[], memberDisplayNames: any, userAddress?: `0x${string}`, onNameAdded?: () => void }) {
  const [editingAddress, setEditingAddress] = useState<`0x${string}` | null>(null);
  const [nameInput, setNameInput] = useState('');
  const { addAddress } = useAddressBook();

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
        {members.map((member: { address: `0x${string}`; balance: bigint }) => {
          const balance = formatUnits(member.balance, 6);
          const isPositive = member.balance > 0n;
          const isCurrentUser = member.address.toLowerCase() === userAddress?.toLowerCase();
          const hasName = hasCustomName(member.address);
          const displayName = isCurrentUser
            ? 'You'
            : (memberDisplayNames.displayNames?.[member.address.toLowerCase()] || `${member.address.slice(0, 6)}...${member.address.slice(-4)}`);

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
              <div className={`${styles.memberBalance} ${isPositive ? styles.positive : styles.negative}`}>
                {isPositive ? '+' : ''}{balance} USDC
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
