'use client';

import { formatUnits } from 'viem';
import { GroupData, Bill } from '../../../utils/groupUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
import styles from './OverviewTab.module.css';

interface OverviewTabProps {
  groupData: GroupData;
  memberDisplayNames: {
    displayNames: Record<string, string>;
    isLoading: boolean;
    isInitialized: boolean;
    getDisplayNameForAddress: (address: `0x${string}`) => string;
  };
}

export function OverviewTab({ groupData, memberDisplayNames: _memberDisplayNames }: OverviewTabProps) {
  return (
    <div className={styles.overviewTab}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <h4>Total Owed</h4>
          <div className={styles.amount}>{formatCurrency(groupData.totalOwed)} USDC</div>
        </div>

        <div className={styles.summaryCard}>
          <h4>Group State</h4>
          <div className={styles.status}>
            {groupData.settlementActive
              ? '🔄 Settlement in Progress'
              : groupData.gambleActive
                ? '🎲 Gamble in Progress'
                : '✅ Ready for Bills'
            }
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
                {formatCurrency(bill.totalAmount)} USDC
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
