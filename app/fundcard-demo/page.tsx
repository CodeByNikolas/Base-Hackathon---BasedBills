"use client";

import { useState, useEffect, useCallback } from "react";
import { FundCard } from "@coinbase/onchainkit/fund";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useAccount } from "wagmi";
import Link from "next/link";
import styles from "./fundcard-demo.module.css";

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

type Blockchain = "base-sepolia" | "base" | "ethereum";

export default function FundCardDemo() {
  const { address, isConnected } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>("base");
  const [customAddress, setCustomAddress] = useState<string>("");
  const [isTestnet, setIsTestnet] = useState<boolean>(false);

  // Update custom address when wallet connects
  useEffect(() => {
    if (address && !customAddress) {
      setCustomAddress(address);
    }
  }, [address, customAddress]);

  // Update testnet status when blockchain changes
  useEffect(() => {
    setIsTestnet(selectedBlockchain === "base-sepolia");
  }, [selectedBlockchain]);

  const useConnectedWallet = () => {
    if (address) {
      setCustomAddress(address);
    }
  };

  const generateSessionToken = useCallback(async () => {
    const targetAddress = customAddress || address;
    if (!targetAddress) {
      setError("Please connect your wallet or enter an address");
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
              address: targetAddress,
              blockchains: [selectedBlockchain]
            }
          ],
          assets: ["ETH", "USDC"],
          testnet: isTestnet
        }),
      });

      const data: SessionTokenData = await response.json();

      if (data.success && data.sessionToken) {
        setSessionToken(data.sessionToken);
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
            : " 💡 Make sure your address is valid for the selected network. Try using your connected wallet address or switch to Base (Mainnet).";
        }
        setError(errorMessage);
      }
    } catch (err) {
      setError("Network error while generating session token");
      console.error("Session token error:", err);
    }

    setLoading(false);
  }, [customAddress, address, selectedBlockchain]);

  // Auto-generate session token when wallet is connected (initial)
  useEffect(() => {
    if (isConnected && address && !sessionToken && !customAddress) {
      generateSessionToken();
    }
  }, [isConnected, address, sessionToken, generateSessionToken]);

  // Auto-regenerate session token when blockchain changes
  useEffect(() => {
    if (sessionToken && customAddress) {
      generateSessionToken();
    }
  }, [selectedBlockchain, generateSessionToken, sessionToken, customAddress]);

  // Auto-regenerate session token when address changes (but keep existing token if no address)
  useEffect(() => {
    if (sessionToken && customAddress && customAddress !== address) {
      generateSessionToken();
    }
  }, [customAddress, generateSessionToken, sessionToken, address]);

  if (!isConnected) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>FundCard Demo</h1>
            <Link href="/debug" className={styles.debugLink}>
              Debug API
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.connectSection}>
            <h2>Connect Your Wallet</h2>
            <p>Please connect your wallet to use the FundCard</p>
            <Wallet />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>FundCard Demo</h1>
            <Link href="/debug" className={styles.debugLink}>
              Debug API
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.loadingSection}>
            <div className={styles.spinner} />
            <p>Generating session token...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>FundCard Demo</h1>
            <Link href="/debug" className={styles.debugLink}>
              Debug API
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.errorSection}>
            <h2>Error</h2>
            <p>{error}</p>
            <button
              onClick={generateSessionToken}
              className={styles.retryButton}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionToken) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>FundCard Demo</h1>
            <Link href="/debug" className={styles.debugLink}>
              Debug API
            </Link>
          </div>
        </header>

        <div className={styles.content}>
          <div className={styles.readySection}>
            <h2>Ready to Generate Session Token</h2>
            <p>Click the button below to generate a session token for the FundCard</p>
            <button
              onClick={generateSessionToken}
              className={styles.generateButton}
            >
              Generate Session Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>FundCard Demo</h1>
          <Link href="/debug" className={styles.debugLink}>
            Debug API
          </Link>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.configurationSection}>
          <h3>Network Configuration</h3>
          <div className={styles.controlGroup}>
            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Blockchain:</label>
              <select
                value={selectedBlockchain}
                onChange={(e) => setSelectedBlockchain(e.target.value as Blockchain)}
                className={styles.controlSelect}
              >
                <option value="base">Base (Mainnet) - Recommended</option>
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="base-sepolia">🧪 Base Sepolia (Testnet) - Limited Support</option>
              </select>
            </div>

            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Address:</label>
              <div className={styles.addressControl}>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  className={styles.controlInput}
                  placeholder={address || "0x..."}
                />
                {address && address !== customAddress && (
                  <button
                    onClick={useConnectedWallet}
                    className={styles.walletButton}
                    title="Use connected wallet address"
                  >
                    Use Wallet
                  </button>
                )}
              </div>
            </div>

            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Action:</label>
              <div className={styles.buttonGroup}>
                {address && address !== customAddress && (
                  <button
                    onClick={useConnectedWallet}
                    className={styles.walletButton}
                    title="Use connected wallet address"
                  >
                    Use Wallet
                  </button>
                )}
                <button
                  onClick={generateSessionToken}
                  disabled={loading || !customAddress}
                  className={styles.generateButton}
                >
                  {loading ? "Generating..." : "Generate Session Token"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fundCardSection}>
          <h2>FundCard Component {isTestnet ? "(Testnet Mode)" : ""}</h2>
          {isTestnet && (
            <div className={styles.testnetWarning}>
              <div className={styles.warningIcon}>⚠️</div>
              <div className={styles.warningContent}>
                <h4>Testnet Mode Active</h4>
                <p>You're using Base Sepolia testnet. Make sure your wallet is connected to the correct testnet and you have test funds available.</p>
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
          <div className={styles.fundCardWrapper}>
            <FundCard
              sessionToken={sessionToken}
              assetSymbol={isTestnet ? "USDC" : "ETH"}
              country="US"
              currency="USD"
              headerText={isTestnet ? "Fund Your Testnet Wallet" : "Fund Your Base Wallet"}
              buttonText="Purchase"
              presetAmountInputs={isTestnet ? ['1', '5', '10'] : ['10', '25', '50']}
            />
          </div>
        </div>

        <div className={styles.infoSection}>
          <h3>How it works:</h3>
          <ol className={styles.steps}>
            <li>Connect your wallet using the Wallet component above</li>
            <li>The app automatically generates a JWT token using your CDP API credentials</li>
            <li>A session token is created with your wallet address and Base network support</li>
            <li>The FundCard component is rendered with the session token for secure ETH/USDC funding on Base</li>
          </ol>

          <div className={styles.networkInfo}>
            <p><strong>💡 Network Support:</strong></p>
            <ul>
              <li><strong>Base (Mainnet):</strong> Fully supported ✅</li>
              <li><strong>Ethereum (Mainnet):</strong> Fully supported ✅</li>
              <li><strong>Base Sepolia (Testnet):</strong> {isTestnet ? "Active - " : "Limited support - "}may require testnet addresses</li>
            </ul>
            {isTestnet ? (
              <div className={styles.testnetInfo}>
                <p><strong>Testnet Active!</strong> Make sure:</p>
                <ul>
                  <li>Your wallet is connected to Base Sepolia testnet</li>
                  <li>You have test ETH for transaction fees</li>
                  <li>You have test USDC if purchasing that asset</li>
                  <li>Visit <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">Circle Faucet</a> for test USDC</li>
                </ul>
              </div>
            ) : (
              <p>If Base Sepolia fails, try using <strong>Base (Mainnet)</strong> which has the best CDP support.</p>
            )}
          </div>

          <div className={styles.debugInfo}>
            <p>
              <strong>Need to test the API endpoints?</strong>{" "}
              <Link href="/debug" className={styles.debugLink}>
                Visit the debug page
              </Link>{" "}
              to test JWT and session token generation manually.
            </p>
          </div>
        </div>

        <div className={styles.documentationSection}>
          <h3>Documentation</h3>
          <ul className={styles.docLinks}>
            <li>
              <a target="_blank" rel="noreferrer" href="https://docs.cdp.coinbase.com/onchainkit/fund/fund-card">
                FundCard Documentation
              </a>
            </li>
            <li>
              <a target="_blank" rel="noreferrer" href="https://docs.cdp.coinbase.com/onramp-&-offramp/session-token-authentication">
                Session Token Authentication
              </a>
            </li>
            <li>
              <a target="_blank" rel="noreferrer" href="https://docs.base.org/base-camp/docs/intro-to-base">
                Base Network Documentation
              </a>
            </li>
            <li>
              <a target="_blank" rel="noreferrer" href="https://docs.cdp.coinbase.com/onchainkit/getting-started/api-key-authentication">
                CDP API Authentication
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
