import { formatUnits } from 'viem';
import { GroupData } from '../../utils/groupUtils';
import { UI_MESSAGES } from './constants';

/**
 * Unified error handling strategy
 */
export class GroupError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GroupError';
  }
}

export const ErrorHandler = {
  showError: (message: string) => {
    // console.error('Group Error:', message);
    // For now, we'll use alert, but this could be replaced with a toast system
    alert(message);
  },

  showSuccess: (message: string) => {
    console.log('Group Success:', message);
    // For now, we'll use alert, but this could be replaced with a toast system
    alert(message);
  },

  handleTransactionError: (error: unknown, context: string) => {
    console.error(`${context} error:`, error);
    ErrorHandler.showError(`Transaction failed. Please try again.`);
  }
};

/**
 * Business logic utilities for group operations
 */
export const GroupUtils = {
  /**
   * Check if user can perform settlement actions
   */
  canUserSettle: (groupData: GroupData) => {
    if (!groupData) return { canSettle: false, reason: 'No group data' };

    return {
      canSettle: groupData.totalOwed > 0n, // Show settle button if there are unsettled bills in the group
      reason: 'Can settle',
      isCreditor: false, // These will be calculated in getActionButtons
      isDebtor: false    // These will be calculated in getActionButtons
    };
  },

  /**
   * Check if user can propose gamble
   */
  canUserGamble: (groupData: GroupData) => {
    return {
      canGamble: groupData.totalOwed > 0n,
      reason: groupData.totalOwed === 0n ? 'No debts to gamble' : 'Can gamble'
    };
  },

  /**
   * Get process status messages
   */
  getProcessStatus: (groupData: GroupData, userBalance: bigint, hasUserApproved?: boolean, hasUserFunded?: boolean, hasUserVoted?: boolean) => {
    const { settlementActive, gambleActive } = groupData;

    if (settlementActive && gambleActive) {
      return { message: UI_MESSAGES.PROCESSES.BOTH_ACTIVE, type: 'warning' };
    }

    if (settlementActive) {
      if (userBalance > 0n && hasUserApproved) {
        return { message: UI_MESSAGES.PROCESSES.SETTLEMENT_SUCCESS_CREDITOR, type: 'success' };
      }
      if (userBalance < 0n && hasUserFunded) {
        return { message: UI_MESSAGES.PROCESSES.SETTLEMENT_SUCCESS_DEBTOR, type: 'success' };
      }
      return { message: UI_MESSAGES.PROCESSES.SETTLEMENT_ACTIVE, type: 'warning' };
    }

    if (gambleActive) {
      if (hasUserVoted) {
        return { message: UI_MESSAGES.PROCESSES.GAMBLE_SUCCESS, type: 'success' };
      }
      return { message: UI_MESSAGES.PROCESSES.GAMBLE_ACTIVE, type: 'warning' };
    }

    return null;
  },

  /**
   * Get action button configurations based on current state
   */
  getActionButtons: (
    groupData: GroupData,
    userBalance: bigint,
    hasUserApproved?: boolean,
    hasUserFunded?: boolean,
    hasUserVoted?: boolean
  ): Array<{
    key: string;
    type: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
    label: string;
    action: 'add-bill' | 'settle-up' | 'gamble' | 'approve-settlement' | 'fund-settlement' | 'reject-settlement' | 'accept-gamble' | 'reject-gamble';
    disabled?: boolean;
    title?: string;
  }> => {
    const { settlementActive, gambleActive } = groupData;

    const buttons: Array<{
      key: string;
      type: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
      label: string;
      action: 'add-bill' | 'settle-up' | 'gamble' | 'approve-settlement' | 'fund-settlement' | 'reject-settlement' | 'accept-gamble' | 'reject-gamble';
      disabled?: boolean;
      title?: string;
    }> = [];

    // Default state - no processes active
    if (!settlementActive && !gambleActive) {
      // Add Bill button - only available when no processes are active
      buttons.push({
        key: 'add-bill',
        type: 'primary',
        label: '➕ Add Bill',
        action: 'add-bill',
        title: 'Add a new bill to the group'
      });
      const canSettle = GroupUtils.canUserSettle(groupData);
      const canGamble = GroupUtils.canUserGamble(groupData);
      const isUserCreditor = userBalance > 0n;
      const isUserDebtor = userBalance < 0n;

      if (canSettle.canSettle) {
        buttons.push({
          key: 'settle-up',
          type: isUserCreditor ? 'secondary' : isUserDebtor ? 'secondary' : 'secondary',
          label: '⚖️ Settle Up',
          action: 'settle-up',
          disabled: false,
          title: isUserCreditor
            ? 'Approve settlement (you will receive money)'
            : isUserDebtor
              ? 'Fund settlement (you will pay money)'
              : 'View settlement status (your balance is settled)'
        });
      }

      if (canGamble.canGamble) {
        buttons.push({
          key: 'gamble',
          type: 'accent',
          label: '🎲 Gamble',
          action: 'gamble',
          disabled: false,
          title: 'Propose a gamble to randomly settle debts'
        });
      }
    }

    // Settlement active
    if (settlementActive && !gambleActive) {
      const isUserCreditor = userBalance > 0n;
      const isUserDebtor = userBalance < 0n;

      // Show approve button if user is a creditor and hasn't approved yet
      if (isUserCreditor && !hasUserApproved) {
        buttons.push({
          key: 'approve-settlement',
          type: 'success',
          label: '✅ Approve',
          action: 'approve-settlement',
          disabled: false,
          title: 'Approve settlement (you will receive money)'
        });
      }

      // Show fund button if user is a debtor and hasn't funded yet
      if (isUserDebtor && !hasUserFunded) {
        buttons.push({
          key: 'fund-settlement',
          type: 'warning',
          label: '💰 Fund',
          action: 'fund-settlement',
          disabled: false,
          title: 'Fund settlement (you will pay money)'
        });
      }

      // If user is already settled (balance = 0), don't show any settlement buttons
      if (userBalance === 0n) {
        return buttons;
      }

      // Show reject button only for users who haven't acted yet
      const canUserReject = (isUserCreditor && !hasUserApproved) || (isUserDebtor && !hasUserFunded);
      if (canUserReject) {
        buttons.push({
          key: 'reject-settlement',
          type: 'danger',
          label: '❌ Reject',
          action: 'reject-settlement',
          disabled: false,
          title: 'Cancel this settlement (bills remain unsettled)'
        });
      }
    }

    // Gamble active
    if (gambleActive && !settlementActive) {
      if (!hasUserVoted) {
        buttons.push({
          key: 'accept-gamble',
          type: 'success',
          label: '✅ Accept Gamble',
          action: 'accept-gamble',
          disabled: false,
          title: 'Accept the gamble proposal'
        });

        buttons.push({
          key: 'reject-gamble',
          type: 'danger',
          label: '❌ Reject Gamble',
          action: 'reject-gamble',
          disabled: false,
          title: 'Reject/Cancel the gamble proposal'
        });
      }
    }

    return buttons;
  },

  /**
   * Format error messages with dynamic values
   */
  formatMessage: (template: string, values: Record<string, string | number>) => {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return String(values[key] ?? match);
    });
  }
};

/**
 * Hook for handling async operations with consistent error handling
 */
export const useAsyncHandler = () => {
  const executeAsync = async <T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      ErrorHandler.handleTransactionError(error, context);
      throw error;
    }
  };

  return { executeAsync };
};

