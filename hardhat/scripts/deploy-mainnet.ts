import { network } from "hardhat";
import { formatEther } from "viem";
import * as fs from "fs";
import * as path from "path";

// Base Mainnet USDC Address - Official USDC contract on Base
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RPC_URL = "https://base-mainnet.infura.io/v3/c3ad49663db7498a9eedb4d3c274f463";

async function main() {
  console.log("🚀 Starting deployment to Base Mainnet...");

  const { viem } = await network.connect({
    network: "base",
    chainType: "op",
    override: {
      url: RPC_URL,
    },
  });

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log("Deploying with account:", walletClient.account.address);

  const balance = await publicClient.getBalance({
    address: walletClient.account.address
  });
  console.log("Account balance:", formatEther(balance), "ETH");

  // Check if account has sufficient balance for deployment
  const minBalance = 1000000000000000n; // 0.001 ETH in wei
  if (balance < minBalance) {
    console.warn("⚠️  Warning: Account balance is low. Make sure you have enough ETH for deployment.");
  }

  // Step 1: Deploy the Group logic contract (template)
  console.log("\n📋 Deploying Group logic contract...");
  const groupLogic = await viem.deployContract("Group");
  console.log("Group logic deployed to:", groupLogic.address);

  // Wait for transaction to be mined and nonce to update
  console.log("⏳ Waiting 8 seconds for transaction to be processed...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Step 2: Deploy the Registry contract with deployer as temporary factory address
  console.log("\n📚 Deploying Registry contract...");
  const registry = await viem.deployContract("Registry", [
    walletClient.account.address // Temporary factory address (will be updated later)
  ]);
  console.log("Registry deployed to:", registry.address);

  // Wait for transaction to be mined and nonce to update
  console.log("⏳ Waiting 8 seconds for transaction to be processed...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Step 3: Deploy the GroupFactory with the logic contract, registry, and REAL USDC addresses
  console.log("\n🏭 Deploying GroupFactory contract...");
  const groupFactory = await viem.deployContract("GroupFactory", [
    groupLogic.address,
    registry.address,
    BASE_MAINNET_USDC // Use real USDC address for Base mainnet
  ]);
  console.log("GroupFactory deployed to:", groupFactory.address);

  // Wait for transaction to be mined and nonce to update
  console.log("⏳ Waiting 5 seconds for transaction to be processed...");
  await new Promise(resolve => setTimeout(resolve, 5000));

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
  console.log("USDC (Real):", BASE_MAINNET_USDC);

  // Save addresses to deployments.json for verification script
  console.log("\n💾 Updating deployments.json...");
  const addresses = {
    network: "base",
    chainId: 8453,
    groupLogic: groupLogic.address,
    registry: registry.address,
    groupFactory: groupFactory.address,
    usdc: BASE_MAINNET_USDC,
    deployer: walletClient.account.address,
    deployedAt: new Date().toISOString(),
    verified: {
      blockscout: false,
      basescan: false
    },
    features: [
      "Group Names",
      "Address Book Suggestions",
      "Enhanced Bill Splitting",
      "Gamble Feature",
      "Settlement Tracking",
      "Real USDC on Base Mainnet"
    ]
  };

  // Write to deployments.json
  async function updateDeploymentsFile() {
    const deploymentsPath = path.join(process.cwd(), 'deployments.json');
    fs.writeFileSync(deploymentsPath, JSON.stringify(addresses, null, 2));
    console.log("✅ deployments.json updated successfully!");
    console.log(JSON.stringify(addresses, null, 2));
  }

  // Update deployments file
  await updateDeploymentsFile();

  console.log("\n🎉 Ready for production! You can now:");
  console.log("1. Create groups using GroupFactory");
  console.log("2. Add bills to groups");
  console.log("3. Process settlements with real USDC");
  console.log("\n⚠️  IMPORTANT: Make sure to fund groups with real USDC for settlements to work!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
