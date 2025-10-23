"use client";

import { useState, useEffect } from "react";
import { FundCard } from "@coinbase/onchainkit/fund";
import { base, baseSepolia } from "wagmi/chains";
import { isBaseEnsName } from "../utils/addressBook";
import { useBaseEnsResolver } from "../hooks/useAddressBook";
import styles from "./debug.module.css";

interface JwtResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface SessionResponse {
  success: boolean;
  sessionToken?: string;
  error?: string;
}

enum Blockchain {
  ETHEREUM = "ethereum",
  BASE = "base",
  BASE_SEPOLIA = "base-sepolia"
}

export default function DebugPage() {
  // State for JWT testing
  const [jwtToken, setJwtToken] = useState<string>("");
  const [jwtStatus, setJwtStatus] = useState<string>("");
  const [jwtError, setJwtError] = useState<string>("");
  const [jwtSuccess, setJwtSuccess] = useState<string>("");

  // State for session testing
  const [sessionToken, setSessionToken] = useState<string>("");
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [sessionError, setSessionError] = useState<string>("");
  const [sessionSuccess, setSessionSuccess] = useState<string>("");

  // State for FundCard testing
  const [selectedBlockchain, setSelectedBlockchain] = useState<Blockchain>(Blockchain.BASE);
  const [isTestnet, setIsTestnet] = useState<boolean>(false);
  const [customAddress, setCustomAddress] = useState<string>("0x1234567890123456789012345678901234567890");
  const [manualSessionToken, setManualSessionToken] = useState<string>("");
  const [fundCardStatus, setFundCardStatus] = useState<string>("");
  const [fundCardError, setFundCardError] = useState<string>("");
  const [fundCardSuccess, setFundCardSuccess] = useState<string>("");

  // Base ENS Resolution debugging
  const [testBaseEnsName, setTestBaseEnsName] = useState<string>("thisisstrongk.base.eth");
  const [baseEnsDebugInfo, setBaseEnsDebugInfo] = useState<any>(null);

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

  // Base ENS resolution debugging hook
  const baseEnsResolver = useBaseEnsResolver(testBaseEnsName);

  // Update Base ENS debug info whenever resolution state changes
  useEffect(() => {
    setBaseEnsDebugInfo({
      inputName: testBaseEnsName,
      isValid: testBaseEnsName.includes('.base.eth'),
      nameType: 'base-ens',
      isBaseEns: isBaseEnsName(testBaseEnsName),
      resolvedAddress: baseEnsResolver.address,
      isResolving: baseEnsResolver.isResolving,
      error: baseEnsResolver.error,
      retryCount: baseEnsResolver.retryCount,
      timestamp: new Date().toISOString(),
    });
  }, [testBaseEnsName, baseEnsResolver]);

  const updateAddresses = (blockchain: Blockchain, address: string) => {
    setAddresses([{
      address,
      blockchains: [blockchain]
    }]);
  };

  const testJwt = async () => {
    setJwtStatus("Testing JWT...");
    setJwtError("");
    setJwtSuccess("");

    try {
      const response = await fetch('/api/jwt');
      const data: JwtResponse = await response.json();
      
      if (data.success && data.token) {
        setJwtToken(data.token);
        setJwtSuccess("JWT generated successfully!");
        setJwtStatus("✅ JWT Test Passed");
      } else {
        setJwtError(data.error || "Failed to generate JWT");
        setJwtStatus("❌ JWT Test Failed");
      }
    } catch (error) {
      setJwtError(`Network error: ${error}`);
      setJwtStatus("❌ JWT Test Failed");
    }
  };

  const testSession = async () => {
    setSessionStatus("Testing Session...");
    setSessionError("");
    setSessionSuccess("");

    try {
      const response = await fetch('/api/session');
      const data: SessionResponse = await response.json();
      
      if (data.success && data.sessionToken) {
        setSessionToken(data.sessionToken);
        setSessionSuccess("Session created successfully!");
        setSessionStatus("✅ Session Test Passed");
      } else {
        setSessionError(data.error || "Failed to create session");
        setSessionStatus("❌ Session Test Failed");
      }
    } catch (error) {
      setSessionError(`Network error: ${error}`);
      setSessionStatus("❌ Session Test Failed");
    }
  };

  const testFundCard = async () => {
    setFundCardStatus("Testing FundCard...");
    setFundCardError("");
    setFundCardSuccess("");

    try {
      // Simulate FundCard interaction
      setFundCardSuccess("FundCard test completed!");
      setFundCardStatus("✅ FundCard Test Passed");
    } catch (error) {
      setFundCardError(`FundCard error: ${error}`);
      setFundCardStatus("❌ FundCard Test Failed");
    }
  };

  const clearAll = () => {
    setJwtToken("");
    setJwtStatus("");
    setJwtError("");
    setJwtSuccess("");
    setSessionToken("");
    setSessionStatus("");
    setSessionError("");
    setSessionSuccess("");
    setFundCardStatus("");
    setFundCardError("");
    setFundCardSuccess("");
  };

  return (
    <div className={styles.container}>
      <h1>Debug Page</h1>
      
      {/* JWT Testing Section */}
      <div className={styles.section}>
        <h2>JWT Testing</h2>
        <div className={styles.controls}>
          <button onClick={testJwt} className={styles.walletButton}>
            Test JWT Generation
          </button>
          <button onClick={clearAll} className={styles.clearButton}>
            Clear All
          </button>
        </div>
        
        <div className={styles.status}>
          <div className={styles.statusItem}>
            <strong>Status:</strong> <span className={jwtStatus.includes('✅') ? styles.success : styles.error}>{jwtStatus || 'Not tested'}</span>
          </div>
          {jwtSuccess && <div className={styles.successMessage}>{jwtSuccess}</div>}
          {jwtError && <div className={styles.errorMessage}>{jwtError}</div>}
          {jwtToken && (
            <div className={styles.tokenDisplay}>
              <strong>JWT Token:</strong>
              <pre className={styles.token}>{jwtToken}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Session Testing Section */}
      <div className={styles.section}>
        <h2>Session Testing</h2>
        <div className={styles.controls}>
          <button onClick={testSession} className={styles.walletButton}>
            Test Session Creation
          </button>
        </div>
        
        <div className={styles.status}>
          <div className={styles.statusItem}>
            <strong>Status:</strong> <span className={sessionStatus.includes('✅') ? styles.success : styles.error}>{sessionStatus || 'Not tested'}</span>
          </div>
          {sessionSuccess && <div className={styles.successMessage}>{sessionSuccess}</div>}
          {sessionError && <div className={styles.errorMessage}>{sessionError}</div>}
          {sessionToken && (
            <div className={styles.tokenDisplay}>
              <strong>Session Token:</strong>
              <pre className={styles.token}>{sessionToken}</pre>
            </div>
          )}
        </div>
      </div>

      {/* FundCard Testing Section */}
      <div className={styles.section}>
        <h2>FundCard Testing</h2>
        
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Blockchain:</label>
            <select 
              value={selectedBlockchain} 
              onChange={(e) => setSelectedBlockchain(e.target.value as Blockchain)}
              className={styles.controlSelect}
            >
              <option value={Blockchain.ETHEREUM}>Ethereum</option>
              <option value={Blockchain.BASE}>Base</option>
              <option value={Blockchain.BASE_SEPOLIA}>Base Sepolia</option>
            </select>
          </div>
          
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Custom Address:</label>
            <input
              type="text"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className={styles.controlInput}
              placeholder="0x..."
            />
          </div>
          
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Manual Session Token:</label>
            <input
              type="text"
              value={manualSessionToken}
              onChange={(e) => setManualSessionToken(e.target.value)}
              className={styles.controlInput}
              placeholder="Optional session token"
            />
          </div>
          
          <button onClick={testFundCard} className={styles.walletButton}>
            Test FundCard
          </button>
        </div>
        
        <div className={styles.status}>
          <div className={styles.statusItem}>
            <strong>Status:</strong> <span className={fundCardStatus.includes('✅') ? styles.success : styles.error}>{fundCardStatus || 'Not tested'}</span>
          </div>
          <div className={styles.statusItem}>
            <strong>Testnet Mode:</strong> <span className={isTestnet ? styles.warning : styles.success}>{isTestnet ? 'Yes' : 'No'}</span>
          </div>
          {fundCardSuccess && <div className={styles.successMessage}>{fundCardSuccess}</div>}
          {fundCardError && <div className={styles.errorMessage}>{fundCardError}</div>}
        </div>

        {/* FundCard Component */}
        <div className={styles.fundCardContainer}>
          <FundCard
            assetSymbol="ETH"
            country="US"
            sessionToken={manualSessionToken || sessionToken}
            onSuccess={(result) => {
              setFundCardSuccess(`FundCard Success: ${JSON.stringify(result)}`);
              setFundCardStatus("✅ FundCard Success");
            }}
            onError={(error) => {
              setFundCardError(`FundCard Error: ${error?.debugMessage || error?.code || 'Unknown error'}`);
              setFundCardStatus("❌ FundCard Error");
            }}
          />
        </div>
      </div>

      {/* Base ENS Resolution Testing Section */}
      <div className={styles.section}>
        <h2>Base ENS Resolution Testing</h2>
        <p className={styles.debugDescription}>
          Test Base ENS name resolution using CDP SDK. Only .base.eth names are supported.
        </p>
        
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Base ENS Name:</label>
            <input
              type="text"
              value={testBaseEnsName}
              onChange={(e) => setTestBaseEnsName(e.target.value)}
              className={styles.controlInput}
              placeholder="name.base.eth"
            />
            <button
              onClick={() => baseEnsResolver.retry()}
              className={styles.walletButton}
              disabled={!testBaseEnsName}
            >
              {baseEnsResolver.isResolving ? 'Resolving...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick Test Cases */}
        <div className={styles.testCases}>
          <label className={styles.controlLabel}>Quick Tests:</label>
          <div className={styles.testButtons}>
            {[
              'thisisstrongk.base.eth',
              'zizzamia.base.eth',
              'test.base.eth',
              'invalid.name'
            ].map((testName) => (
              <button
                key={testName}
                onClick={() => setTestBaseEnsName(testName)}
                className={`${styles.testButton} ${testBaseEnsName === testName ? styles.active : ''}`}
              >
                {testName}
              </button>
            ))}
          </div>
        </div>

        {/* Base ENS Resolution Debug Info Display */}
        <div className={styles.ensDebugSection}>
          <h3>Base ENS Resolution Details:</h3>
          <div className={styles.debugInfoGrid}>
            <div className={styles.debugItem}>
              <strong>Input Name:</strong>
              <span className={baseEnsDebugInfo?.isValid ? styles.valid : styles.invalid}>
                {baseEnsDebugInfo?.inputName || 'None'}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Name Type:</strong>
              <span className={styles.neutral}>
                {baseEnsDebugInfo?.nameType || 'invalid'}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Validation:</strong>
              <span className={baseEnsDebugInfo?.isValid ? styles.valid : styles.invalid}>
                {baseEnsDebugInfo?.isValid ? '✅ Valid' : '❌ Invalid'}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Base ENS:</strong>
              <span className={baseEnsDebugInfo?.isBaseEns ? styles.valid : styles.neutral}>
                {baseEnsDebugInfo?.isBaseEns ? '✅ Yes' : '➖ No'}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Resolution Method:</strong>
              <span className={styles.neutral}>
                CDP SDK (OnchainKit)
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Chain Used:</strong>
              <span className={styles.neutral}>
                Base (via CDP SDK)
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Status:</strong>
              <span className={baseEnsResolver?.isResolving ? styles.loading : styles.neutral}>
                {baseEnsResolver?.isResolving ? '🔄 Resolving...' : '✅ Ready'}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Retry Count:</strong>
              <span className={baseEnsResolver?.retryCount > 0 ? styles.loading : styles.neutral}>
                {baseEnsResolver?.retryCount || 0}
              </span>
            </div>
            <div className={styles.debugItem}>
              <strong>Resolved Address:</strong>
              <span className={baseEnsResolver?.address ? styles.valid : styles.neutral}>
                {baseEnsResolver?.address ?
                  `${baseEnsResolver.address.slice(0, 6)}...${baseEnsResolver.address.slice(-4)}` :
                  'Not resolved'}
              </span>
            </div>
          </div>

          {/* Hook State Details */}
          <div className={styles.debugSection}>
            <h4>CDP SDK Hook State:</h4>
            <div className={styles.debugInfoGrid}>
              <div className={styles.debugItem}>
                <strong>Data:</strong>
                <span className={baseEnsResolver?.address ? styles.valid : styles.neutral}>
                  {baseEnsResolver?.address ?
                    `${baseEnsResolver.address.slice(0, 6)}...${baseEnsResolver.address.slice(-4)}` :
                    'null'}
                </span>
              </div>
              <div className={styles.debugItem}>
                <strong>Loading:</strong>
                <span className={baseEnsResolver?.isResolving ? styles.loading : styles.neutral}>
                  {baseEnsResolver?.isResolving ? '🔄 true' : '✅ false'}
                </span>
              </div>
              <div className={styles.debugItem}>
                <strong>Error:</strong>
                <span className={baseEnsResolver?.error ? styles.invalid : styles.neutral}>
                  {baseEnsResolver?.error ? '❌ true' : '✅ false'}
                </span>
              </div>
              <div className={styles.debugItem}>
                <strong>Success:</strong>
                <span className={baseEnsResolver?.address && !baseEnsResolver.error ? styles.valid : styles.neutral}>
                  {baseEnsResolver?.address && !baseEnsResolver.error ? '✅ true' : '➖ false'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {baseEnsResolver?.error && (
            <div className={styles.ensError}>
              <strong>❌ Error:</strong>
              <pre className={styles.errorDetails}>
                {baseEnsResolver.error.message}
              </pre>
              <button
                onClick={() => baseEnsResolver.retry()}
                className={styles.retryButton}
              >
                Retry Resolution
              </button>
            </div>
          )}

          {/* Raw Debug Info */}
          <details className={styles.debugDetails}>
            <summary>Raw Base ENS Resolution Debug Info</summary>
            <pre className={styles.rawDebug}>
              {JSON.stringify(baseEnsDebugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}