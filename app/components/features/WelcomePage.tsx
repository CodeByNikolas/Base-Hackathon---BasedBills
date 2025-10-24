import Image from "next/image";
import { useAccount } from "wagmi";
import {
  ConnectWallet,
  Wallet,
} from "@coinbase/onchainkit/wallet";
import styles from "./WelcomePage.module.css";

interface WelcomePageProps {
  onContinue?: () => void;
}

export function WelcomePage({ onContinue }: WelcomePageProps) {
  const { isConnected } = useAccount();

  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.welcomeContent}>
        <div className={styles.welcomeHeader}>
          <Image
            src="/basedbills_logo_copy.png"
            alt="BasedBills Logo"
            width={200}
            height={80}
            className={styles.welcomeLogo}
            priority
          />
        </div>

        <div className={styles.welcomeMain}>
          {!isConnected ? (
            <>
              <h2 className={styles.welcomeTitle}>Hello! Welcome to BasedBills</h2>
              <p className={styles.welcomeDescription}>
                The easiest way to split expenses on Base. <br />
                To get started, connect your wallet.
              </p>

              <div className={styles.welcomeCta}>
                <Wallet>
                  <ConnectWallet className={styles.welcomeConnectButton}>
                    <span>Connect Wallet</span>
                  </ConnectWallet>
                </Wallet>
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.welcomeTitle}>Welcome to BasedBills!</h2>
              <p className={styles.welcomeDescription}>
                You&apos;re all set up and ready to start splitting expenses with your friends on Base.
              </p>

              <div className={styles.welcomeCta}>
                <button
                  onClick={onContinue}
                  className={styles.welcomeContinueButton}
                >
                  Continue to Dashboard
                </button>
              </div>
            </>
          )}

          <div className={styles.welcomeFeatures}>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureIcon}>👥</span>
              <span>Create expense groups</span>
            </div>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureIcon}>🧾</span>
              <span>Split bills easily</span>
            </div>
            <div className={styles.welcomeFeature}>
              <span className={styles.welcomeFeatureIcon}>⚡</span>
              <span>Settle with USDC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
