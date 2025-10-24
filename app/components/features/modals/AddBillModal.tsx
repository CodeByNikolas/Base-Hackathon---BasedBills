'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { Modal } from '../../ui/Modal';
import { GROUP_ABI } from '../../../config/contracts';
import { useSponsoredTransactions } from '../../../hooks/useSponsoredTransactions';
import { SPONSORED_FUNCTIONS } from '../../../utils/sponsoredTransactions';
import { formatCurrency } from '../../../utils/currencyUtils';
import { getDisplayNameForAddress } from '../../../utils/addressBook';
import styles from './AddBillModal.module.css';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupAddress: `0x${string}`;
  groupMembers: Array<{ address: `0x${string}`; balance: bigint }>;
  isProcessActive?: boolean;
  onBillAdded?: () => void; // Callback to refresh parent data
}

export function AddBillModal({ isOpen, onClose, groupAddress, groupMembers, isProcessActive = false, onBillAdded }: AddBillModalProps) {
  const { address: userAddress } = useAccount();
  const [billType, setBillType] = useState<'equal' | 'custom'>('equal');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize participants with all group members when modal opens or members change
  useEffect(() => {
    if (isOpen && groupMembers.length > 0) {
      setParticipants(new Set(groupMembers.map(member => member.address)));
    }
  }, [isOpen, groupMembers]);

  const { sendTransaction, isLoading: isSponsoredLoading, isSponsored } = useSponsoredTransactions();

  // Calculate bill shares for all members
  const billShares = useMemo(() => {
    const shares: { [address: string]: { amount: bigint; formatted: string; isValid: boolean } } = {};

    groupMembers.forEach(member => {
      if (participants.has(member.address)) {
        if (billType === 'equal') {
          if (amount && participants.size > 0) {
            try {
              const totalAmount = parseUnits(amount, 6);
              const shareAmount = totalAmount / BigInt(participants.size);
              shares[member.address] = {
                amount: shareAmount,
                formatted: formatCurrency(shareAmount),
                isValid: true
              };
            } catch (error) {
              shares[member.address] = {
                amount: 0n,
                formatted: 'Invalid amount',
                isValid: false
              };
            }
          } else {
            shares[member.address] = {
              amount: 0n,
              formatted: 'Enter amount',
              isValid: false
            };
          }
        } else {
          // Custom bill type
          const customAmount = customAmounts[member.address];
          if (customAmount && parseFloat(customAmount) > 0) {
            try {
              const shareAmount = parseUnits(customAmount, 6);
              shares[member.address] = {
                amount: shareAmount,
                formatted: formatCurrency(shareAmount),
                isValid: true
              };
            } catch (error) {
              shares[member.address] = {
                amount: 0n,
                formatted: 'Invalid',
                isValid: false
              };
            }
          } else {
            shares[member.address] = {
              amount: 0n,
              formatted: 'Enter amount',
              isValid: false
            };
          }
        }
      }
    });

    return shares;
  }, [amount, participants, customAmounts, billType, groupMembers]);

  const handleParticipantToggle = (memberAddress: string) => {
    const newParticipants = new Set(participants);
    if (newParticipants.has(memberAddress)) {
      newParticipants.delete(memberAddress);
      // Remove custom amount if participant is deselected
      const newCustomAmounts = { ...customAmounts };
      delete newCustomAmounts[memberAddress];
      setCustomAmounts(newCustomAmounts);
    } else {
      newParticipants.add(memberAddress);
    }
    setParticipants(newParticipants);
  };

  const handleCustomAmountChange = (memberAddress: string, value: string) => {
    setCustomAmounts({
      ...customAmounts,
      [memberAddress]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      alert('Please fill in all required fields with valid amounts.');
      return;
    }

    const selectedParticipants = Array.from(participants);
    if (selectedParticipants.length === 0) {
      alert('Please select at least one participant.');
      return;
    }

    setIsSubmitting(true);

    try {
      let result;

      if (billType === 'equal') {
        // Add equal split bill using sponsored transaction
        result = await sendTransaction({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: SPONSORED_FUNCTIONS.GROUP.addBill,
          args: [
            description,
            parseUnits(amount, 6),
            selectedParticipants as `0x${string}`[],
          ],
        });
      } else {
        // Add custom split bill using sponsored transaction
        const amounts = selectedParticipants.map(addr => {
          const customAmount = customAmounts[addr];
          if (!customAmount || parseFloat(customAmount) <= 0) {
            throw new Error(`Invalid amount for participant ${getDisplayNameForAddress(addr as `0x${string}`, { currentUserAddress: userAddress })}`);
          }
          return parseUnits(customAmount, 6);
        });

        result = await sendTransaction({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: SPONSORED_FUNCTIONS.GROUP.addCustomBill,
          args: [
            description,
            selectedParticipants as `0x${string}`[],
            amounts,
          ],
        });
      }

      // // Show success message based on whether transaction was sponsored
      // if (result.isSponsored) {
      //   alert('Bill added successfully with sponsored transaction! No gas fees required.');
      // } else {
      //   alert('Bill added successfully!');
      // }

      // Wait for transaction confirmation (simple approach)
      // In a production app, you'd use useWaitForTransactionReceipt hook
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Refresh parent data after transaction confirmation
      if (onBillAdded) {
        onBillAdded();
      }

      // Reset form and close modal after successful transaction
      setDescription('');
      setAmount('');
      // Keep all participants selected (don't reset to empty set)
      setCustomAmounts({});
      setBillType('equal');
      onClose();

    } catch (error) {
      console.error('Error adding bill:', error);
      alert('Failed to add bill. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    // Keep all participants selected (don't reset to empty set)
    setCustomAmounts({});
    setBillType('equal');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Bill" size="large">
      {isProcessActive && (
        <div className={styles.processWarning}>
          <div className={styles.warningIcon}>⚠️</div>
          <div className={styles.warningContent}>
            <h4>Process Active</h4>
            <p>Settlement or gamble processes are currently active. You cannot add new bills until these processes are completed.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Bill Type Selection */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Bill Type</label>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="equal"
                checked={billType === 'equal'}
                onChange={(e) => setBillType(e.target.value as 'equal' | 'custom')}
              />
              <span className={styles.radioText}>Split Equally</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                value="custom"
                checked={billType === 'custom'}
                onChange={(e) => setBillType(e.target.value as 'equal' | 'custom')}
              />
              <span className={styles.radioText}>Custom Amounts</span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="description" className={styles.label}>
            Description *
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
            placeholder="What was this bill for?"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Total Amount */}
        <div className={styles.formGroup}>
          <label htmlFor="amount" className={styles.label}>
            Total Amount (USDC) *
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            pattern="^\d+(\.\d{1,2})?$"
            value={amount}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow numbers and up to 2 decimal places
              if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                setAmount(value);
              }
            }}
            className={styles.input}
            placeholder="0.00"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Participants */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Participants</label>
          <div className={styles.participantsGrid}>
            {groupMembers.map((member) => {
              const isSelected = participants.has(member.address);
              const isUser = member.address.toLowerCase() === userAddress?.toLowerCase();
              const memberShare = billShares[member.address];

              return (
                <div key={member.address} className={styles.participantCard}>
                  <label className={styles.participantLabel}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleParticipantToggle(member.address)}
                      disabled={isSubmitting}
                    />
                    <div className={styles.participantInfo}>
                      <span className={styles.participantName}>
                        {getDisplayNameForAddress(member.address, { currentUserAddress: userAddress })}
                      </span>
                      <span className={`${styles.participantBalance} ${memberShare ? (memberShare.isValid ? styles.billShare : styles.neutral) : styles.neutral}`}>
                        {memberShare ? `${memberShare.formatted} USDC` : 'Not included'}
                      </span>
                    </div>
                  </label>

                  {/* Custom Amount Input */}
                  {billType === 'custom' && isSelected && (
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="^\d+(\.\d{1,2})?$"
                      value={customAmounts[member.address] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow numbers and up to 2 decimal places
                        if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                          handleCustomAmountChange(member.address, value);
                        }
                      }}
                      className={styles.customAmountInput}
                      placeholder="Amount"
                      disabled={isSubmitting}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom Amount Validation */}
        {billType === 'custom' && participants.size > 0 && (() => {
          const totalCustom = Object.values(customAmounts)
            .filter(val => val && parseFloat(val) > 0)
            .reduce((sum, val) => sum + parseFloat(val), 0);
          const totalAmount = parseFloat(amount);
          return Math.abs(totalCustom - totalAmount) !== 0; // Show if difference is not 0
        })() && (
          <div className={styles.formGroup}>
            <div className={styles.customValidation}>
              <span>Total Custom Amounts: </span>
              <span className={styles.customTotal}>
                {Object.values(customAmounts)
                  .filter(val => val && parseFloat(val) > 0)
                  .reduce((sum, val) => sum + parseFloat(val), 0)
                  .toFixed(2)} USDC
              </span>
              <span className={styles.vsTotal}>
                vs {amount} USDC total
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={isSubmitting || isSponsoredLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || isSponsoredLoading || !description.trim() || !amount || parseFloat(amount) <= 0}
          >
            {(isSubmitting || isSponsoredLoading) ? 'Adding Bill...' : 'Add Bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
