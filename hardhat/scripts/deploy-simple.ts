import { network } from "hardhat";
import { formatEther } from "viem";

console.log("🚀 Starting deployment to Base Sepolia...");

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
console.log("\n📋 Contract Addresses:");
console.log("Group Logic:", groupLogic.address);
console.log("Registry:", registry.address);
console.log("GroupFactory:", groupFactory.address);

// Save addresses to a file for later use
const addresses = {
  groupLogic: groupLogic.address,
  registry: registry.address,
  groupFactory: groupFactory.address,
  network: "baseSepolia",
  chainId: 84532
};

console.log("\n💾 Contract addresses saved for testing:");
console.log(JSON.stringify(addresses, null, 2));

console.log("\n🎉 Ready for testing! You can now:");
console.log("1. Create groups using GroupFactory");
console.log("2. Add bills to groups");
console.log("3. Test settlement flows");
