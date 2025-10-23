'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { HeaderBar } from '../../components/ui/HeaderBar';
import { AddBillModal } from '../../components/features/modals/AddBillModal';
import { OverviewTab } from '../../components/features/tabs/OverviewTab';
import { BillsTab } from '../../components/features/tabs/BillsTab';
import { MembersTab } from '../../components/features/tabs/MembersTab';
import { WalletGuard } from '../../components/features/WalletGuard';
import { useGroupData } from '../../hooks/useGroups';
import { useBatchDisplayNames, useAddressBook } from '../../hooks/useAddressBook';
import { formatUnits } from 'viem';
import { GROUP_ABI, USDC_ABI, getContractAddresses, isTestnet } from '../../config/contracts';
import { ActionButtons } from './components/ActionButtons';
import { SuccessMessage, WarningMessage } from './components/ProcessWarning';
import styles from './GroupPage.module.css';

export default function GroupPage() {
  const params = useParams();
  const router = useRouter();
  const { address: userAddress } = useAccount();
  const groupAddress = params.address as `0x${string}`;

  const { groupData, isLoading, error, refetch: refetchGroupData } = useGroupData(groupAddress);
  const [activeTab, setActiveTab] = useState<'overview' | 'bills' | 'members'>('overview');
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingAddress, setEditingAddress] = useState<`0x${string}` | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [isTxPending, setIsTxPending] = useState(false);
  const [latestTxHash, setLatestTxHash] = useState<`0x${string}` | null>(null);

  // Use correct USDC address from group contract
  const usdcAddress = groupData?.usdcAddress || getContractAddresses().usdc;

  // USDC balance check - use correct USDC address from group
  const { data: usdcBalance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!usdcAddress,
      refetchInterval: 5000, // Refetch every 5 seconds to ensure fresh balance
    },
  });

  // USDC approval check - use correct USDC address from group
  const { data: usdcAllowance } = useReadContract({
    address: usdcAddress as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: userAddress && groupAddress ? [userAddress, groupAddress] : undefined,
    query: {
      enabled: !!userAddress && !!groupAddress && !!usdcAddress,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Check if user has already approved settlement (for creditors)
  const { data: hasUserApproved } = useReadContract({
    address: groupAddress,
    abi: GROUP_ABI,
    functionName: 'hasApproved',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && groupData?.settlementActive,
    },
  });

  // Check if user has already funded settlement (for debtors)
  const { data: hasUserFunded } = useReadContract({
    address: groupAddress,
    abi: GROUP_ABI,
    functionName: 'hasFunded',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && groupData?.settlementActive,
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

  const refreshAllData = () => {
    refetchGroupData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTransactionStarted = (txHash: `0x${string}`) => {
    setLatestTxHash(txHash);
    setIsTxPending(true);
    // Clear pending state after a delay (in a real app, you'd wait for confirmation)
    setTimeout(() => {
      setIsTxPending(false);
      setLatestTxHash(null);
    }, 5000);
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

  // Show loading state while display names are initializing
  if (!memberDisplayNames.isInitialized) {
    return (
      <WalletGuard>
        <div className={styles.container}>
          <HeaderBar />
          <main className={styles.main}>
            <div className={styles.content}>
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Loading display names...</p>
              </div>
            </div>
          </main>
        </div>
      </WalletGuard>
    );
  }

  // Show loading state while group data is loading
  if (isLoading) {
    return (
      <div className={styles.container}>
        <HeaderBar />
        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading group...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state if there's an error or no group data
  if (error || !groupData) {
    return (
      <div className={styles.container}>
        <HeaderBar />
        <main className={styles.main}>
          <div className={styles.content}>
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <h2>Group Not Found</h2>
              <p>The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
              <button onClick={() => router.push('/')} className={styles.backButton}>
                ← Back to Groups
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <WalletGuard>
      <div className={styles.container}>
        <HeaderBar />

        <main className={styles.main}>
          <div className={styles.content}>
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
              {activeTab === 'overview' && (
                <OverviewTab groupData={groupData} memberDisplayNames={memberDisplayNames} />
              )}
              {activeTab === 'bills' && <BillsTab bills={groupData.bills} />}
              {activeTab === 'members' && (
                <MembersTab
                  members={groupData.members}
                  memberDisplayNames={memberDisplayNames}
                  userAddress={userAddress}
                  onNameAdded={handleNameAdded}
                  editingAddress={editingAddress}
                  setEditingAddress={setEditingAddress}
                  nameInput={nameInput}
                  setNameInput={setNameInput}
                  addAddress={addAddress}
                />
              )}
            </div>

            {/* Success Messages - Show above action buttons */}
            <SuccessMessage
              groupData={groupData}
              userBalance={userBalance}
              hasUserApproved={hasUserApproved}
              hasUserFunded={hasUserFunded}
              hasUserVoted={groupData.hasUserVoted}
            />

            {/* Transaction Pending Indicator */}
            {isTxPending && latestTxHash && (
              <div className={styles.transactionPending}>
                ⏳ Transaction pending confirmation...
              </div>
            )}

            {/* Action Buttons - Now handled by reusable component */}
            <ActionButtons
              groupData={groupData}
              groupAddress={groupAddress}
              userAddress={userAddress}
              usdcBalance={usdcBalance}
              usdcAllowance={usdcAllowance}
              hasUserApproved={hasUserApproved}
              hasUserFunded={hasUserFunded}
              hasUserVoted={groupData.hasUserVoted}
              onActionSuccess={() => refreshAllData()}
              onTransactionStarted={handleTransactionStarted}
              onShowAddBillModal={() => setShowAddBillModal(true)}
            />

            {/* Warning Messages - Show below action buttons */}
            <WarningMessage
              groupData={groupData}
              userBalance={userBalance}
              hasUserApproved={hasUserApproved}
              hasUserFunded={hasUserFunded}
              hasUserVoted={groupData.hasUserVoted}
            />
          </div>
        </main>

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

