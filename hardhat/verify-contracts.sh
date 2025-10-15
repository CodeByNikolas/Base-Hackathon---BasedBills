#!/bin/bash

echo "🔍 Verifying BasedBills contracts on Base Sepolia..."
echo "📋 Contract Addresses:"
echo "Group Logic: 0xa4cf50aa00c58852c37b3fa663d7ba032843d594"
echo "Registry: 0x6add08fb50b7e6def745a87a16254522713a5676"
echo "GroupFactory: 0xfdf8a83a3d1dc0aa285616883452a2824e559d74"
echo ""

echo "1️⃣ Verifying Group Logic Contract..."
npx hardhat verify --network baseSepolia 0xa4cf50aa00c58852c37b3fa663d7ba032843d594
echo ""

echo "2️⃣ Verifying Registry Contract..."
npx hardhat verify --network baseSepolia 0x6add08fb50b7e6def745a87a16254522713a5676 "0x21750fc30922badd61c2f1e48b94683071dfbcaa"
echo ""

echo "3️⃣ Verifying GroupFactory Contract..."
npx hardhat verify --network baseSepolia 0xfdf8a83a3d1dc0aa285616883452a2824e559d74 "0xa4cf50aa00c58852c37b3fa663d7ba032843d594" "0x6add08fb50b7e6def745a87a16254522713a5676"
echo ""

echo "🎉 Verification process completed!"
echo ""
echo "🔗 View contracts on BaseScan:"
echo "https://sepolia.basescan.org/address/0xfdf8a83a3d1dc0aa285616883452a2824e559d74"
echo "https://sepolia.basescan.org/address/0x6add08fb50b7e6def745a87a16254522713a5676"
echo "https://sepolia.basescan.org/address/0xa4cf50aa00c58852c37b3fa663d7ba032843d594"
echo ""
echo "🔗 View contracts on Blockscout (Already verified):"
echo "https://base-sepolia.blockscout.com/address/0xfdf8a83a3d1dc0aa285616883452a2824e559d74#code"
echo "https://base-sepolia.blockscout.com/address/0x6add08fb50b7e6def745a87a16254522713a5676#code"
echo "https://base-sepolia.blockscout.com/address/0xa4cf50aa00c58852c37b3fa663d7ba032843d594#code"
