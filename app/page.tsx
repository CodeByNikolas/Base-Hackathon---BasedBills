"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { WelcomePage } from "./components/features/WelcomePage";
import { HeaderBar } from "./components/ui/HeaderBar";
import { GroupCard } from "./components/features/cards/GroupCard";
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
  const { isConnected } = useAccount();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled' | 'pending-settlement'>('all');
  const [showWelcome, setShowWelcome] = useState(false);

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
    refetch: refetchAddresses
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
    ? calculateOutstandingBalance(groupsData)
    : { totalOwed: 0n, totalOwes: 0n, netBalance: 0n };

  // Filter and sort groups
  const filteredGroups = filterGroupsByStatus(groupsData, statusFilter);
  const sortedGroups = sortGroupsByActivity(filteredGroups);

  const handleRefresh = () => {
    refetchAddresses();
    refetchGroupsData();
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
                      {formatUSDCWithSymbol(outstandingBalance.netBalance < 0n
                        ? -outstandingBalance.netBalance
                        : outstandingBalance.netBalance)}
                      {outstandingBalance.netBalance < 0n && ' owed'}
                      {outstandingBalance.netBalance > 0n && ' owed to you'}
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

          {/* Error State */}
          {error && (
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
          {!isLoading && !error && (
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
                      <button className={styles.refreshButton} onClick={handleRefresh}>
                        🔄
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
                      Create New Group
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
    </div>
  );
}
