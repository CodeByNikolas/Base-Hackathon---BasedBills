"use client";
import Link from "next/link";
import { useAccount } from "wagmi";
import styles from "./page.module.css";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
  WalletDropdownLink,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { WelcomePage } from "./components/WelcomePage";
import { HeaderBar } from "./components/HeaderBar";

export default function Home() {
  const { isConnected } = useAccount();

  // Welcome screen for non-connected users
  if (!isConnected) {
    return <WelcomePage />;
  }

  // Main app for connected users
  return (
    <div className={styles.container}>
      <HeaderBar />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Your Groups</h1>
          <p className={styles.subtitle}>
            Manage your expense groups and settle bills onchain
          </p>
          
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📝</div>
            <h3>No groups yet</h3>
            <p>Create your first group to start splitting expenses</p>
            <button className={styles.createButton}>
              Create Group
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
