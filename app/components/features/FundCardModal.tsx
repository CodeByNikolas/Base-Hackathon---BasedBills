"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { FundCard } from "@coinbase/onchainkit/fund";
import { Modal } from "../ui/Modal";
import styles from "./FundCardModal.module.css";

type Blockchain = "base-sepolia" | "base" | "ethereum";

interface SessionTokenData {
  success: boolean;
  sessionToken?: string;
  error?: string;
  details?: {
    message?: string;
    code?: string;
    status?: number;
  };
}

interface FundCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetAmount?: string; // Optional preset amount (e.g., "50" for $50)
  title?: string;
}

/**
 * Reusable FundCard modal component that can be used to fund user's wallet
 * with USDC using secure session tokens. Can optionally accept a preset amount to fund.
 */
export function FundCardModal({
  isOpen,
  onClose,
  presetAmount,
  title = "Add USDC to Your Wallet"
}: FundCardModalProps) {
  const { address, isConnected } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>("base");

  const generateSessionToken = useCallback(async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresses: [
            {
              address,
              blockchains: [selectedBlockchain]
            }
          ],
          assets: ["ETH", "USDC"]
        }),
      });

      const data: SessionTokenData = await response.json();

      if (data.success && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setError(null);
      } else {
        let errorMessage = data.error || "Failed to generate session token";
        if (data.details?.message?.includes("base-sepolia")) {
          errorMessage += " 💡 Try using Base (Mainnet) instead of Base Sepolia, as it has better CDP support.";
        } else if (data.details?.message?.includes("not valid for blockchain")) {
          errorMessage += " 💡 Make sure your address is valid for the selected network. Try switching to Base (Mainnet).";
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError("Network error while generating session token");
      console.error("Session token error:", err);
    }

    setLoading(false);
  }, [address, selectedBlockchain]);

  // Auto-generate session token when modal opens and wallet is connected
  useEffect(() => {
    if (isOpen && isConnected && address && !sessionToken) {
      generateSessionToken();
    }
  }, [isOpen, isConnected, address, sessionToken, generateSessionToken]);

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
        {/* Network Configuration */}
        <div className={styles.networkConfig}>
          <h4 className={styles.configTitle}>Network Selection</h4>
          <div className={styles.configGroup}>
            <div className={styles.configItem}>
              <label className={styles.configLabel}>Blockchain:</label>
              <select
                value={selectedBlockchain}
                onChange={(e) => setSelectedBlockchain(e.target.value as Blockchain)}
                className={styles.configSelect}
              >
                <option value="base">Base (Mainnet) - Recommended</option>
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="base-sepolia">Base Sepolia (Testnet) - Limited Support</option>
              </select>
            </div>
            <div className={styles.configItem}>
              <label className={styles.configLabel}>Address:</label>
              <span className={styles.configValue}>{address}</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className={styles.instructions}>
          <div className="flex items-start gap-3">
            <div className={styles.instructionsIcon}>
              <svg className="w-5 h-5 text-white mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.instructionsContent}>
              <p className={styles.instructionsTitle}>How to add funds:</p>
              <ol className={styles.instructionsList}>
                <li><strong>Debit/Credit Card:</strong> Choose your card for secure payment processing</li>
                <li><strong>Bank Transfer:</strong> Link your bank account for secure transfers</li>
                <li><strong>Coinbase Account:</strong> Use existing Coinbase balances or payment methods</li>
                <li>Complete the purchase in the secure popup</li>
                <li>Funds will be added to your wallet automatically</li>
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

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Generating secure session token...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h4>Error</h4>
            <p>{error}</p>
            <button
              onClick={generateSessionToken}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        )}

        {/* FundCard Component */}
        {sessionToken && !loading && (
          <div className={styles.fundCardContainer}>
            <div className={styles.fundCardWrapper}>
              <FundCard
                sessionToken={sessionToken}
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
        )}

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
