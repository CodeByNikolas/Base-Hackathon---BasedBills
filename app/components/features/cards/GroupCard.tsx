"use client";
import { useAccount } from 'wagmi';
import Link from 'next/link';
import styles from './GroupCard.module.css';
import { GroupData } from '../../../utils/groupUtils';
import {
  getUserGroupStatus,
  formatUSDCWithSymbol,
  getGroupActivitySummary,
  getRelativeTime,
} from '../../../utils/groupUtils';

interface GroupCardProps {
  group: GroupData;
}

export function GroupCard({ group }: GroupCardProps) {
  const { address: userAddress } = useAccount();
  
  if (!userAddress) return null;
  
  const userStatus = getUserGroupStatus(userAddress, group.members);
  const activitySummary = getGroupActivitySummary(group);

  // Determine status badge
  let statusBadge = null;
  let statusClass = '';
  
  if (group.settlementActive) {
    statusBadge = 'Settlement Active';
    statusClass = styles.statusSettlement;
  } else if (group.gambleActive) {
    statusBadge = 'Gamble Active';
    statusClass = styles.statusGamble;
  } else if (activitySummary.unsettledBills > 0) {
    statusBadge = 'Has Unsettled Bills';
    statusClass = styles.statusUnsettled;
  } else if (activitySummary.totalBills > 0) {
    statusBadge = 'All Settled';
    statusClass = styles.statusSettled;
  } else {
    statusBadge = 'No Activity';
    statusClass = styles.statusEmpty;
  }

  return (
    <Link href={`/group/${group.address}`} className={styles.cardLink}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.groupInfo}>
            <h3 className={styles.groupName}>{group.name}</h3>
            <p className={styles.memberCount}>
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className={`${styles.statusBadge} ${statusClass}`}>
            {statusBadge}
          </div>
        </div>

        {/* User Balance */}
        <div className={styles.userBalance}>
          <div className={styles.balanceLabel}>Your balance:</div>
          <div className={`${styles.balanceAmount} ${
            userStatus.status === 'creditor' ? styles.positive :
            userStatus.status === 'debtor' ? styles.negative :
            styles.neutral
          }`}>
            {userStatus.statusText}
          </div>
        </div>

        {/* Activity Summary */}
        <div className={styles.activitySummary}>
          <div className={styles.activityItem}>
            <span className={styles.activityLabel}>Total Bills:</span>
            <span className={styles.activityValue}>{activitySummary.totalBills}</span>
          </div>
          
          {activitySummary.unsettledBills > 0 && (
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Unsettled:</span>
              <span className={styles.activityValue}>
                {activitySummary.unsettledBills} bills • {formatUSDCWithSymbol(activitySummary.unsettledAmount)}
              </span>
            </div>
          )}
          
          {activitySummary.totalSpent > 0n && (
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Total Spent:</span>
              <span className={styles.activityValue}>
                {formatUSDCWithSymbol(activitySummary.totalSpent)}
              </span>
            </div>
          )}
          
          {activitySummary.lastActivity && (
            <div className={styles.activityItem}>
              <span className={styles.activityLabel}>Last Activity:</span>
              <span className={styles.activityValue}>
                {getRelativeTime(BigInt(Math.floor(activitySummary.lastActivity.getTime() / 1000)))}
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions Indicator */}
        <div className={styles.quickActions}>
          {group.settlementActive && (
            <div className={styles.actionIndicator}>
              <span className={styles.actionIcon}>⚡</span>
              <span>Settlement Ready</span>
            </div>
          )}
          {group.gambleActive && (
            <div className={styles.actionIndicator}>
              <span className={styles.actionIcon}>🎲</span>
              <span>Gamble Voting</span>
            </div>
          )}
          {activitySummary.unsettledBills > 0 && !group.settlementActive && !group.gambleActive && (
            <div className={styles.actionIndicator}>
              <span className={styles.actionIcon}>💰</span>
              <span>Ready to Settle</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
