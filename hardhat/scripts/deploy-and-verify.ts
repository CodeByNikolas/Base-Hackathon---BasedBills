import { network } from "hardhat";
import { formatEther } from "viem";
import hre from "hardhat";

console.log("🚀 Starting deployment and verification to Base Sepolia...");

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

console.log("Deploying with account:", walletClient.account.address);

const balance = await publicClient.getBalance({ 
  address: walletClient.account.address 
});
console.log("Account balance:", formatEther(balance));

// Check if API key is available
if (!process.env.ETHERSCANAPIKEY) {
  console.log("⚠️ ETHERSCANAPIKEY not found - contracts will be deployed but not verified");
}

// Step 1: Deploy the Group logic contract (template)
console.log("\n📋 Deploying Group logic contract...");
const groupLogic = await viem.deployContract("Group");
console.log("Group logic deployed to:", groupLogic.address);

// Step 2: Deploy the Registry contract with deployer as temporary factory address
console.log("\n📚 Deploying Registry contract...");
const registry = await viem.deployContract("Registry", [
  walletClient.account.address // Temporary factory address (will be updated later)
]);
console.log("Registry deployed to:", registry.address);

// Step 3: Deploy the GroupFactory with the logic contract and registry addresses
console.log("\n🏭 Deploying GroupFactory contract...");
const groupFactory = await viem.deployContract("GroupFactory", [
  groupLogic.address,
  registry.address
]);
console.log("GroupFactory deployed to:", groupFactory.address);

// Step 4: Update the Registry with the actual factory address
console.log("\n🔄 Updating Registry with factory address...");
const hash = await registry.write.updateFactory([groupFactory.address]);
await publicClient.waitForTransactionReceipt({ hash });
console.log("Registry updated with factory address");

console.log("\n✅ Deployment completed successfully!");

// Step 5: Verify contracts on BaseScan using Etherscan V2 API
if (process.env.ETHERSCANAPIKEY) {
  console.log("\n🔍 Starting contract verification...");
  
  try {
    // Wait a bit for the contracts to be indexed
    console.log("⏳ Waiting for contracts to be indexed...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
    
    // Verify Group logic contract
    console.log("\n📋 Verifying Group logic contract...");
    try {
      await hre.run("verify:verify", {
        address: groupLogic.address,
        constructorArguments: [],
        network: "baseSepolia",
      });
      console.log("✅ Group logic contract verified!");
    } catch (error) {
      console.log("⚠️ Group logic verification:", error.message);
    }
    
    // Verify Registry contract
    console.log("\n📚 Verifying Registry contract...");
    try {
      await hre.run("verify:verify", {
        address: registry.address,
        constructorArguments: [walletClient.account.address],
        network: "baseSepolia",
      });
      console.log("✅ Registry contract verified!");
    } catch (error) {
      console.log("⚠️ Registry verification:", error.message);
    }
    
    // Verify GroupFactory contract
    console.log("\n🏭 Verifying GroupFactory contract...");
    try {
      await hre.run("verify:verify", {
        address: groupFactory.address,
        constructorArguments: [groupLogic.address, registry.address],
        network: "baseSepolia",
      });
      console.log("✅ GroupFactory contract verified!");
    } catch (error) {
      console.log("⚠️ GroupFactory verification:", error.message);
    }
    
    console.log("\n🎉 Verification process completed!");
    
  } catch (error) {
    console.log("❌ Verification failed:", error.message);
  }
} else {
  console.log("\n⚠️ Skipping verification - ETHERSCANAPIKEY not provided");
}

console.log("\n📋 Final Contract Addresses:");
console.log("Group Logic:", groupLogic.address);
console.log("Registry:", registry.address);
console.log("GroupFactory:", groupFactory.address);

// Save addresses to a file for later use
const addresses = {
  groupLogic: groupLogic.address,
  registry: registry.address,
  groupFactory: groupFactory.address,
  network: "baseSepolia",
  chainId: 84532,
  deploymentTime: new Date().toISOString(),
  verified: !!process.env.ETHERSCANAPIKEY
};

console.log("\n💾 Contract addresses and verification status:");
console.log(JSON.stringify(addresses, null, 2));

console.log("\n🔗 View on BaseScan:");
console.log(`GroupFactory: https://sepolia.basescan.org/address/${groupFactory.address}`);
console.log(`Registry: https://sepolia.basescan.org/address/${registry.address}`);
console.log(`Group Logic: https://sepolia.basescan.org/address/${groupLogic.address}`);

console.log("\n🎉 Ready for frontend integration!");
console.log("📝 Next steps:");
console.log("1. Add ETHERSCANAPIKEY to .env file for verification");
console.log("2. Integrate contract addresses into frontend");
console.log("3. Test with real USDC transactions");
console.log("4. Deploy to Base mainnet when ready");
