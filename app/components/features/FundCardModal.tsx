"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { FundCard } from "@coinbase/onchainkit/fund";
import { Modal } from "../ui/Modal";
import styles from "./FundCardModal.module.css";

interface FundCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetAmount?: string; // Optional preset amount (e.g., "50" for $50)
  title?: string;
}

/**
 * Reusable FundCard modal component that can be used to fund user's wallet
 * with USDC. Can optionally accept a preset amount to fund.
 */
export function FundCardModal({
  isOpen,
  onClose,
  presetAmount,
  title = "Add USDC to Your Wallet"
}: FundCardModalProps) {
  const { address, isConnected } = useAccount();
  const [isFunding, setIsFunding] = useState(false);

  // Don't render anything if wallet not connected
  if (!isConnected || !address) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={title}>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please connect your wallet to fund your account
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div className="space-y-6">
        {/* Instructions */}
        <div className={styles.instructions}>
          <div className="flex items-start gap-3">
            <div className={styles.instructionsIcon}>
              <svg className="w-5 h-5 text-white mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.instructionsContent}>
              <p className={styles.instructionsTitle}>How to add USDC:</p>
              <ol className={styles.instructionsList}>
                <li><strong>Debit/Credit Card:</strong> Choose your card for secure payment processing</li>
                <li><strong>Bank Transfer:</strong> Link your bank account for secure transfers</li>
                <li><strong>Coinbase Account:</strong> Use existing Coinbase balances or payment methods</li>
                <li>Complete the purchase in the secure popup</li>
                <li>USDC will be added to your wallet automatically</li>
                <li>Close this modal and continue with your bill settlement</li>
              </ol>
              {presetAmount && (
                <div className={styles.suggestedAmount}>
                  <strong>Suggested amount:</strong> ${presetAmount} (based on your outstanding bills)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FundCard Component */}
        <div className={styles.fundCardContainer}>
          <div className={styles.fundCardWrapper}>
            <FundCard
              assetSymbol="USDC"
              country="US"
              currency="USD"
              headerText={presetAmount ? `Fund $${presetAmount} USDC` : "Add USDC"}
              buttonText={presetAmount ? `Buy $${presetAmount} USDC` : "Buy USDC"}
              presetAmountInputs={
                presetAmount
                  ? [presetAmount, (parseFloat(presetAmount) * 1.5).toString(), "100"]
                  : ["25", "50", "120"]
              }
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <div className={styles.poweredBy}>
            Powered by Coinbase
          </div>
        </div>
      </div>
    </Modal>
  );
}
