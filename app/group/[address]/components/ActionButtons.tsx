'use client';

import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import { GroupData } from '../../../utils/groupUtils';
import { GROUP_ABI, USDC_ABI, getContractAddresses } from '../../../config/contracts';
import { useSponsoredTransactions } from '../../../hooks/useSponsoredTransactions';
import { SPONSORED_FUNCTIONS } from '../../../utils/sponsoredTransactions';

// Cast ABIs to any to avoid deep type instantiation issues
const GROUP_ABI_CAST = GROUP_ABI as any;
const USDC_ABI_CAST = USDC_ABI as any;

import { formatUnits } from 'viem';
import {
  TRANSACTION_CONFIRMATION_DELAY,
  APPROVAL_DELAY,
  UI_MESSAGES,
  UNLIMITED_APPROVAL_AMOUNT
} from '../constants';
import { ErrorHandler, GroupUtils } from '../utils';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  groupData: GroupData;
  groupAddress: `0x${string}`;
  userAddress?: `0x${string}`;
  usdcBalance?: bigint;
  usdcAllowance?: bigint;
  hasUserApproved?: boolean;
  hasUserFunded?: boolean;
  hasUserVoted?: boolean;
  onActionSuccess: () => void;
  onTransactionStarted?: (txHash: `0x${string}`) => void;
  onShowAddBillModal: () => void;
}

type ActionType = 'add-bill' | 'settle-up' | 'gamble' | 'approve-settlement' | 'fund-settlement' | 'reject-settlement' | 'accept-gamble' | 'reject-gamble';

interface ButtonConfig {
  key: string;
  type: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  label: string;
  action: ActionType;
  disabled?: boolean;
  title?: string;
}

