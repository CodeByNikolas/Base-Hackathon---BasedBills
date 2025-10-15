import { network } from "hardhat";

console.log("🔍 Manual verification of contracts on Base Sepolia...");
console.log("Note: This will use Blockscout verification if Etherscan API key is not available");

// Contract addresses from previous deployment
const addresses = {
  groupLogic: "0xa4cf50aa00c58852c37b3fa663d7ba032843d594",
  registry: "0x6add08fb50b7e6def745a87a16254522713a5676", 
  groupFactory: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74",
  deployerAddress: "0x21750fc30922badd61c2f1e48b94683071dfbcaa"
};

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

async function verifyContract(
  address: string, 
  constructorArguments: any[], 
  contractName: string
) {
  try {
    console.log(`\n🔍 Verifying ${contractName} at ${address}...`);
    
    // Import hardhat dynamically to access run function
    const hre = await import("hardhat");
    
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
    });
    
    console.log(`✅ ${contractName} verified successfully!`);
    console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${address}`);
    console.log(`🔗 View on Blockscout: https://base-sepolia.blockscout.com/address/${address}#code`);
    
  } catch (error) {
    if (error.message.includes("Already Verified") || error.message.includes("already verified")) {
      console.log(`✅ ${contractName} already verified!`);
      console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${address}`);
      console.log(`🔗 View on Blockscout: https://base-sepolia.blockscout.com/address/${address}#code`);
    } else {
      console.log(`⚠️ ${contractName} verification:`, error.message);
      console.log(`🔗 Still viewable on BaseScan: https://sepolia.basescan.org/address/${address}`);
      console.log(`🔗 Verified on Blockscout: https://base-sepolia.blockscout.com/address/${address}#code`);
    }
  }
}

console.log("\n📋 Starting verification process...");

// Verify Group logic contract (no constructor arguments)
await verifyContract(
  addresses.groupLogic,
  [],
  "Group Logic Contract"
);

// Verify Registry contract (constructor takes initial factory address)
await verifyContract(
  addresses.registry,
  [addresses.deployerAddress],
  "Registry Contract"
);

// Verify GroupFactory contract (constructor takes logic and registry addresses)
await verifyContract(
  addresses.groupFactory,
  [addresses.groupLogic, addresses.registry],
  "GroupFactory Contract"
);

console.log("\n🎉 Verification process completed!");
console.log("\n📊 Contract Summary:");
console.log("Group Logic:", addresses.groupLogic);
console.log("Registry:", addresses.registry);
console.log("GroupFactory:", addresses.groupFactory);

console.log("\n🔗 All contracts on BaseScan:");
console.log(`https://sepolia.basescan.org/address/${addresses.groupFactory}`);
console.log(`https://sepolia.basescan.org/address/${addresses.registry}`);
console.log(`https://sepolia.basescan.org/address/${addresses.groupLogic}`);

console.log("\n🔗 All contracts on Blockscout (Verified):");
console.log(`https://base-sepolia.blockscout.com/address/${addresses.groupFactory}#code`);
console.log(`https://base-sepolia.blockscout.com/address/${addresses.registry}#code`);
console.log(`https://base-sepolia.blockscout.com/address/${addresses.groupLogic}#code`);

console.log("\n💡 Note:");
console.log("If you want to verify on BaseScan specifically, please:");
console.log("1. Add ETHERSCANAPIKEY=your_api_key to the .env file");
console.log("2. The API key from etherscan.io works for Base Sepolia");
console.log("3. Contracts are already verified on Blockscout which is also widely used");
