import { formatUnits, parseUnits } from 'viem';
import { formatCurrency } from './currencyUtils';
import { shortenAddress } from './addressBook';

// Types for our data structures
export interface Bill {
  id: bigint;
  description: string;
  totalAmount: bigint;
  payer: `0x${string}`;
  participants: `0x${string}`[];
  amounts: bigint[];
  timestamp: bigint;
  settlementId: bigint;
}

export interface GroupMember {
  address: `0x${string}`;
  balance: bigint; // positive = owed money, negative = owes money
  name?: string; // Optional display name
}

export interface GroupData {
  address: `0x${string}`;
  name: string;
  members: GroupMember[];
  bills: Bill[];
  unsettledBills: Bill[];
  settlementActive: boolean;
  gambleActive: boolean;
  hasUserVoted?: boolean; // Whether the current user has voted on the active gamble
  totalOwed: bigint;
  memberCount: number;
  usdcAddress?: `0x${string}`; // USDC address from the group contract
}

export interface SettlementBreakdown {
  creditors: { address: `0x${string}`; amount: bigint }[];
  debtors: { address: `0x${string}`; amount: bigint }[];
  totalOwed: bigint;
  canSettle: boolean;
}

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: bigint): string {
  return formatCurrency(amount, USDC_DECIMALS);
}

/**
 * Parse USDC amount from string input
 */
export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

/**
 * Format USDC with currency symbol
 */
export function formatUSDCWithSymbol(amount: bigint): string {
  return `$${formatCurrency(amount, USDC_DECIMALS)}`;
}

/**
 * Calculate total outstanding balance for a user across all their groups
 */
export function calculateOutstandingBalance(groups: GroupData[], userAddress?: `0x${string}`): {
  totalOwed: bigint; // Money owed to user
  totalOwes: bigint; // Money user owes
  netBalance: bigint; // Net position (positive = net creditor, negative = net debtor)
} {
  let totalOwed = 0n;
  let totalOwes = 0n;

  for (const group of groups) {
    const userMember = group.members.find(m => m.address.toLowerCase() === userAddress?.toLowerCase());
    if (userMember) {
      if (userMember.balance > 0n) {
        totalOwed += userMember.balance;
      } else if (userMember.balance < 0n) {
        totalOwes += -userMember.balance;
      }
    }
  }

  return {
    totalOwed,
    totalOwes,
    netBalance: totalOwed - totalOwes,
  };
}

/**
 * Generate a display name for a group based on member addresses
 */
export function generateGroupName(members: `0x${string}`[], currentUser?: `0x${string}`): string {
  if (members.length === 0) return 'Empty Group';
  if (members.length === 1) return 'Solo Group';
  
  // Filter out current user for display
  const otherMembers = currentUser ? members.filter(m => m !== currentUser) : members;
  
  if (otherMembers.length === 0) return 'Solo Group';
  if (otherMembers.length === 1) return `You & ${shortenAddress(otherMembers[0])}`;
  if (otherMembers.length === 2) return `You, ${shortenAddress(otherMembers[0])} & ${shortenAddress(otherMembers[1])}`;
  
  return `You & ${otherMembers.length} others`;
}


/**
 * Get settlement breakdown for a group
 */
export function getSettlementBreakdown(
  creditors: `0x${string}`[],
  creditorAmounts: bigint[],
  debtors: `0x${string}`[],
  debtorAmounts: bigint[]
): SettlementBreakdown {
  const creditorsData = creditors.map((address, i) => ({
    address,
    amount: creditorAmounts[i] || 0n,
  }));

  const debtorsData = debtors.map((address, i) => ({
    address,
    amount: debtorAmounts[i] || 0n,
  }));

  const totalOwed = debtorAmounts.reduce((sum, amount) => sum + amount, 0n);
  const canSettle = totalOwed > 0n;

  return {
    creditors: creditorsData,
    debtors: debtorsData,
    totalOwed,
    canSettle,
  };
}

/**
 * Calculate group balance summary
 */
export function getGroupBalanceSummary(members: GroupMember[]): {
  totalCreditors: number;
  totalDebtors: number;
  totalOwed: bigint;
  totalOwes: bigint;
  isBalanced: boolean;
} {
  let totalCreditors = 0;
  let totalDebtors = 0;
  let totalOwed = 0n;
  let totalOwes = 0n;

  for (const member of members) {
    if (member.balance > 0n) {
      totalCreditors++;
      totalOwed += member.balance;
    } else if (member.balance < 0n) {
      totalDebtors++;
      totalOwes += -member.balance;
    }
  }

  return {
    totalCreditors,
    totalDebtors,
    totalOwed,
    totalOwes,
    isBalanced: totalOwed === totalOwes,
  };
}

/**
 * Get user's status in a group
 */
