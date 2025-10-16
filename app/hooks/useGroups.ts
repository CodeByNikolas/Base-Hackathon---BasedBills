import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useCallback, useMemo } from 'react';
import { 
  getContractAddresses, 
  REGISTRY_ABI, 
  GROUP_ABI 
} from '../config/contracts';
import { GroupData, GroupMember, Bill } from '../utils/groupUtils';

/**
 * Hook to get all groups for the current user
 */
export function useUserGroups() {
  const { address, chainId } = useAccount();
  
  const contractAddresses = useMemo(() => {
    if (!chainId) return null;
    try {
      return getContractAddresses(chainId);
    } catch {
      return null;
    }
  }, [chainId]);

  // Get group addresses for user
  const { 
    data: groupAddresses, 
    isLoading: isLoadingAddresses,
    error: addressesError,
    refetch: refetchAddresses
  } = useReadContract({
    address: contractAddresses?.registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'getGroupsForUser',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses?.registry,
    },
  });

  // Get group count for user
  const { 
    data: groupCount,
    isLoading: isLoadingCount 
  } = useReadContract({
    address: contractAddresses?.registry as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: 'getGroupCountForUser',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddresses?.registry,
    },
  });

  const refetch = useCallback(() => {
    refetchAddresses();
  }, [refetchAddresses]);

  return {
    groupAddresses: groupAddresses as `0x${string}`[] | undefined,
    groupCount: groupCount ? Number(groupCount) : 0,
    isLoading: isLoadingAddresses || isLoadingCount,
    error: addressesError,
    refetch,
  };
}

/**
 * Hook to get detailed data for a specific group
 */
