"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { WelcomePage } from "./components/features/WelcomePage";
import { HeaderBar } from "./components/ui/HeaderBar";
import { NetworkSelector } from "./components/ui/NetworkSelector";
import { GroupCard } from "./components/features/cards/GroupCard";
import { WalletDebug } from "./components/WalletDebug";
import { useUserGroups, useMultipleGroupsData } from "./hooks/useGroups";
import { hasUserSeenWelcome, markWelcomeAsSeen } from "./utils/welcomeUtils";
import {
  calculateOutstandingBalance,
  formatUSDCWithSymbol,
  sortGroupsByActivity,
  filterGroupsByStatus
} from "./utils/groupUtils";

/**
 * Main page component that shows either the welcome page (for non-connected users)
 * or the groups dashboard (for connected users)
 */
export default function Home() {
  const { address: userAddress, isConnected, chainId, connector } = useAccount();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled' | 'pending-settlement'>('all');
  const [showWelcome, setShowWelcome] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);


  // Check if user should see welcome page
  useEffect(() => {
    const shouldShowWelcome = isConnected && !hasUserSeenWelcome();
    setShowWelcome(shouldShowWelcome);
  }, [isConnected]);

  // Get user's groups (only if connected and not showing welcome)
  const {
    groupAddresses,
    groupCount,
    isLoading: isLoadingAddresses,
    error: addressesError,
    refetch: refetchAddresses,
    isOnWrongNetwork,
    switchToCorrectNetwork,
    correctChainId,
    hasValidContracts
  } = useUserGroups();

  // Get detailed data for all groups (only if connected)
  const {
    groupsData,
    isLoading: isLoadingGroupsData,
    error: groupsDataError,
    refetch: refetchGroupsData
  } = useMultipleGroupsData(groupAddresses);

  // Show welcome page if wallet is not connected or if connected user hasn't seen welcome
  if (!isConnected || showWelcome) {
    return <WelcomePage onContinue={() => {
      markWelcomeAsSeen();
      setShowWelcome(false);
    }} />;
  }

  const isLoading = isLoadingAddresses || isLoadingGroupsData;
  const error = addressesError || groupsDataError;

  // Calculate user's overall balance across all groups
  const outstandingBalance = groupsData.length > 0
    ? calculateOutstandingBalance(groupsData, userAddress)
    : { totalOwed: 0n, totalOwes: 0n, netBalance: 0n };

  // Filter and sort groups
  const filteredGroups = filterGroupsByStatus(groupsData, statusFilter);
  const sortedGroups = sortGroupsByActivity(filteredGroups);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchAddresses(),
        refetchGroupsData()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsSwitchingNetwork(true);
    try {
      await switchToCorrectNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
      alert(`Failed to switch network. Please manually switch to ${correctChainId === 84532 ? 'Base Sepolia' : 'Base'} in your wallet.`);
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  return (
    <div className={styles.container}>
      <HeaderBar />

      <main className={styles.main}>
      <div className={styles.content}>
          {/* Header Section */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Your Groups</h1>
              <p className={styles.subtitle}>
                Manage your expense groups and settle bills onchain
              </p>
            </div>

            {/* Network Selector */}
            <div className={styles.networkSection}>
              <NetworkSelector />
            </div>

            {/* Overall Balance Summary */}
            {groupsData.length > 0 && (
              <div className={styles.balanceSummary}>
                <div className={styles.balanceCard}>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>You&apos;re owed</span>
                    <span className={`${styles.balanceValue} ${styles.positive}`}>
                      {formatUSDCWithSymbol(outstandingBalance.totalOwed)}
                    </span>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>You owe</span>
                    <span className={`${styles.balanceValue} ${styles.negative}`}>
                      {formatUSDCWithSymbol(outstandingBalance.totalOwes)}
                    </span>
                  </div>
                  <div className={styles.balanceItem}>
                    <span className={styles.balanceLabel}>Net balance</span>
                    <span className={`${styles.balanceValue} ${
                      outstandingBalance.netBalance > 0n ? styles.positive :
                      outstandingBalance.netBalance < 0n ? styles.negative :
                      styles.neutral
                    }`}>
                      {outstandingBalance.netBalance > 0n ? '+' : outstandingBalance.netBalance < 0n ? '-' : ''}
                      {formatUSDCWithSymbol(outstandingBalance.netBalance < 0n
                        ? -outstandingBalance.netBalance
                        : outstandingBalance.netBalance)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading your groups...</p>
            </div>
          )}

          {/* Wrong Network Error State */}
          {isOnWrongNetwork && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>🔗</div>
              <h3>Network Not Supported</h3>
              <p>This app currently works on networks where the smart contracts are deployed. Please switch to a supported network.</p>
              <button
                className={styles.retryButton}
                onClick={handleSwitchNetwork}
                disabled={isSwitchingNetwork}
              >
                {isSwitchingNetwork ? 'Switching...' : `Switch to ${correctChainId === 84532 ? 'Base Sepolia' : 'Base'}`}
              </button>
            </div>
          )}

          {/* Invalid Contracts Error State */}
          {!hasValidContracts && !isOnWrongNetwork && isConnected && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Contracts Not Available</h3>
              <p>The smart contracts are not deployed on this network. Please switch to a supported network where contracts are available.</p>
              <button className={styles.retryButton} onClick={handleRefresh}>
                Try Again
              </button>
            </div>
          )}

          {/* Error State */}
          {error && !isOnWrongNetwork && hasValidContracts && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Failed to load groups</h3>
              <p>There was an error loading your groups. Please try again.</p>
              <button className={styles.retryButton} onClick={handleRefresh}>
                Try Again
              </button>
            </div>
          )}

          {/* Groups List */}
          {!isLoading && !error && !isOnWrongNetwork && hasValidContracts && (
            <>
              {groupsData.length === 0 ? (
                /* Empty State */
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📝</div>
                  <h3>No groups yet</h3>
                  <p>Create your first group to start splitting expenses</p>
                  <Link href="/create-group" className={styles.createButton}>
                    Create Group
                  </Link>
                </div>
              ) : (
                /* Groups List with Filters */
                <div className={styles.groupsSection}>
                  <div className={styles.groupsHeader}>
                    <div className={styles.groupsTitle}>
                      <h2>Your Groups ({groupCount})</h2>
                      <button
                        className={`${styles.refreshButton} ${isRefreshing ? styles.refreshing : ''}`}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refresh groups data"
                      >
                        <svg
                          className={styles.refreshIcon}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Status Filter */}
                    <div className={styles.filterSection}>
                      <label className={styles.filterLabel}>Filter:</label>
                      <select
                        className={styles.filterSelect}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'settled' | 'pending-settlement')}
                      >
                        <option value="all">All Groups</option>
                        <option value="active">Active (Unsettled)</option>
                        <option value="pending-settlement">Pending Settlement</option>
                        <option value="settled">All Settled</option>
                      </select>
                    </div>
                  </div>

                  {/* Create Group Button */}
                  <div className={styles.createGroupSection}>
                    <Link href="/create-group" className={styles.createGroupButton}>
                      <span className={styles.createIcon}>+</span>
                      New Group
                    </Link>
                  </div>

                  {/* Groups Grid */}
                  <div className={styles.groupsGrid}>
                    {sortedGroups.map((group) => (
                      <GroupCard key={group.address} group={group} />
                    ))}
                  </div>

                  {filteredGroups.length === 0 && groupsData.length > 0 && (
                    <div className={styles.noFilterResults}>
                      <p>No groups match the selected filter.</p>
                      <button
                        className={styles.clearFilterButton}
                        onClick={() => setStatusFilter('all')}
                      >
                        Show All Groups
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Debug component for wallet troubleshooting */}
      <WalletDebug />
    </div>
  );
}
