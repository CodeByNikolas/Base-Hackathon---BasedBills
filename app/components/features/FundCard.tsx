"use client";

import { FundCard } from "@coinbase/onchainkit/fund";

export function FundCardComponent() {
  return (
    <div className="max-w-md mx-auto">
      <FundCard
        assetSymbol="USDC"
        country="US"
        currency="USD"
        headerText="Purchase USDC"
        buttonText="Purchase"
        presetAmountInputs={["10", "25", "50"]}
      />
    </div>
  );
}
