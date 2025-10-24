"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { FundCard } from "@coinbase/onchainkit/fund";
import { Modal } from "../ui/Modal";
import { formatCurrency } from "../../utils/currencyUtils";
import styles from "./FundCardModal.module.css";

type Blockchain = "base-sepolia" | "base";

interface SessionTokenData {
  success: boolean;
  sessionToken?: string;
  error?: string;
  testnetConverted?: boolean;
  details?: {
    message?: string;
    code?: string;
    status?: number;
  };
}

interface FundCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  presetAmount?: string; // Optional preset amount (e.g., "50" for $50)
  shortfallAmount?: bigint; // Amount user is short in wei
  currentBalance?: bigint; // Current USDC balance in wei
  title?: string;
}

/**
 * Reusable FundCard modal component that can be used to fund user's wallet
 * with USDC using secure session tokens. Can optionally accept a preset amount to fund.
 */
export function FundCardModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  presetAmount,
  shortfallAmount,
  currentBalance,
  title = shortfallAmount && shortfallAmount > 0n ? "Fund Your Wallet for Settlement" : "Add USDC to Your Wallet"
}: FundCardModalProps) {
  const { address, isConnected } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>("base");
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const [fundCardStatus, setFundCardStatus] = useState<string>("");
  const [fundCardError, setFundCardError] = useState<string>("");
  const [fundCardSuccess, setFundCardSuccess] = useState<string>("");

  const generateSessionToken = useCallback(async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError(null);
    setSessionToken(null);
    // Clear FundCard messages when regenerating token
    setFundCardStatus("");
    setFundCardError("");
    setFundCardSuccess("");

    try {
      console.log("Generating session token for:", { address, selectedBlockchain });

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Session token API error:", response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SessionTokenData = await response.json();
      console.log("Session token response:", data);

      if (data.success && data.sessionToken) {
        console.log("Session token generated successfully:", data.sessionToken);
        setSessionToken(data.sessionToken);

        // Show conversion info if testnet was converted
        if (data.testnetConverted) {
          console.log("Testnet conversion successful");
          // You could set a success message here if needed
        }

        setError(null);
      } else {
        let errorMessage = data.error || "Failed to generate session token";
        if (data.details?.message?.includes("base-sepolia")) {
          errorMessage += isTestnet
            ? " 💡 Make sure your wallet is connected to Base Sepolia testnet and you have test funds available."
            : " 💡 Try using Base (Mainnet) instead of Base Sepolia, as it has better CDP support.";
        } else if (data.details?.message?.includes("not valid for blockchain")) {
          errorMessage += isTestnet
            ? " 💡 Make sure your wallet address is valid for Base Sepolia testnet."
            : " 💡 Make sure your address is valid for the selected network. Try switching to Base (Mainnet).";
        }
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error while generating session token";
      console.error("Session token error:", err);
      setError(errorMessage);
      
      // If it's a 404 error, show a helpful message about API configuration
      if (errorMessage.includes("404")) {
        setError("Session token API not available. This feature requires proper API configuration. You can still use the app for other features.");
      }
    } finally {
      setLoading(false);
    }
  }, [address, selectedBlockchain, isTestnet]);

  // Update testnet status when blockchain changes
  useEffect(() => {
    setIsTestnet(selectedBlockchain === "base-sepolia");
  }, [selectedBlockchain]);

  // Auto-generate session token when modal opens and wallet is connected
  useEffect(() => {
    if (isOpen && isConnected && address && !sessionToken && !loading) {
      generateSessionToken();
    }
  }, [isOpen, isConnected, address, sessionToken, generateSessionToken, loading]);

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
      <div className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Shortfall Information - Only show when actually short */}
        {shortfallAmount && currentBalance && shortfallAmount > 0n && (
          <div className={styles.shortfallInfo}>
            <div className={styles.shortfallIcon}>⚠️</div>
            <div className={styles.shortfallContent}>
              <h4 className={styles.shortfallTitle}>Insufficient USDC Balance</h4>
              <p className={styles.shortfallMessage}>
                You are short <strong>{formatCurrency(shortfallAmount)} USDC</strong> to complete this settlement.
              </p>
              <p className={styles.shortfallDetails}>
                Current balance: {formatCurrency(currentBalance)} USDC | Required: {formatCurrency(shortfallAmount + currentBalance)} USDC
              </p>
            </div>
          </div>
        )}

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
                <option value="base-sepolia">🧪 Base Sepolia (Testnet) - Supported via Conversion</option>
              </select>
            </div>
            <div className={styles.configItem}>
              <label className={styles.configLabel}>Wallet Address:</label>
              <span className={styles.configValue}>{address}</span>
            </div>
          </div>
        </div>

        {/* Testnet Info */}
        {isTestnet && (
          <div className={styles.testnetWarning}>
            <div className={styles.warningIcon}>🧪</div>
            <div className={styles.warningContent}>
              <h4>Base Sepolia Testnet Mode</h4>
              <p>✅ Session token successfully generated via conversion (Base Sepolia → Base mainnet). Make sure your wallet is connected to Base Sepolia testnet.</p>
              <div className={styles.testnetActions}>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.testnetButton}
                >
                  Get Test USDC
                </a>
                <a
                  href="https://sepoliafaucet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.testnetButton}
                >
                  Get Test ETH
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className={styles.instructions}>
          <div className="flex items-start gap-2 sm:gap-3">
            <div className={styles.instructionsIcon}>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {shortfallAmount && shortfallAmount > 0n ? (
                  <li>Close this modal and continue with your bill settlement</li>
                ) : (
                  <li>Close this modal to return to your previous screen</li>
                )}
              </ol>
              {presetAmount && shortfallAmount && shortfallAmount > 0n && (
                <div className={styles.suggestedAmount}>
                  <strong>Suggested amount:</strong> ${presetAmount} (your shortfall of {formatCurrency(shortfallAmount)} + $1 buffer for rounding)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p className="text-sm sm:text-base">Generating secure session token...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h4 className="text-base sm:text-lg">Error</h4>
            <p className="text-sm sm:text-base mb-4">{error}</p>
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
            {/* FundCard with External Event Handlers */}
            <div className={styles.fundCardWrapper}>
              <FundCard
                sessionToken={sessionToken}
                assetSymbol="USDC"
                country="US"
                currency="USD"
                headerText={shortfallAmount && shortfallAmount > 0n ? `Fund ${formatCurrency(shortfallAmount)} USDC for Settlement` : "Add USDC"}
                buttonText={shortfallAmount && shortfallAmount > 0n ? `Buy ${formatCurrency(shortfallAmount)} USDC` : "Buy USDC"}
                presetAmountInputs={
                  presetAmount
                    ? [presetAmount, (parseFloat(presetAmount) * 1.5).toString(), Math.max(parseFloat(presetAmount) * 3, 100).toString()]
                    : ["25", "50", "120"]
                }
                onStatus={(status) => {
                  setFundCardStatus(`${status.statusName}${status.statusData ? ` - ${JSON.stringify(status.statusData)}` : ''}`);
                  setFundCardError("");
                  setFundCardSuccess("");
                }}
                onError={(error) => {
                  const errorMessage = error ? `${error.errorType}: ${error.debugMessage || error.code || 'Unknown error'}` : 'Unknown error';
                  setFundCardError(errorMessage);
                  setFundCardStatus("");
                  setFundCardSuccess("");
                  onError?.(errorMessage);
                }}
                onSuccess={(data) => {
                  const successMessage = `Transaction successful: ${data.assetSymbol} on ${data.assetName}`;
                  setFundCardSuccess(successMessage);
                  setFundCardStatus("");
                  setFundCardError("");
                  onSuccess?.();
                }}
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
