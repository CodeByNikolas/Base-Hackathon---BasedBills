'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Modal } from './Modal';
import { GROUP_ABI } from '../config/contracts';
import styles from './AddBillModal.module.css';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupAddress: `0x${string}`;
  groupMembers: Array<{ address: `0x${string}`; balance: bigint }>;
}

export function AddBillModal({ isOpen, onClose, groupAddress, groupMembers }: AddBillModalProps) {
  const { address: userAddress } = useAccount();
  const [billType, setBillType] = useState<'equal' | 'custom'>('equal');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { writeContractAsync } = useWriteContract();

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
      if (billType === 'equal') {
        // Add equal split bill
        await writeContractAsync({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'addBill',
          args: [
            description,
            parseUnits(amount, 6),
            selectedParticipants as `0x${string}`[],
          ],
        });
      } else {
        // Add custom split bill
        const amounts = selectedParticipants.map(addr => {
          const customAmount = customAmounts[addr];
          if (!customAmount || parseFloat(customAmount) <= 0) {
            throw new Error(`Invalid amount for participant ${addr.slice(0, 6)}...`);
          }
          return parseUnits(customAmount, 6);
        });

        await writeContractAsync({
          address: groupAddress,
          abi: GROUP_ABI,
          functionName: 'addCustomBill',
          args: [
            description,
            selectedParticipants as `0x${string}`[],
            amounts,
          ],
        });
      }

      // Reset form
      setDescription('');
      setAmount('');
      setParticipants(new Set());
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
    setParticipants(new Set());
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
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
                        {isUser ? 'You' : `${member.address.slice(0, 6)}...${member.address.slice(-4)}`}
                      </span>
                      <span className={`${styles.participantBalance} ${
                        member.balance > 0n ? styles.positive :
                        member.balance < 0n ? styles.negative : styles.neutral
                      }`}>
                        {member.balance > 0n ? '+' : ''}{(Number(member.balance) / 1e6).toFixed(2)} USDC
                      </span>
                    </div>
                  </label>

                  {/* Custom Amount Input */}
                  {billType === 'custom' && isSelected && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customAmounts[member.address] || ''}
                      onChange={(e) => handleCustomAmountChange(member.address, e.target.value)}
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
        {billType === 'custom' && participants.size > 0 && (
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
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || !description.trim() || !amount || parseFloat(amount) <= 0}
          >
            {isSubmitting ? 'Adding Bill...' : 'Add Bill'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
