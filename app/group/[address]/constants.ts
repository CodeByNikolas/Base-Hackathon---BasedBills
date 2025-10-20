// Constants for the Group Page
export const TRANSACTION_CONFIRMATION_DELAY = 2000; // Reduced for better UX
export const APPROVAL_DELAY = 1000; // Reduced for faster approval
export const BALANCE_REFETCH_INTERVAL = 3000; // Reduced for more responsive balance updates

export const SETTLEMENT_TIMEOUT_DAYS = 7;

export const UI_MESSAGES = {
  SETTLEMENT: {
    ALREADY_APPROVED: 'You have already approved this settlement. No further action needed.',
    ALREADY_FUNDED: 'You have already funded this settlement. No further action needed.',
    INSUFFICIENT_BALANCE: 'Insufficient USDC balance. You need {neededAmount} USDC but only have {currentAmount} USDC.',
    BALANCE_CHECK_FAILED: 'Unable to check USDC balance. Please wait a moment and try again.',
    SETTLED_BALANCE: 'Your balance is settled. No action required.',
    PROCESSING: '⏳ Processing',
    APPROVE: '✅ Approve',
    FUND: '💰 Fund',
    REJECT: '❌ Reject',
  },
  GAMBLE: {
    ALREADY_VOTED: "You've already voted on this gamble. Waiting for other members to vote.",
    PROCESSING: '⏳ Processing',
    ACCEPT: '✅ Accept Gamble',
    REJECT: '❌ Reject Gamble',
    PROPOSE: '🎲 Gamble',
    REJECT_COMING_SOON: 'Settlement rejection feature coming soon!',
    PROPOSAL_FAILED: 'Gamble proposal failed. Please try again.',
    VOTE_FAILED: 'Failed to {action} gamble. Please try again.',
  },
  PROCESSES: {
    SETTLEMENT_ACTIVE: '⚠️ Settlement process is active. Adding new bills is temporarily disabled.',
    GAMBLE_ACTIVE: '⚠️ Gamble process is active. Adding new bills is temporarily disabled.',
    BOTH_ACTIVE: '⚠️ Settlement and Gamble processes are both active. Adding new bills is temporarily disabled.',
    SETTLEMENT_SUCCESS_CREDITOR: "✅ You're all set! You've approved the settlement. Just waiting for debtors to fund their payments.",
    SETTLEMENT_SUCCESS_DEBTOR: "✅ You're all set! You've funded your settlement. Just waiting for creditors to approve.",
    GAMBLE_SUCCESS: "✅ You've already voted on this gamble. Waiting for other members to vote.",
  },
  ERROR: {
    SETTLEMENT_FAILED: 'Settlement failed. Please try again.',
    GAMBLE_FAILED: 'Gamble proposal failed. Please try again.',
    REJECT_FAILED: 'Failed to reject settlement. Please try again.',
  },
} as const;

export const UNLIMITED_APPROVAL_AMOUNT = BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935');

