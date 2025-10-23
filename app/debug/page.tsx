"use client";

import { useState, useEffect } from "react";
import { FundCard } from "@coinbase/onchainkit/fund";
import styles from "./debug.module.css";

interface JwtResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  generatedAt?: string;
  error?: string;
}

interface SessionTokenResponse {
  success: boolean;
  sessionToken?: string;
  channelId?: string;
  clientIP?: string;
  addresses?: Array<{
    address: string;
    blockchains: string[];
  }>;
  originalAddresses?: Array<{
    address: string;
    blockchains: string[];
  }>;
  assets?: string[];
  testnet?: boolean;
  testnetConverted?: boolean;
  generatedAt?: string;
  expiresIn?: number;
  error?: string;
  details?: {
    message?: string;
    code?: string;
    status?: number;
    supportedNetworks?: string[];
  };
}

interface EnvironmentStatus {
  environmentStatus: {
    CDP_SECRET_API_KEY_ID: { configured: boolean };
    CDP_SECRET_API_KEY_PRIVATEKEY: { configured: boolean };
    NEXT_PUBLIC_ONCHAINKIT_API_KEY: { configured: boolean };
  };
  note: string;
  timestamp: string;
}

type Blockchain = "base-sepolia" | "base" | "ethereum";

export default function DebugPage() {
  const [jwtResponse, setJwtResponse] = useState<JwtResponse | null>(null);
  const [sessionTokenResponse, setSessionTokenResponse] = useState<SessionTokenResponse | null>(null);
  const [envStatus, setEnvStatus] = useState<EnvironmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>("base");
  const [customAddress, setCustomAddress] = useState("0x4315d134aCd3221a02dD380ADE3aF39Ce219037c");
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const [manualSessionToken, setManualSessionToken] = useState<string>("");
  const [fundCardStatus, setFundCardStatus] = useState<string>("");
  const [fundCardError, setFundCardError] = useState<string>("");
  const [fundCardSuccess, setFundCardSuccess] = useState<string>("");

  // Sample data for testing
  const [addresses, setAddresses] = useState([
    {
      address: customAddress,
      blockchains: ["base", "ethereum"]
    }
  ]);
  const [assets] = useState(["ETH", "USDC"]);

  // Update testnet status when blockchain changes
  useEffect(() => {
    setIsTestnet(selectedBlockchain === "base-sepolia");
  }, [selectedBlockchain]);

  const updateAddresses = (blockchain: Blockchain, address: string) => {
    setAddresses([{
      address,
      blockchains: [blockchain]
    }]);
  };

  const handleBlockchainChange = (blockchain: Blockchain) => {
    setSelectedBlockchain(blockchain);
    updateAddresses(blockchain, customAddress);
    // Clear FundCard messages when network changes
    setFundCardStatus("");
    setFundCardError("");
    setFundCardSuccess("");
  };

  const handleAddressChange = (address: string) => {
    setCustomAddress(address);
    updateAddresses(selectedBlockchain, address);
  };

  // Check environment status on component mount
  useEffect(() => {
    checkEnvironmentStatus();
  }, []);

  const checkEnvironmentStatus = async () => {
    try {
      const response = await fetch("/api/env-status");
      const data = await response.json();
      setEnvStatus(data);
    } catch (error) {
      console.error("Failed to check environment status:", error);
    }
  };

  const testJwtGeneration = async () => {
    setLoading(true);
    setJwtResponse(null);

    try {
      const response = await fetch("/api/jwt");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setJwtResponse(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      console.error("JWT generation error:", error);
      setJwtResponse({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const testSessionTokenGeneration = async () => {
    setLoading(true);
    setSessionTokenResponse(null);

    try {
      console.log("Testing session token generation for:", { addresses, assets });

      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addresses,
          assets
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Debug session token response:", data);
      setSessionTokenResponse(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Network error";
      console.error("Debug session token error:", error);
      setSessionTokenResponse({
        success: false,
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>CDP Authentication Debug</h1>

      <div className={styles.section}>
        <h2>JWT Token Generation</h2>
        <p className={styles.description}>
          Test JWT token generation for CDP API authentication
        </p>

        <button
          onClick={testJwtGeneration}
          disabled={loading}
          className={styles.button}
        >
          {loading ? "Testing..." : "Generate JWT Token"}
        </button>

        {jwtResponse && (
          <div className={`${styles.response} ${jwtResponse.success ? styles.success : styles.error}`}>
            <h3>JWT Response:</h3>
            <pre className={styles.code}>
              {JSON.stringify(jwtResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Session Token Generation</h2>
        <p className={styles.description}>
          Test session token generation for FundCard component
        </p>

        <div className={styles.inputSection}>
          <h4>Request Configuration:</h4>

          <div className={styles.controlGroup}>
            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Blockchain:</label>
              <select
                value={selectedBlockchain}
                onChange={(e) => handleBlockchainChange(e.target.value as Blockchain)}
                className={styles.controlSelect}
              >
                <option value="base">Base (Mainnet) - Recommended</option>
                <option value="ethereum">Ethereum (Mainnet)</option>
                <option value="base-sepolia">🧪 Base Sepolia (Testnet) - Supported via Conversion</option>
              </select>
            </div>

            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Address:</label>
              <div className={styles.addressControl}>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  className={styles.controlInput}
                  placeholder="0x..."
                />
                {typeof window !== 'undefined' && (window as any).ethereum && (
                  <button
                    onClick={async () => {
                      try {
                        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                        if (accounts && accounts[0]) {
                          handleAddressChange(accounts[0]);
                        }
                      } catch (error) {
                        console.error('Failed to get wallet address:', error);
                      }
                    }}
                    className={styles.walletButton}
                    title="Get wallet address"
                  >
                    Get Wallet
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.dataDisplay}>
            <strong>Addresses:</strong>
            <pre className={styles.code}>{JSON.stringify(addresses, null, 2)}</pre>
            <strong>Assets:</strong>
            <pre className={styles.code}>{JSON.stringify(assets, null, 2)}</pre>
          </div>
        </div>

        {/* Testnet Info */}
        {isTestnet && (
          <div className={styles.testnetWarning}>
            <div className={styles.warningIcon}>🧪</div>
            <div className={styles.warningContent}>
              <h4>Base Sepolia Testnet Mode</h4>
              <p>✅ Session tokens are generated for Base mainnet but can be used with Base Sepolia in onramp URLs.</p>
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

        <button
          onClick={testSessionTokenGeneration}
          disabled={loading}
          className={styles.button}
        >
          {loading ? "Testing..." : "Generate Session Token"}
        </button>

        {sessionTokenResponse && (
          <div className={`${styles.response} ${sessionTokenResponse.success ? styles.success : styles.error}`}>
            <h3>Session Token Response:</h3>
            {sessionTokenResponse.testnetConverted && (
              <div className={styles.testnetNote}>
                <strong>✅ Testnet Conversion Successful!</strong>
                <br />
                Original: Base Sepolia → Generated for: Base mainnet
                <br />
                <strong>Session Token:</strong> {sessionTokenResponse.sessionToken}
                <br />
                This token can be used with Base Sepolia in onramp URLs.
              </div>
            )}
            <pre className={styles.code}>
              {JSON.stringify(sessionTokenResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>FundCard with Manual Session Token</h2>
        <p className={styles.description}>
          Test the FundCard component with a manually entered session token
        </p>

        <div className={styles.manualTokenSection}>
          <div className={styles.controlGroup}>
            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Network:</label>
              <select
                value={selectedBlockchain}
                onChange={(e) => handleBlockchainChange(e.target.value as Blockchain)}
                className={styles.controlSelect}
              >
                <option value="base">🟢 Base (Mainnet) - Recommended</option>
                <option value="ethereum">🔵 Ethereum (Mainnet)</option>
                <option value="base-sepolia">🧪 Base Sepolia (Testnet) - Supported via Conversion</option>
              </select>
            </div>
            <div className={styles.controlItem}>
              <label className={styles.controlLabel}>Session Token:</label>
              <div className={styles.tokenInputGroup}>
                <input
                  type="text"
                  value={manualSessionToken}
                  onChange={(e) => {
                    setManualSessionToken(e.target.value);
                    // Clear messages when token changes
                    setFundCardStatus("");
                    setFundCardError("");
                    setFundCardSuccess("");
                  }}
                  className={styles.tokenInput}
                  placeholder="Paste your session token here..."
                />
                <button
                  onClick={() => {
                    setManualSessionToken(sessionTokenResponse?.sessionToken || "");
                    // Clear messages when using generated token
                    setFundCardStatus("");
                    setFundCardError("");
                    setFundCardSuccess("");
                  }}
                  disabled={!sessionTokenResponse?.sessionToken}
                  className={styles.useGeneratedButton}
                  title="Use the generated session token above"
                >
                  Use Generated
                </button>
              </div>
            </div>
          </div>

          {manualSessionToken && (
            <div className={styles.fundCardContainer}>
              {/* External Status/Error Display */}
              {(fundCardStatus || fundCardError || fundCardSuccess) && (
                <div className={styles.externalMessages}>
                  <div className={styles.messagesHeader}>
                    <h4>FundCard Events</h4>
                    <button
                      onClick={() => {
                        setFundCardStatus("");
                        setFundCardError("");
                        setFundCardSuccess("");
                      }}
                      className={styles.clearButton}
                    >
                      Clear
                    </button>
                  </div>
                  {fundCardStatus && (
                    <div className={styles.statusMessage}>
                      <strong>Status:</strong> {fundCardStatus}
                    </div>
                  )}
                  {fundCardError && (
                    <div className={styles.errorMessage}>
                      <strong>Error:</strong> {fundCardError}
                    </div>
                  )}
                  {fundCardSuccess && (
                    <div className={styles.successMessage}>
                      <strong>Success:</strong> {fundCardSuccess}
                    </div>
                  )}
                </div>
              )}

              {/* FundCard with External Event Handlers */}
              <div className={styles.fundCardWrapper}>
                <div className={styles.networkDisplay}>
                  <strong>Testing Network:</strong> {isTestnet ? "🧪 Base Sepolia (via conversion)" : `🟢 ${selectedBlockchain}`}
                </div>
                <FundCard
                  sessionToken={manualSessionToken}
                  assetSymbol="ETH"
                  country="US"
                  currency="USD"
                  headerText={`Fund Your ${selectedBlockchain === "ethereum" ? "Ethereum" : "Base"} Wallet (Debug)`}
                  buttonText="Purchase"
                  presetAmountInputs={['10', '25', '50']}
                  onStatus={(status) => {
                    setFundCardStatus(`${status.statusName}${status.statusData ? ` - ${JSON.stringify(status.statusData)}` : ''}`);
                    setFundCardError("");
                    setFundCardSuccess("");
                  }}
                  onError={(error) => {
                    setFundCardError(error ? `${error.errorType}: ${error.debugMessage || error.code || 'Unknown error'}` : '');
                    setFundCardStatus("");
                    setFundCardSuccess("");
                  }}
                  onSuccess={(data) => {
                    setFundCardSuccess(`Transaction successful: ${data.assetSymbol} on ${data.assetName}`);
                    setFundCardStatus("");
                    setFundCardError("");
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.info}>
        <h3>Environment Variables Status:</h3>
        {envStatus ? (
          <>
            <div className={styles.envStatus}>
              <div className={styles.envItem}>
                <span>CDP_SECRET_API_KEY_ID:</span>
                <span className={envStatus.environmentStatus.CDP_SECRET_API_KEY_ID.configured ? styles.configured : styles.missing}>
                  {envStatus.environmentStatus.CDP_SECRET_API_KEY_ID.configured ? "✓ Configured" : "✗ Missing"}
                </span>
              </div>
              <div className={styles.envItem}>
                <span>CDP_SECRET_API_KEY_PRIVATEKEY:</span>
                <span className={envStatus.environmentStatus.CDP_SECRET_API_KEY_PRIVATEKEY.configured ? styles.configured : styles.missing}>
                  {envStatus.environmentStatus.CDP_SECRET_API_KEY_PRIVATEKEY.configured ? "✓ Configured" : "✗ Missing"}
                </span>
              </div>
              <div className={styles.envItem}>
                <span>NEXT_PUBLIC_ONCHAINKIT_API_KEY:</span>
                <span className={envStatus.environmentStatus.NEXT_PUBLIC_ONCHAINKIT_API_KEY.configured ? styles.configured : styles.missing}>
                  {envStatus.environmentStatus.NEXT_PUBLIC_ONCHAINKIT_API_KEY.configured ? "✓ Configured" : "✗ Missing"}
                </span>
              </div>
            </div>
            <div className={styles.note}>
              <p><strong>Note:</strong> {envStatus.note}</p>
            </div>
          </>
        ) : (
          <div className={styles.loading}>
            <p>Checking environment status...</p>
          </div>
        )}
      </div>
    </div>
  );
}
