import Image from "next/image";
import {
  ConnectWallet,
  Wallet,
} from "@coinbase/onchainkit/wallet";
import styles from "./WelcomePage.module.css";

export function WelcomePage() {
  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.welcomeContent}>
        <div className={styles.welcomeHeader}>
          <Image
            src="/basedbills_logo.png"
            alt="BasedBills Logo"
            width={200}
            height={80}
            className={styles.welcomeLogo}
            priority
          />
        </div>
        
        <div className={styles.welcomeMain}>
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