export function ActionButtons({
  groupData,
  groupAddress,
  userAddress,
  usdcBalance,
  usdcAllowance,
  hasUserApproved,
  hasUserFunded,
  hasUserVoted,
  onActionSuccess,
  onTransactionStarted,
  onShowAddBillModal
}: ActionButtonsProps) {
  const [processingActions, setProcessingActions] = useState<Set<ActionType>>(new Set());
  const { writeContractAsync } = useWriteContract();
  const { sendTransaction, isLoading: isSponsoredLoading, isSponsored } = useSponsoredTransactions();

  const userBalance = groupData.members.find(m =>
    m.address.toLowerCase() === userAddress?.toLowerCase()
  )?.balance || 0n;

  const actionButtons = GroupUtils.getActionButtons(
    groupData,
    userBalance,
    hasUserApproved,
    hasUserFunded,
    hasUserVoted
  );

  const setProcessing = (action: ActionType, processing: boolean) => {
    setProcessingActions(prev => {
      const newSet = new Set(prev);
      if (processing) {
        newSet.add(action);
      } else {
        newSet.delete(action);
      }
      return newSet;
    });
  };

  const handleSettleUp = async () => {
    if (!userAddress || !groupData) return;

    setProcessing('settle-up', true);

    try {
      const userAlreadyApproved = hasUserApproved ?? false;
      const userAlreadyFunded = hasUserFunded ?? false;

      if (userBalance > 0n) {
        // User is a creditor
        if (userAlreadyApproved) {
          ErrorHandler.showSuccess(UI_MESSAGES.SETTLEMENT.ALREADY_APPROVED);
          return;
        }

        const result = await sendTransaction({
          address: groupAddress,
          abi: GROUP_ABI_CAST,
          functionName: SPONSORED_FUNCTIONS.GROUP.approveSettlement,
          args: [],
        });
        
        if (result.hash) {
          onTransactionStarted?.(result.hash);
        }
        
        if (result.isSponsored) {
          ErrorHandler.showSuccess('Settlement approved with sponsored transaction! No gas fees required.');
        }
      } else if (userBalance < 0n) {
        // User is a debtor
        if (userAlreadyFunded) {
          ErrorHandler.showSuccess(UI_MESSAGES.SETTLEMENT.ALREADY_FUNDED);
          return;
        }

        // Check balance and approval first
        const amountOwed = BigInt(-userBalance);
        const currentBalance = usdcBalance ?? 0n;
        const currentAllowance = usdcAllowance ?? 0n;

        if (usdcBalance === undefined) {
          ErrorHandler.showError(UI_MESSAGES.SETTLEMENT.BALANCE_CHECK_FAILED);
          return;
        }

        if (currentBalance < amountOwed) {
          const neededAmount = formatUnits(amountOwed, 6);
          const currentAmount = formatUnits(currentBalance, 6);
          const message = GroupUtils.formatMessage(UI_MESSAGES.SETTLEMENT.INSUFFICIENT_BALANCE, {
            neededAmount,
            currentAmount
          });
          ErrorHandler.showError(message);
          return;
        }

        const needsApproval = currentAllowance < amountOwed;
        const usdcAddress = groupData.usdcAddress || getContractAddresses().usdc;

        if (needsApproval) {
          const isAlreadyUnlimited = currentAllowance >= UNLIMITED_APPROVAL_AMOUNT;

          if (!isAlreadyUnlimited) {
            // Use sponsored transaction for USDC approval
            const approvalResult = await sendTransaction({
              address: usdcAddress as `0x${string}`,
              abi: USDC_ABI_CAST,
              functionName: SPONSORED_FUNCTIONS.USDC.approve,
              args: [groupAddress, UNLIMITED_APPROVAL_AMOUNT],
            });

            if (approvalResult.isSponsored) {
              ErrorHandler.showSuccess('USDC approval completed with sponsored transaction!');
            }

            await new Promise(resolve => setTimeout(resolve, APPROVAL_DELAY));
          }
        }

        const result = await sendTransaction({
          address: groupAddress,
          abi: GROUP_ABI_CAST,
          functionName: SPONSORED_FUNCTIONS.GROUP.fundSettlement,
          args: [],
        });
        
        if (result.hash) {
          onTransactionStarted?.(result.hash);
        }
        
        if (result.isSponsored) {
          ErrorHandler.showSuccess('Settlement funded with sponsored transaction! No gas fees required.');
        }
      } else {
        ErrorHandler.showSuccess(UI_MESSAGES.SETTLEMENT.SETTLED_BALANCE);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, TRANSACTION_CONFIRMATION_DELAY));
      onActionSuccess();
    } catch (error) {
      ErrorHandler.handleTransactionError(error, 'Settlement');
    } finally {
      setProcessing('settle-up', false);
    }
  };

  const handleGamble = async () => {
    if (!groupData) return;

    setProcessing('gamble', true);

    try {
      const result = await sendTransaction({
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: SPONSORED_FUNCTIONS.GROUP.proposeGamble,
        args: [],
      });
      
      if (result.hash) {
        onTransactionStarted?.(result.hash);
      }
      
      if (result.isSponsored) {
        ErrorHandler.showSuccess('Gamble proposed with sponsored transaction! No gas fees required.');
      }

      await new Promise(resolve => setTimeout(resolve, TRANSACTION_CONFIRMATION_DELAY));
      onActionSuccess();
    } catch (error) {
      ErrorHandler.handleTransactionError(error, 'Gamble proposal');
    } finally {
      setProcessing('gamble', false);
    }
  };

  const handleRejectSettlement = async () => {
    if (!groupData) return;

    setProcessing('reject-settlement', true);

    try {
      await writeContractAsync({
        address: groupData.address,
        abi: GROUP_ABI,
        functionName: 'rejectSettlement',
        args: [],
      });

      // Refresh group data after successful rejection
      onActionSuccess();

      ErrorHandler.showSuccess('Settlement cancelled - bills remain unsettled');
    } catch (error) {
      ErrorHandler.handleTransactionError(error, 'Settlement rejection');
    } finally {
      setProcessing('reject-settlement', false);
    }
  };

  const handleVoteGamble = async (accept: boolean) => {
    if (!groupData) return;

    const actionType = accept ? 'accept-gamble' : 'reject-gamble';
    setProcessing(actionType, true);

    try {
      const result = await sendTransaction({
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: SPONSORED_FUNCTIONS.GROUP.voteOnGamble,
        args: [accept],
      });
      
      if (result.hash) {
        onTransactionStarted?.(result.hash);
      }
      
      if (result.isSponsored) {
        const actionText = accept ? 'accepted' : 'rejected';
        ErrorHandler.showSuccess(`Gamble ${actionText} with sponsored transaction! No gas fees required.`);
      }

      await new Promise(resolve => setTimeout(resolve, TRANSACTION_CONFIRMATION_DELAY));
      onActionSuccess();
    } catch (error) {
      const actionText = accept ? 'accept' : 'reject';
      const message = GroupUtils.formatMessage(UI_MESSAGES.GAMBLE.VOTE_FAILED, { action: actionText });
      ErrorHandler.showError(message);
    } finally {
      setProcessing(actionType, false);
    }
  };

  const handleButtonClick = (action: ActionType) => {
    switch (action) {
      case 'add-bill':
        if (groupData.settlementActive || groupData.gambleActive) {
          ErrorHandler.showError('Cannot add bills during active settlement or gamble processes');
          return;
        }
        onShowAddBillModal();
        break;
      case 'settle-up':
        handleSettleUp();
        break;
      case 'gamble':
        handleGamble();
        break;
      case 'approve-settlement':
      case 'fund-settlement':
        handleSettleUp();
        break;
      case 'reject-settlement':
        handleRejectSettlement();
        break;
      case 'accept-gamble':
        handleVoteGamble(true);
        break;
      case 'reject-gamble':
        handleVoteGamble(false);
        break;
    }
  };

  const getButtonClassName = (type: ButtonConfig['type']) => {
    const baseClass = styles.actionButton;
    const typeClass = styles[type];
    return `${baseClass} ${typeClass}`.trim();
  };

  return (
    <div className={styles.actions}>
      {actionButtons.map(button => {
        const isProcessing = processingActions.has(button.action);
        const disabled = button.disabled || isProcessing;

        return (
          <button
            key={button.key}
            className={getButtonClassName(button.type)}
            onClick={() => handleButtonClick(button.action)}
            disabled={disabled}
            title={button.title}
          >
            {isProcessing ? UI_MESSAGES.SETTLEMENT.PROCESSING : button.label}
          </button>
        );
      })}
    </div>
  );
}


