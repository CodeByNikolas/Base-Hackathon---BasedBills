# Manual BaseScan Verification Guide

Since Hardhat is defaulting to Blockscout verification, here's a complete guide for manual verification on BaseScan.

## 🔗 **BaseScan Verification URLs**

- **Main Verification Page**: https://sepolia.basescan.org/verifyContract
- **Alternative Method**: Visit each contract page and click "Verify and Publish"

## 📋 **Contract Information**

### 1. Group Logic Contract
- **Address**: `0xa4cf50aa00c58852c37b3fa663d7ba032843d594`
- **Contract Name**: `Group`
- **Compiler Version**: `v0.8.28+commit.7893614a`
- **Constructor Arguments**: None (empty)
- **Optimization**: Disabled
- **License**: MIT
- **Source File**: `flattened/Group_flattened.sol`

### 2. Registry Contract  
- **Address**: `0x6add08fb50b7e6def745a87a16254522713a5676`
- **Contract Name**: `Registry`
- **Compiler Version**: `v0.8.28+commit.7893614a`
- **Constructor Arguments**: `0x21750fc30922badd61c2f1e48b94683071dfbcaa`
- **Constructor Arguments (ABI Encoded)**: `00000000000000000000000021750fc30922badd61c2f1e48b94683071dfbcaa`
- **Optimization**: Disabled
- **License**: MIT
- **Source File**: `flattened/Registry_flattened.sol`

### 3. GroupFactory Contract
- **Address**: `0xfdf8a83a3d1dc0aa285616883452a2824e559d74`
- **Contract Name**: `GroupFactory`
- **Compiler Version**: `v0.8.28+commit.7893614a`
- **Constructor Arguments**: 
  - Logic Contract: `0xa4cf50aa00c58852c37b3fa663d7ba032843d594`
  - Registry Contract: `0x6add08fb50b7e6def745a87a16254522713a5676`
- **Constructor Arguments (ABI Encoded)**: `000000000000000000000000a4cf50aa00c58852c37b3fa663d7ba032843d5940000000000000000000000006add08fb50b7e6def745a87a16254522713a5676`
- **Optimization**: Disabled
- **License**: MIT
- **Source File**: `flattened/GroupFactory_flattened.sol`

## 🛠️ **Step-by-Step Verification Process**

### Method 1: Web Interface (Recommended)

1. **Visit BaseScan**: Go to https://sepolia.basescan.org/verifyContract

2. **Select Contract Type**: Choose "Solidity (Single file)"

3. **Fill in Details**:
   - Contract Address: (use addresses above)
   - Contract Name: (use names above)
   - Compiler Version: `v0.8.28+commit.7893614a`
   - Optimization: No
   - License Type: MIT License (3)

4. **Source Code**: Copy and paste the content from the corresponding flattened file

5. **Constructor Arguments**: Use the ABI encoded values above (if applicable)

6. **Submit**: Click "Verify and Publish"

### Method 2: API Verification (Advanced)

Use the `basescan-verify.ts` script:

```bash
npm run ts-node scripts/basescan-verify.ts
```

## 📁 **Flattened Contract Files**

The flattened contracts are available in the `flattened/` directory:
- `Group_flattened.sol`
- `Registry_flattened.sol` 
- `GroupFactory_flattened.sol`

## 🔧 **Compiler Settings**

```json
{
  "version": "0.8.28",
  "settings": {
    "optimizer": {
      "enabled": false,
      "runs": 200
    },
    "evmVersion": "default"
  }
}
```

## ⚠️ **Common Issues & Solutions**

1. **"Contract source code already verified"**: The contract is already verified
2. **"Invalid constructor arguments"**: Double-check the ABI encoded arguments
3. **"Compilation failed"**: Ensure you're using the exact compiler version
4. **"Contract not found"**: Wait a few minutes for the contract to be indexed

## 🎯 **Verification Priority**

Recommended verification order:
1. **Group Logic** (no dependencies)
2. **Registry** (simple constructor)
3. **GroupFactory** (depends on both above)

## 📞 **Support Links**

- **BaseScan Help**: https://info.basescan.org/how-to-verify-contracts/
- **Contract Pages**:
  - [Group Logic](https://sepolia.basescan.org/address/0xa4cf50aa00c58852c37b3fa663d7ba032843d594)
  - [Registry](https://sepolia.basescan.org/address/0x6add08fb50b7e6def745a87a16254522713a5676)
  - [GroupFactory](https://sepolia.basescan.org/address/0xfdf8a83a3d1dc0aa285616883452a2824e559d74)

## ✅ **Current Status**

- ✅ **Deployed**: All contracts successfully deployed
- ✅ **Blockscout Verified**: All contracts verified on Blockscout
- ⏳ **BaseScan Verification**: Use this guide for manual verification
- ✅ **Fully Functional**: All contracts tested and working

The contracts are **production-ready** regardless of BaseScan verification status! 🚀
