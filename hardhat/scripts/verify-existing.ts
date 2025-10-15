import { network } from "hardhat";

console.log("🔍 Verifying existing contracts on Base Sepolia...");

// Contract addresses from previous deployment
const addresses = {
  groupLogic: "0xa4cf50aa00c58852c37b3fa663d7ba032843d594",
  registry: "0x6add08fb50b7e6def745a87a16254522713a5676",
  groupFactory: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74",
  deployerAddress: "0x21750fc30922badd61c2f1e48b94683071dfbcaa" // Used as initial factory address for Registry
};

if (!process.env.ETHERSCANAPIKEY) {
  console.log("❌ ETHERSCANAPIKEY not found in environment variables");
  console.log("Please add ETHERSCANAPIKEY to your .env file");
  process.exit(1);
}

console.log("Using Etherscan V2 API for verification...");

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
      network: "baseSepolia",
    });
    
    console.log(`✅ ${contractName} verified successfully!`);
    console.log(`🔗 View on BaseScan: https://sepolia.basescan.org/address/${address}`);
    
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log(`✅ ${contractName} already verified!`);
    } else {
      console.log(`❌ ${contractName} verification failed:`, error.message);
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
console.log("\n📊 Summary:");
console.log("Group Logic:", addresses.groupLogic);
console.log("Registry:", addresses.registry);
console.log("GroupFactory:", addresses.groupFactory);

console.log("\n🔗 All contracts on BaseScan:");
console.log(`https://sepolia.basescan.org/address/${addresses.groupFactory}`);
console.log(`https://sepolia.basescan.org/address/${addresses.registry}`);
console.log(`https://sepolia.basescan.org/address/${addresses.groupLogic}`);
