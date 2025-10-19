"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { AddressBookManager } from '../features/address-book/AddressBookManager';
import styles from "./HeaderBar.module.css";

export function HeaderBar() {
  const [showAddressBook, setShowAddressBook] = useState(false);
  const _router = useRouter();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logoLink}>
            <h1 className={styles.logo}>BasedBills</h1>
          </Link>
          
          <div className={styles.nav}>
            <button
              onClick={() => setShowAddressBook(true)}
              className={styles.addressBookButton}
              title="Address Book"
            >
              <span className={styles.addressBookIcon}>📇</span>
              <span className={styles.addressBookText}>Addresses</span>
            </button>
            
            <Wallet>
              <ConnectWallet className={styles.walletButton}>
                <Identity className={styles.walletIdentity}>
                  <Avatar className="h-8 w-8" />
                  <div className={styles.walletInfo}>
                    <Name className={styles.walletName} />
                    <Address className={styles.walletAddress} />
                  </div>
                </Identity>
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownBasename />
                <WalletDropdownFundLink />
                <WalletDropdownLink
                  icon="wallet"
                  href="https://keys.coinbase.com"
                >
                  Wallet
                </WalletDropdownLink>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>
      
      <AddressBookManager
        isOpen={showAddressBook}
        onClose={() => setShowAddressBook(false)}
      />
    </>
  );
}
