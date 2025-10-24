import { useAccount, useReadContract, useReadContracts, useWriteContract, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { useCallback, useMemo } from 'react';
import {
  getContractAddresses,
  REGISTRY_ABI,
  GROUP_ABI,
  USDC_ABI
} from '../config/contracts';
import { useNetworkValidation } from './useNetworkValidation';
import { GroupData, GroupMember, Bill } from '../utils/groupUtils';

/**
 * Hook to get all groups for the current user
 */
export function useUserGroups() {
  const { address, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  
  const contractAddresses = useMemo(() => {
    if (!chainId) return null;
    try {
      const addresses = getContractAddresses(chainId);
      console.log('Successfully loaded contract addresses for chain', chainId, ':', addresses);
      return addresses;
    } catch (error) {
      console.error('Failed to load contract addresses for chain', chainId, ':', error);

      // Check if this is because we're on the wrong network
      if (chainId === 8453) {
        console.warn('User is on Base Mainnet but contracts are only deployed on Base Sepolia');
      }

      return null;
    }
  }, [chainId]);

  // Check if user is on wrong network or if contract addresses are empty
  const hasValidContracts = contractAddresses && contractAddresses.registry && (contractAddresses.registry as string) !== '';

  // Find networks with valid contracts
  const networksWithContracts = [base.id, baseSepolia.id].filter(networkId => {
    try {
      const addresses = getContractAddresses(networkId);
      return addresses && addresses.registry && (addresses.registry as string) !== '';
    } catch {
      return false;
    }
  });

  console.log('🔍 Network Debug Info:', {
    chainId,
    hasValidContracts,
    contractAddresses,
    networksWithContracts,
    supportedNetworks: networksWithContracts
  });

  const isOnWrongNetwork = !hasValidContracts && networksWithContracts.length > 0;
  const correctChainId = networksWithContracts[0] || baseSepolia.id; // Default to Base Sepolia if available

  // Function to switch to correct network
  const switchToCorrectNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: correctChainId });
      console.log('Successfully switched to Base Sepolia');
    } catch (error) {
      console.error('Failed to switch network:', error);
      throw error;
    }
  }, [switchChainAsync, correctChainId]);

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
      enabled: !!address && !!contractAddresses?.registry && (contractAddresses.registry as string) !== '',
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Log contract call details
  console.log('📞 Contract call details:', {
    registryAddress: contractAddresses?.registry,
    userAddress: address,
    enabled: !!address && !!contractAddresses?.registry && (contractAddresses.registry as string) !== '',
    isLoading: isLoadingAddresses,
    error: addressesError
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
    isOnWrongNetwork,
    switchToCorrectNetwork,
    correctChainId,
    contractAddresses,
    hasValidContracts,
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
        functionName: 'getGambleStatusForUser',
        args: userAddress ? [userAddress] : undefined,
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'usdcAddress',
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
      usdcAddressResult,
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
        } as Bill)).sort((a, b) => Number(b.timestamp - a.timestamp)) // Sort by timestamp descending (newest first)
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
        } as Bill)).sort((a, b) => Number(b.timestamp - a.timestamp)) // Sort by timestamp descending (newest first)
      : [];

    const settlementActive = settlementActiveResult.status === 'success' 
      ? settlementActiveResult.result as boolean 
      : false;

    const gambleActive = gambleStatusResult.status === 'success'
      ? (gambleStatusResult.result as [boolean, `0x${string}`, bigint, bigint, boolean])?.[0] ?? false
      : false;

    const hasUserVoted = gambleStatusResult.status === 'success'
      ? (gambleStatusResult.result as [boolean, `0x${string}`, bigint, bigint, boolean])?.[4] ?? false
      : false;

    const usdcAddress = usdcAddressResult.status === 'success'
      ? usdcAddressResult.result as `0x${string}`
      : undefined;

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
      hasUserVoted,
      totalOwed,
      memberCount: members.length,
      usdcAddress,
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
          functionName: 'billCounter',
        },
        {
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'settlementActive',
        },
        // Note: Skipping gamble status for multiple groups view since it requires user context
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
    const contractsPerGroup = 6; // group name, members, balances, unsettled bills, bill counter, settlement active

    for (let i = 0; i < groupAddresses.length; i++) {
      const baseIndex = i * contractsPerGroup;
      const groupAddress = groupAddresses[i];
      
      const groupNameResult = contractResults[baseIndex];
      const membersResult = contractResults[baseIndex + 1];
      const balancesResult = contractResults[baseIndex + 2];
      const unsettledBillsResult = contractResults[baseIndex + 3];
      const billCounterResult = contractResults[baseIndex + 4];
      const settlementActiveResult = contractResults[baseIndex + 5];

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

      const billCounter = billCounterResult?.status === 'success'
        ? Number(billCounterResult.result as bigint)
        : 0;

      // Create a placeholder bills array with correct length for the activity summary
      // We don't load all bills for performance, but we know the total count
      const bills = Array(billCounter).fill(null).map((_, index) => ({
        id: BigInt(index),
        description: '',
        totalAmount: 0n,
        payer: groupAddress as `0x${string}`,
        participants: [],
        amounts: [],
        timestamp: 0n,
        settlementId: 0n,
      })) as Bill[];

      const totalOwed = unsettledBills.reduce((sum, bill) => sum + bill.totalAmount, 0n);

      groups.push({
        address: groupAddress,
        name: groupName,
        members,
        bills, // Now includes placeholder bills with correct length
        unsettledBills,
        settlementActive,
        gambleActive: false, // We don't check gamble status in list view since it requires user context
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

/**
 * Hook to handle USDC approval for group settlements
 */
export function useGroupSettlementApproval() {
  const { address: userAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const approveUSDCForGroup = useCallback(async (
    usdcAddress: `0x${string}`,
    groupAddress: `0x${string}`,
    amount: bigint
  ) => {
    if (!userAddress) {
      throw new Error('User address not available');
    }

    try {
      // Approve the group contract to spend USDC on behalf of the user
      const txHash = await writeContractAsync({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [groupAddress, amount],
      });

      return txHash;
    } catch (error) {
      console.error('Error approving USDC:', error);
      throw error;
    }
  }, [userAddress, writeContractAsync]);

  return {
    approveUSDCForGroup,
  };
}

/**
 * Hook to get USDC address from a specific group contract
 */
export function useGroupUSDCAddress(groupAddress: `0x${string}` | undefined) {
  const { data: usdcAddress, isLoading, error, refetch } = useReadContract({
    address: groupAddress,
    abi: GROUP_ABI,
    functionName: 'usdcAddress',
    query: {
      enabled: !!groupAddress,
    },
  });

  return {
    usdcAddress: usdcAddress as `0x${string}` | undefined,
    isLoading,
    error,
    refetch,
  };
}
