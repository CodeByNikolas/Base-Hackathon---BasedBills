"use client";
import { ReactNode, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { sdk } from "@farcaster/miniapp-sdk";
import "@coinbase/onchainkit/styles.css";
import { DEFAULT_CHAIN } from "./config/contracts";

const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: "BasedBills",
      preference: "all",
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {
  // Initialize MiniApp SDK
  useEffect(() => {
    const initializeMiniApp = async () => {
      try {
        // Wait for the app to be ready, then hide the loading splash screen
        await sdk.actions.ready();
      } catch (error) {
        console.error("Failed to initialize MiniApp SDK:", error);
      }
    };

    initializeMiniApp();
  }, []);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={DEFAULT_CHAIN}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
