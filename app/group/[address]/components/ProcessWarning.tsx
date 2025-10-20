'use client';

import { GroupData } from '../../../utils/groupUtils';
import { GroupUtils } from '../utils';
import styles from './ProcessWarning.module.css';

interface ProcessWarningProps {
  groupData: GroupData;
  userBalance: bigint;
  hasUserApproved?: boolean;
  hasUserFunded?: boolean;
  hasUserVoted?: boolean;
  type?: 'success' | 'warning';
}

export function ProcessWarning({
  groupData,
  userBalance,
  hasUserApproved,
  hasUserFunded,
  hasUserVoted,
  type
}: ProcessWarningProps) {
  const processStatus = GroupUtils.getProcessStatus(
    groupData,
    userBalance,
    hasUserApproved,
    hasUserFunded,
    hasUserVoted
  );

  if (!processStatus) {
    return null;
  }

  // Filter by type if specified
  if (type && processStatus.type !== type) {
    return null;
  }

  const { message, type: messageType } = processStatus;

  return (
    <div className={`${styles.processWarning} ${styles[messageType]}`}>
      {message}
    </div>
  );
}

// Separate success and warning components for better organization
export function SuccessMessage(props: Omit<ProcessWarningProps, 'type'>) {
  return <ProcessWarning {...props} type="success" />;
}

export function WarningMessage(props: Omit<ProcessWarningProps, 'type'>) {
  return <ProcessWarning {...props} type="warning" />;
}


