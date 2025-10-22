"use client";

import { useState, useEffect } from "react";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { FundCardModal } from "../../components/features/FundCardModal";
import { FundCard } from "@coinbase/onchainkit/fund";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";
import styles from "./page.module.css";

interface ValidationResult {
  variable: string;
  status: 'valid' | 'invalid' | 'missing' | 'server-only';
  message: string;
  isRequired: boolean;
}

interface ValidationResponse {
  success: boolean;
  environmentStatus: {
    CDP_SECRET_API_KEY_ID: { configured: boolean };
    CDP_SECRET_API_KEY_PRIVATEKEY: { configured: boolean };
    NEXT_PUBLIC_ONCHAINKIT_API_KEY: { configured: boolean };
  };
  note: string;
  timestamp: string;
}

export default function FundCardDebugPage() {
  const [showModal, setShowModal] = useState(false);
  const [presetAmount, setPresetAmount] = useState<string>("");
  const [validationResults, setValidationResults] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Check environment status on component mount
  useEffect(() => {
    validateEnvironmentVariables();
  }, []);

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find(c => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const handleTestModal = (amount?: string) => {
    setPresetAmount(amount || "");
    setShowModal(true);
  };

  const validateEnvironmentVariables = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/env-status');
      const data = await response.json();
      setValidationResults(data);
    } catch (error) {
      console.error('Failed to validate environment variables:', error);
      setValidationResults({
        success: false,
        environmentStatus: {
          CDP_SECRET_API_KEY_ID: { configured: false },
          CDP_SECRET_API_KEY_PRIVATEKEY: { configured: false },
          NEXT_PUBLIC_ONCHAINKIT_API_KEY: { configured: false },
        },
        note: "Error checking environment status",
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className={styles.container}>
      <HeaderBar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h1 className={styles.headerTitle}>
              FundCard Debug Lab
            </h1>
            <p className={styles.headerSubtitle}>
              Interactive testing environment for the Coinbase OnchainKit FundCard component
            </p>
            <div className={styles.headerBadge}>
              🔬 Test • Debug • Iterate
            </div>
          </div>

          {/* Main Content Grid */}
          <div className={styles.contentGrid}>

            {/* Left Column: Live FundCard Preview */}
            <div className="space-y-6">
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <div className={styles.cardIcon}>
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Live FundCard Preview
                  </h2>
                </div>

                <div className={styles.cardContent}>
                  {/* Wallet Status Card */}
                  <div className={styles.walletStatus}>
                    <div className={styles.walletStatusContent}>
                      <div className={styles.walletStatusInfo}>
                        <div className={`${styles.walletStatusIndicator} ${isConnected ? 'connected' : 'disconnected'}`} />
                        <div>
                          <p className={styles.walletStatusText}>
                            {isConnected ? 'Wallet Connected' : 'Wallet Required'}
                          </p>
                          <p className={styles.walletStatusAddress}>
                            {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet to test FundCard'}
                          </p>
                        </div>
                      </div>
                      <div className={styles.walletButtons}>
                        {!isConnected ? (
                          <>
                            <button
                              onClick={() => handleConnect('coinbaseWallet')}
                              className={`${styles.walletButton} ${styles['walletButton-coinbase']}`}
                            >
                              Coinbase
                            </button>
                            <button
                              onClick={() => handleConnect('metaMask')}
                              className={`${styles.walletButton} ${styles['walletButton-metamask']}`}
                            >
                              MetaMask
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => disconnect()}
                            className={`${styles.walletButton} ${styles['walletButton-disconnect']}`}
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actual FundCard Component */}
                  <div className={styles.fundCardPreview}>
                    <div className={`${styles.fundCardStatus} ${isConnected ? 'connected' : 'disconnected'}`}>
                      {isConnected ? '🎉 FundCard Ready!' : '🔒 Connect wallet to see FundCard'}
                    </div>

                    {isConnected ? (
                      <div className="flex justify-center">
                        <div className="w-full max-w-sm">
                          <FundCard
                            assetSymbol="USDC"
                            country="US"
                            currency="USD"
                            headerText="Test FundCard"
                            buttonText="Buy USDC"
                            presetAmountInputs={["25", "50", "100"]}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className={styles.fundCardPlaceholder}>
                        <div className={styles.fundCardPlaceholderIcon}>🔐</div>
                        <p className={styles.fundCardPlaceholderText}>
                          Connect your wallet to see the FundCard in action
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Test Controls */}
            <div className="space-y-6">

              {/* Test Scenarios */}
              <div className={styles.testControls}>
                <div className={styles.testSection}>
                  <h2 className={styles.cardTitle}>
                    <div className={styles.cardIcon}>
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    Modal Test Scenarios
                  </h2>

                  <div className={styles.testGrid}>
                    {/* Basic FundCard Tests */}
                    <div className="space-y-3">
                      <h3 className={`${styles.testSectionTitle}`}>💳 Basic Funding Tests</h3>

                      <button
                        onClick={() => handleTestModal()}
                        className={`${styles.testButton} ${styles['testButton-basic']}`}
                        disabled={!isConnected}
                      >
                        🚀 Test Basic FundCard Modal
                      </button>

                      <button
                        onClick={() => handleTestModal("25")}
                        className={`${styles.testButton} ${styles['testButton-preset']}`}
                        disabled={!isConnected}
                      >
                        💚 Test with $25 Preset
                      </button>

                      <button
                        onClick={() => handleTestModal("100")}
                        className={`${styles.testButton} ${styles['testButton-purple']}`}
                        disabled={!isConnected}
                      >
                        💜 Test with $100 Preset
                      </button>
                    </div>

                    {/* Settlement Simulation */}
                    <div className="space-y-3">
                      <h3 className={`${styles.testSectionTitle}`}>⚖️ Settlement Scenarios</h3>

                      <button
                        onClick={() => handleTestModal("15.75")}
                        className={`${styles.testButton} ${styles['testButton-small']}`}
                        disabled={!isConnected}
                      >
                        🟠 Small Settlement ($15.75)
                      </button>

                      <button
                        onClick={() => handleTestModal("250.50")}
                        className={`${styles.testButton} ${styles['testButton-large']}`}
                        disabled={!isConnected}
                      >
                        🔴 Large Settlement ($250.50)
                      </button>

                      <div className={styles.testNote}>
                        <strong>💡 Note:</strong> These simulate real settlement scenarios where users need specific amounts of USDC for bill splitting.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Environment Variables Status */}
          <div className={styles.envStatus}>
            <div className={styles.envGrid}>
              <div className={styles.envSection}>
                <h3 className={styles.envSectionTitle}>✅ Environment Variables</h3>
                <div className="space-y-2">
                  <div className={styles.envValidationContainer}>
                    <button
                      onClick={validateEnvironmentVariables}
                      className={styles.validateButton}
                      disabled={isValidating}
                    >
                      {isValidating ? '🔄 Validating...' : '🔍 Validate All Variables'}
                    </button>
                    
                    {validationResults && (
                      <div className={styles.validationResults}>
                        <div className={styles.validationSummary}>
                          <span className={styles.validationSummaryItem}>
                            ✅ Configured: {Object.values(validationResults.environmentStatus).filter(v => v.configured).length}
                          </span>
                          <span className={styles.validationSummaryItem}>
                            ❌ Missing: {Object.values(validationResults.environmentStatus).filter(v => !v.configured).length}
                          </span>
                        </div>

                        <div className={styles.validationDetails}>
                          {Object.entries(validationResults.environmentStatus).map(([key, value]) => (
                            <div key={key} className={`${styles.envItem} ${styles['envItem-required']}`}>
                              <span className={styles.envLabel}>{key}:</span>
                              <span className={`${styles.envStatusBadge} ${
                                value.configured ? styles['envStatusBadge-success'] : styles['envStatusBadge-error']
                              }`}>
                                {value.configured ? '✅ Configured' : '❌ Missing'}
                              </span>
                              <div className={styles.envMessage}>Checked securely on server-side</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!validationResults && (
                      <div className="space-y-2">
                        <div className={`${styles.envItem} ${styles['envItem-required']}`}>
                          <span className={styles.envLabel}>CDP_SECRET_API_KEY_ID:</span>
                          <span className={`${styles.envStatusBadge} ${styles['envStatusBadge-warning']}`}>
                            🔄 Checking...
                          </span>
                        </div>
                        <div className={`${styles.envItem} ${styles['envItem-required']}`}>
                          <span className={styles.envLabel}>CDP_SECRET_API_KEY_PRIVATEKEY:</span>
                          <span className={`${styles.envStatusBadge} ${styles['envStatusBadge-warning']}`}>
                            🔄 Checking...
                          </span>
                        </div>
                        <div className={`${styles.envItem} ${styles['envItem-required']}`}>
                          <span className={styles.envLabel}>NEXT_PUBLIC_ONCHAINKIT_API_KEY:</span>
                          <span className={`${styles.envStatusBadge} ${styles['envStatusBadge-warning']}`}>
                            🔄 Checking...
                          </span>
                        </div>
                        <div className={styles.testNote}>
                          <strong>💡 Note:</strong> Environment variables are checked securely via API on load.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.envSection}>
                <h3 className={styles.envSectionTitle}>🔧 Additional Setup</h3>
                <div className="space-y-2">
                  <div className={styles.testNote}>
                    <strong>💡 Note:</strong> Additional environment variables (like CDP_API_KEY_NAME, IRON_PASSWORD) are not checked here but should be configured in your environment if needed.
                  </div>
                  <div className={styles.envSetupText}>
                    <strong>🔧 Setup:</strong> Ensure all required CDP and OnchainKit keys are set in your Vercel environment variables.
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.envSetup}>
              <p className={styles.envSetupText}>
                <strong>🔧 Setup:</strong> Add these to your Vercel environment variables.
                <br />• CDP keys from <a href="https://portal.cdp.coinbase.com/" className={styles.envSetupLink}>Coinbase Developer Platform</a>
                <br />• WalletConnect ID from <a href="https://cloud.walletconnect.com/" className={styles.envSetupLink}>WalletConnect Cloud</a>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className={styles.instructions}>
            <h3 className={styles.instructionsTitle}>
              <div className={styles.cardIcon}>
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Testing Instructions
            </h3>
            <div className={styles.instructionsGrid}>
              <div className={styles.instructionsColumn}>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">🚀 Quick Start</h4>
                <ol className={styles.instructionsList}>
                  <li>Connect your wallet using the buttons above</li>
                  <li>See the live FundCard component on the left</li>
                  <li>Test different modal scenarios using the buttons</li>
                  <li>Verify all environment variables are green ✅</li>
                </ol>
              </div>
              <div className={styles.instructionsColumn}>
                <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">🔬 Advanced Testing</h4>
                <ol className={styles.instructionsList}>
                  <li>Test preset amounts ($25, $100, etc.)</li>
                  <li>Simulate settlement scenarios</li>
                  <li>Check error handling with invalid amounts</li>
                  <li>Verify responsive design on mobile</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FundCard Modal for Testing */}
      <FundCardModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setPresetAmount("");
        }}
        presetAmount={presetAmount}
        title={`FundCard Debug Lab${presetAmount ? ` - $${presetAmount} Test` : ''}`}
      />
    </div>
  );
}
