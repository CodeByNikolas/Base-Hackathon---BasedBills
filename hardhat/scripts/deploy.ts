import hre from "hardhat";
import { formatEther } from "viem";

async function main() {
  console.log("🚀 Starting deployment to Base Sepolia...");
  
  // Get the deployer account
  const publicClient = await hre.viem.getPublicClient();
  const [walletClient] = await hre.viem.getWalletClients();
  
  console.log("Deploying with account:", walletClient.account.address);
  
  const balance = await publicClient.getBalance({ 
    address: walletClient.account.address 
  });
  console.log("Account balance:", formatEther(balance));
  
  // Step 1: Deploy the Group logic contract (template)
  console.log("\n📋 Deploying Group logic contract...");
  const groupLogic = await hre.viem.deployContract("Group");
  console.log("Group logic deployed to:", groupLogic.address);
  
  // Step 2: Deploy the Registry contract with placeholder factory address
  console.log("\n📚 Deploying Registry contract...");
  const registry = await hre.viem.deployContract("Registry", [
    "0x0000000000000000000000000000000000000000" // Placeholder factory address
  ]);
  console.log("Registry deployed to:", registry.address);
  
  // Step 3: Deploy the GroupFactory with the logic contract and registry addresses
  console.log("\n🏭 Deploying GroupFactory contract...");
  const groupFactory = await hre.viem.deployContract("GroupFactory", [
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
  
  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
