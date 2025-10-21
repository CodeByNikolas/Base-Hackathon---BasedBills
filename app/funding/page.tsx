"use client";

import { FundCardComponent } from "../components/features/FundCard";

export default function FundingPage() {
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
          <FundCardComponent />
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            How it works:
          </h3>
          <ul className="text-blue-800 space-y-2">
            <li>• Connect your wallet using the wallet connection in the top right</li>
            <li>• Select the amount of USDC you want to purchase</li>
            <li>• Complete the purchase using your preferred payment method</li>
            <li>• USDC will be sent directly to your connected wallet</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
