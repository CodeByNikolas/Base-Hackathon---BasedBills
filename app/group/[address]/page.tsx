'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { AddBillModal } from '../../components/features/AddBillModal';
import { WalletGuard } from '../../components/features/WalletGuard';
import { useGroupData } from '../../hooks/useGroups';
import { useBatchDisplayNames, useAddressBook } from '../../hooks/useAddressBook';
import { formatUnits, parseUnits } from 'viem';
import { hasCustomName } from '../../utils/addressBook';
import { GroupData, GroupMember, Bill } from '../../utils/groupUtils';
import { GROUP_ABI, USDC_ABI, getContractAddresses } from '../../config/contracts';
import styles from './GroupPage.module.css';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { address: userAddress, chain } = useAccount();
  const groupAddress = params.address as `0x${string}`;

  const { groupData, isLoading, error, refetch: refetchGroupData } = useGroupData(groupAddress);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'members'>('overview');
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingAddress, setEditingAddress] = useState<`0x${string}` | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isProcessingSettlement, setIsProcessingSettlement] = useState(false);
  const [isProcessingGamble, setIsProcessingGamble] = useState(false);

  // Contract interaction hooks
  const { writeContractAsync } = useWriteContract();

  // USDC approval check
  const { data: usdcAllowance } = useReadContract({
    address: getContractAddresses(chain?.id || 84532).usdc as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: userAddress && groupAddress ? [userAddress, groupAddress] : undefined,
    query: {
      enabled: !!userAddress && !!groupAddress && !!chain?.id,
    },
  });

  // Get display names for all members - ensure consistent hook call
  const membersAddresses = useMemo(() =>
    groupData?.members?.map((m: { address: `0x${string}` }) => m.address) || [],
    [groupData?.members]
  );
  const memberDisplayNames = useBatchDisplayNames(membersAddresses, refreshTrigger);
  const { addAddress } = useAddressBook();

  const handleNameAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Error logging effect - must be before any conditional returns
  useEffect(() => {
    if (error) {
      console.error('Error loading group:', error);
    }
  }, [error]);

  // Calculate user balance only if we have the data
  const userBalance = groupData?.members?.find(m => m.address.toLowerCase() === userAddress?.toLowerCase())?.balance || 0n;
  const isUserCreditor = userBalance > 0n;
  const isUserDebtor = userBalance < 0n;

  // Handle settlement based on user role
  const handleSettleUp = async () => {
    if (!userAddress || !groupData) return;

    setIsProcessingSettlement(true);
    try {
      if (userBalance > 0n) {
        // User is a creditor - start settlement and approve in one transaction
        await writeContractAsync({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'approveSettlement',
        });
      } else if (userBalance < 0n) {
        // User is a debtor - check approval first
        const amountOwed = BigInt(-userBalance);
        const currentAllowance = usdcAllowance || 0n;

        if (currentAllowance < amountOwed) {
          // Need to approve USDC spending first
          await writeContractAsync({
            address: getContractAddresses(chain?.id || 84532).usdc as `0x${string}`,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [groupAddress, amountOwed],
          });

          // Wait a moment for approval to be confirmed
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Start settlement and fund in one transaction
        await writeContractAsync({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'fundSettlement',
        });
      } else {
        // Balance is 0 - no action needed
        alert('Your balance is settled. No action required.');
        return;
      }

      // Wait for transaction confirmation before refreshing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh data after successful transaction confirmation
      await refetchGroupData();
    } catch (error) {
      console.error('Settlement error:', error);
      alert('Settlement failed. Please try again.');
    } finally {
      setIsProcessingSettlement(false);
    }
  };

  // Handle gamble proposal
  const handleGamble = async () => {
    if (!groupData) return;

    setIsProcessingGamble(true);
    try {
      await writeContractAsync({
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'proposeGamble',
      });

      // Wait for transaction confirmation before refreshing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh data after successful transaction confirmation
      await refetchGroupData();
    } catch (error) {
      console.error('Gamble proposal error:', error);
      alert('Gamble proposal failed. Please try again.');
    } finally {
      setIsProcessingGamble(false);
    }
  };

  // Show loading state while display names are initializing
  if (!memberDisplayNames.isInitialized) {
    return (
      <WalletGuard>
        <div className={styles.container}>
          <HeaderBar />
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading display names...</p>
          </div>
        </div>
      </WalletGuard>
    );
  }

  // Show loading state while group data is loading
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

  // Show error state if there's an error or no group data
  if (error || !groupData) {
    return (
      <div className={styles.container}>
        <HeaderBar />
        <div className={styles.error}>
          <h2>Group Not Found</h2>
          <p>The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            ← Back to Groups
          </button>
        </div>
      </div>
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
            ← Back
          </button>
        </div>

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
        {activeTab === 'members' && <MembersTab
          members={groupData.members}
          memberDisplayNames={memberDisplayNames}
          userAddress={userAddress}
          onNameAdded={handleNameAdded}
          editingAddress={editingAddress}
          setEditingAddress={setEditingAddress}
          nameInput={nameInput}
          setNameInput={setNameInput}
          addAddress={addAddress}
        />}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${styles.primary} ${
            (groupData.settlementActive || groupData.gambleActive) ? styles.disabled : ''
          }`}
          onClick={() => setShowAddBillModal(true)}
          disabled={groupData.settlementActive || groupData.gambleActive}
          title={
            (groupData.settlementActive || groupData.gambleActive)
              ? 'Cannot add bills while settlement or gamble process is active'
              : 'Add a new bill to the group'
          }
        >
          ➕ Add Bill
        </button>

        {groupData.totalOwed > 0n && userBalance !== 0n && (
            <button
              className={`${styles.actionButton} ${styles.secondary}`}
              onClick={handleSettleUp}
              disabled={groupData.settlementActive || groupData.gambleActive || isProcessingSettlement || userBalance === 0n}
              title={
                userBalance === 0n
                  ? 'Your balance is settled. No action required.'
                  : groupData.settlementActive || groupData.gambleActive
                    ? 'Cannot settle while other processes are active'
                    : isUserCreditor
                      ? 'Start settlement and approve (you will receive money)'
                      : isUserDebtor
                        ? 'Start settlement and fund (you will pay money)'
                        : 'Your balance is settled'
              }
            >
              {isProcessingSettlement ? '⏳ Processing' : '⚖️ Settle Up'}
            </button>
        )}

        {groupData.totalOwed > 0n && (
          <button
            className={`${styles.actionButton} ${styles.accent}`}
            onClick={handleGamble}
            disabled={groupData.settlementActive || groupData.gambleActive || isProcessingGamble}
            title={
              groupData.settlementActive || groupData.gambleActive
                ? 'Cannot gamble while other processes are active'
                : 'Propose a gamble to randomly settle debts'
            }
          >
            {isProcessingGamble ? '⏳ Processing' : '🎲 Gamble'}
          </button>
        )}
      </div>

      {/* Process Active Warning */}
      {(groupData.settlementActive || groupData.gambleActive) && (
        <div className={styles.processWarning}>
          {groupData.settlementActive && groupData.gambleActive ? (
            <p>⚠️ Settlement and Gamble processes are both active. Adding new bills is temporarily disabled.</p>
          ) : groupData.settlementActive ? (
            <p>⚠️ Settlement process is active. Adding new bills is temporarily disabled.</p>
          ) : (
            <p>⚠️ Gamble process is active. Adding new bills is temporarily disabled.</p>
          )}
        </div>
      )}

        {/* Add Bill Modal */}
        <AddBillModal
          isOpen={showAddBillModal && !(groupData.settlementActive || groupData.gambleActive)}
          onClose={() => setShowAddBillModal(false)}
          groupAddress={groupAddress}
          groupMembers={groupData.members}
          isProcessActive={groupData.settlementActive || groupData.gambleActive}
          onBillAdded={() => refetchGroupData()}
        />
      </div>
    </WalletGuard>
  );
}

// Overview Tab Component
function OverviewTab({ groupData, memberDisplayNames: _memberDisplayNames }: { groupData: GroupData, memberDisplayNames: { displayNames: Record<string, string>; isLoading: boolean; isInitialized: boolean; getDisplayNameForAddress: (address: `0x${string}`) => string } }) {
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
          {groupData.bills.slice(0, 3).map((bill: Bill) => (
            <div key={bill.id} className={styles.activityItem}>
              <div className={styles.activityInfo}>
                <span className={styles.activityDescription}>{bill.description}</span>
                <span className={styles.activityDate}>
                  {new Date(Number(bill.timestamp)).toLocaleDateString()}
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
function BillsTab({ bills }: { bills: Bill[] }) {
  return (
    <div className={styles.billsTab}>
      <div className={styles.billsList}>
        {bills.map((bill: Bill) => (
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
function MembersTab({
  members,
  memberDisplayNames,
  userAddress,
  onNameAdded,
  editingAddress,
  setEditingAddress,
  nameInput,
  setNameInput,
  addAddress
}: {
  members: GroupMember[],
  memberDisplayNames: { displayNames: Record<string, string>; isLoading: boolean; isInitialized: boolean; getDisplayNameForAddress: (address: `0x${string}`) => string },
  userAddress?: `0x${string}`,
  onNameAdded?: () => void,
  editingAddress: `0x${string}` | null,
  setEditingAddress: (address: `0x${string}` | null) => void,
  nameInput: string,
  setNameInput: (name: string) => void,
  addAddress: (address: `0x${string}`, name: string) => void
}) {

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
          const balance = formatUnits(member.balance, 6);
          const isPositive = member.balance > 0n;
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
