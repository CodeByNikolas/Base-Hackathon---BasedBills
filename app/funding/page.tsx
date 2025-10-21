"use client";

import { FundCardComponent } from "../components/features/FundCard";
import { useAccount } from "wagmi";

export default function FundingPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Fund Your Wallet
          </h1>
          <p className="text-lg text-gray-600">
            Purchase USDC directly to your connected wallet
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {!isConnected && (
            <div className="text-center mb-6 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 mb-4">
                Please connect your wallet to use the funding feature
              </p>
              <p className="text-sm text-yellow-600">
                Click the wallet icon in the top right corner to connect
              </p>
            </div>
          )}
          
          <div className="mt-8">
            <FundCardComponent />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How it works:
          </h3>
          <ul className="text-blue-800 space-y-2">
            <li>• Connect your wallet using the button above</li>
            <li>• Select the amount of USDC you want to purchase</li>
            <li>• Complete the purchase using your preferred payment method</li>
            <li>• USDC will be sent directly to your connected wallet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