export function getUserGroupStatus(
  userAddress: `0x${string}`,
  members: GroupMember[]
): {
  isMember: boolean;
  balance: bigint;
  status: 'creditor' | 'debtor' | 'even';
  statusText: string;
} {
  const userMember = members.find(m => m.address.toLowerCase() === userAddress.toLowerCase());
  
  if (!userMember) {
    return {
      isMember: false,
      balance: 0n,
      status: 'even',
      statusText: 'Not a member',
    };
  }

  let status: 'creditor' | 'debtor' | 'even';
  let statusText: string;

  if (userMember.balance > 0n) {
    status = 'creditor';
    statusText = `Owed ${formatUSDCWithSymbol(userMember.balance)}`;
  } else if (userMember.balance < 0n) {
    status = 'debtor';
    statusText = `Owes ${formatUSDCWithSymbol(-userMember.balance)}`;
  } else {
    status = 'even';
    statusText = 'All settled';
  }

  return {
    isMember: true,
    balance: userMember.balance,
    status,
    statusText,
  };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: bigint): string {
  const now = Date.now();
  const billTime = Number(timestamp) * 1000;
  const diffMs = now - billTime;
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatTimestamp(timestamp);
}

/**
 * Calculate bill split for equal division
 */
export function calculateEqualSplit(totalAmount: bigint, participantCount: number): {
  amountPerPerson: bigint;
  remainder: bigint;
  amounts: bigint[];
} {
  if (participantCount === 0) {
    return { amountPerPerson: 0n, remainder: 0n, amounts: [] };
  }

  const amountPerPerson = totalAmount / BigInt(participantCount);
  const remainder = totalAmount % BigInt(participantCount);
  
  const amounts = Array(participantCount).fill(amountPerPerson);
  // Add remainder to first person
  if (remainder > 0n) {
    amounts[0] += remainder;
  }

  return {
    amountPerPerson,
    remainder,
    amounts,
  };
}

/**
 * Validate custom bill split amounts
 */
export function validateCustomSplit(
  totalAmount: bigint,
  amounts: bigint[]
): {
  isValid: boolean;
  error?: string;
  calculatedTotal: bigint;
} {
  if (amounts.length === 0) {
    return {
      isValid: false,
      error: 'No amounts provided',
      calculatedTotal: 0n,
    };
  }

  const calculatedTotal = amounts.reduce((sum, amount) => sum + amount, 0n);

  if (calculatedTotal !== totalAmount) {
    return {
      isValid: false,
      error: `Split amounts (${formatUSDCWithSymbol(calculatedTotal)}) don't match total (${formatUSDCWithSymbol(totalAmount)})`,
      calculatedTotal,
    };
  }

  if (amounts.some(amount => amount <= 0n)) {
    return {
      isValid: false,
      error: 'All amounts must be positive',
      calculatedTotal,
    };
  }

  return {
    isValid: true,
    calculatedTotal,
  };
}

/**
 * Sort groups by activity (most recent bill first)
 */
export function sortGroupsByActivity(groups: GroupData[]): GroupData[] {
  return [...groups].sort((a, b) => {
    const aLatest = a.bills.length > 0 ? Math.max(...a.bills.map(bill => Number(bill.timestamp))) : 0;
    const bLatest = b.bills.length > 0 ? Math.max(...b.bills.map(bill => Number(bill.timestamp))) : 0;
    return bLatest - aLatest;
  });
}

/**
 * Filter groups by settlement status
 */
export function filterGroupsByStatus(
  groups: GroupData[],
  status: 'all' | 'active' | 'settled' | 'pending-settlement'
): GroupData[] {
  switch (status) {
    case 'active':
      return groups.filter(group => group.unsettledBills.length > 0);
    case 'settled':
      return groups.filter(group => group.unsettledBills.length === 0 && group.bills.length > 0);
    case 'pending-settlement':
      return groups.filter(group => group.settlementActive);
    default:
      return groups;
  }
}

/**
 * Get group activity summary
 */
export function getGroupActivitySummary(group: GroupData): {
  totalBills: number;
  unsettledBills: number;
  totalSpent: bigint;
  unsettledAmount: bigint;
  lastActivity?: Date;
} {
  const totalBills = group.bills.length;
  const unsettledBills = group.unsettledBills.length;
  const totalSpent = group.bills.reduce((sum, bill) => sum + bill.totalAmount, 0n);
  const unsettledAmount = group.unsettledBills.reduce((sum, bill) => sum + bill.totalAmount, 0n);
  
  let lastActivity: Date | undefined;
  if (group.bills.length > 0) {
    const latestTimestamp = Math.max(...group.bills.map(bill => Number(bill.timestamp)));
    lastActivity = new Date(latestTimestamp * 1000);
  }

  return {
    totalBills,
    unsettledBills,
    totalSpent,
    unsettledAmount,
    lastActivity,
  };
}