export function useGroupData(groupAddress: `0x${string}` | undefined) {
  const { address: userAddress } = useAccount();

  // Prepare contract calls for group data
  const contracts = useMemo(() => {
    if (!groupAddress) return [];
    
    return [
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getGroupName',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getMembers',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getAllBalances',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getAllBills',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getUnsettledBills',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'settlementActive',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getGambleStatus',
        args: userAddress ? [userAddress] : [groupAddress], // Fallback to group address
      },
    ];
  }, [groupAddress, userAddress]);

  const {
    data: contractResults,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts,
    query: {
      enabled: !!groupAddress,
    },
  });

  // Parse and structure the data
  const groupData = useMemo((): GroupData | null => {
    if (!contractResults || !groupAddress) return null;

    const [
      groupNameResult,
      membersResult,
      balancesResult,
      billsResult,
      unsettledBillsResult,
      settlementActiveResult,
      gambleStatusResult,
    ] = contractResults;

    // Handle potential errors in individual contract calls
    if (groupNameResult.status === 'failure' ||
        membersResult.status === 'failure' || 
        balancesResult.status === 'failure') {
      return null;
    }

    const groupName = groupNameResult.result as string;
    const memberAddresses = membersResult.result as `0x${string}`[];
    const [_memberAddressesFromBalances, memberBalances] = balancesResult.result as [`0x${string}`[], bigint[]];
    
    // Create member objects with balances
    const members: GroupMember[] = memberAddresses.map((address, index) => ({
      address,
      balance: memberBalances[index] || 0n,
    }));

    // Parse bills data
    const allBills = billsResult.status === 'success'
      ? (billsResult.result as Array<{
          id: bigint;
          description: string;
          totalAmount: bigint;
          payer: `0x${string}`;
          participants: `0x${string}`[];
          amounts: bigint[];
          timestamp: bigint;
          settlementId: bigint;
        }>).map(bill => ({
          id: bill.id,
          description: bill.description,
          totalAmount: bill.totalAmount,
          payer: bill.payer,
          participants: bill.participants,
          amounts: bill.amounts,
          timestamp: bill.timestamp,
          settlementId: bill.settlementId,
        } as Bill))
      : [];

    const unsettledBills = unsettledBillsResult.status === 'success'
      ? (unsettledBillsResult.result as Array<{
          id: bigint;
          description: string;
          totalAmount: bigint;
          payer: `0x${string}`;
          participants: `0x${string}`[];
          amounts: bigint[];
          timestamp: bigint;
          settlementId: bigint;
        }>).map(bill => ({
          id: bill.id,
          description: bill.description,
          totalAmount: bill.totalAmount,
          payer: bill.payer,
          participants: bill.participants,
          amounts: bill.amounts,
          timestamp: bill.timestamp,
          settlementId: bill.settlementId,
        } as Bill))
      : [];

    const settlementActive = settlementActiveResult.status === 'success' 
      ? settlementActiveResult.result as boolean 
      : false;

    const gambleActive = gambleStatusResult.status === 'success'
      ? (gambleStatusResult.result as [boolean])[0]
      : false;

    // Calculate total owed from unsettled bills
    const totalOwed = unsettledBills.reduce((sum, bill) => sum + bill.totalAmount, 0n);

    return {
      address: groupAddress,
      name: groupName,
      members,
      bills: allBills,
      unsettledBills,
      settlementActive,
      gambleActive,
      totalOwed,
      memberCount: members.length,
    };
  }, [contractResults, groupAddress]);

  return {
    groupData,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to get data for multiple groups
 */
export function useMultipleGroupsData(groupAddresses: `0x${string}`[] | undefined) {
  const { address: _userAddress } = useAccount();

  // Prepare contracts for all groups
  const contracts = useMemo(() => {
    if (!groupAddresses || groupAddresses.length === 0) return [];
    
    const allContracts = [];
    
    for (const groupAddress of groupAddresses) {
      allContracts.push(
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'getGroupName',
        },
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'getMembers',
        },
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'getAllBalances',
        },
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'getUnsettledBills',
        },
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'settlementActive',
        }
      );
    }
    
    return allContracts;
  }, [groupAddresses]);

  const {
    data: contractResults,
    isLoading,
    error,
    refetch,
  } = useReadContracts({
    contracts,
    query: {
      enabled: !!groupAddresses && groupAddresses.length > 0,
    },
  });

  // Parse results into group data
  const groupsData = useMemo((): GroupData[] => {
    if (!contractResults || !groupAddresses) return [];

    const groups: GroupData[] = [];
    const contractsPerGroup = 5; // group name, members, balances, unsettled bills, settlement active

    for (let i = 0; i < groupAddresses.length; i++) {
      const baseIndex = i * contractsPerGroup;
      const groupAddress = groupAddresses[i];
      
      const groupNameResult = contractResults[baseIndex];
      const membersResult = contractResults[baseIndex + 1];
      const balancesResult = contractResults[baseIndex + 2];
      const unsettledBillsResult = contractResults[baseIndex + 3];
      const settlementActiveResult = contractResults[baseIndex + 4];

      // Skip if essential data failed to load
      if (groupNameResult?.status !== 'success' || 
          membersResult?.status !== 'success' || 
          balancesResult?.status !== 'success') {
        continue;
      }

      const groupName = groupNameResult.result as string;
      const memberAddresses = membersResult.result as `0x${string}`[];
      const [, memberBalances] = balancesResult.result as [unknown, bigint[]];
      
      const members: GroupMember[] = memberAddresses.map((address, index) => ({
        address,
        balance: memberBalances[index] || 0n,
      }));

      const unsettledBills = unsettledBillsResult?.status === 'success'
        ? (unsettledBillsResult.result as Array<{
            id: bigint;
            description: string;
            totalAmount: bigint;
            payer: `0x${string}`;
            participants: `0x${string}`[];
            amounts: bigint[];
            timestamp: bigint;
            settlementId: bigint;
          }>).map(bill => ({
            id: bill.id,
            description: bill.description,
            totalAmount: bill.totalAmount,
            payer: bill.payer,
            participants: bill.participants,
            amounts: bill.amounts,
            timestamp: bill.timestamp,
            settlementId: bill.settlementId,
          } as Bill))
        : [];

      const settlementActive = settlementActiveResult?.status === 'success' 
        ? settlementActiveResult.result as boolean 
        : false;

      const totalOwed = unsettledBills.reduce((sum, bill) => sum + bill.totalAmount, 0n);

      groups.push({
        address: groupAddress,
        name: groupName,
        members,
        bills: [], // We don't load all bills for the list view for performance
        unsettledBills,
        settlementActive,
        gambleActive: false, // We don't check gamble status in list view
        totalOwed,
        memberCount: members.length,
      });
    }

    return groups;
  }, [contractResults, groupAddresses]);

  return {
    groupsData,
    isLoading,
    error,
    refetch,
  };
}
