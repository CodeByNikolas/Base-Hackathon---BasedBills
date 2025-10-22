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
}

export default function FundCardDemo() {
  const { address, isConnected } = useAccount();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
              blockchains: ["base-sepolia", "base", "ethereum"]
            }
          ],
          assets: ["ETH", "USDC"]
        }),
      });

      const data: SessionTokenData = await response.json();

      if (data.success && data.sessionToken) {
        setSessionToken(data.sessionToken);
      } else {
        setError(data.error || "Failed to generate session token");
      }
    } catch (err) {
      setError("Network error while generating session token");
      console.error("Session token error:", err);
    }

    setLoading(false);
  }, [address]);

  // Auto-generate session token when wallet is connected
  useEffect(() => {
    if (isConnected && address && !sessionToken) {
      generateSessionToken();
    }
  }, [isConnected, address, sessionToken, generateSessionToken]);

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
        <div className={styles.fundCardSection}>
          <h2>FundCard Component</h2>
          <div className={styles.fundCardWrapper}>
            <FundCard
              sessionToken={sessionToken}
              assetSymbol="ETH"
              country="US"
              currency="USD"
              headerText="Fund Your Base Wallet"
              buttonText="Purchase"
              presetAmountInputs={['10', '25', '50']}
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
