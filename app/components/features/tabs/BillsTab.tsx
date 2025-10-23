'use client';

import { formatUnits } from 'viem';
import { Bill } from '../../../utils/groupUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
import styles from './BillsTab.module.css';

interface BillsTabProps {
  bills: Bill[];
}

export function BillsTab({ bills }: BillsTabProps) {
  return (
    <div className={styles.billsTab}>
      <div className={styles.billsList}>
        {bills.map((bill: Bill) => (
          <div key={bill.id} className={styles.billCard}>
            <div className={styles.billHeader}>
              <h4>{bill.description}</h4>
              <span className={styles.billAmount}>{formatCurrency(bill.totalAmount)} USDC</span>
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
