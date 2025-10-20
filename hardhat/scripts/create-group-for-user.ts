import { network } from "hardhat";
import { readFileSync } from 'fs';

async function main() {
  console.log("🆕 Creating a group for the connected wallet user...");

  const { viem } = await network.connect({
    network: "baseSepolia",
    chainType: "op",
  });

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  if (walletClients.length === 0) {
    console.error("❌ No wallet connected!");
    return;
  }

  const user = walletClients[0];
  console.log("👤 User address:", user.account.address);

  // Load deployment data
  const deployments = JSON.parse(readFileSync('../hardhat/deployments.json', 'utf8'));

  const groupFactoryAddress = deployments.groupFactory;
  const registryAddress = deployments.registry;

  console.log("📋 Using deployed contracts:");
  console.log("GroupFactory:", groupFactoryAddress);
  console.log("Registry:", registryAddress);

  const groupFactory = await viem.getContractAt("GroupFactory", groupFactoryAddress);

  try {
    // Create a group with the user's address and a dummy second member
    const dummyMember = "0x742d35Cc6634C0532925a3b8D0C3E5E3C8B1c2D3";
    const members = [user.account.address, dummyMember];
    const groupName = `User Group - ${user.account.address.slice(0, 6)}...${user.account.address.slice(-4)}`;

    console.log("🏠 Creating group with members:", members);
    console.log("📝 Group name:", groupName);

    const createGroupHash = await groupFactory.write.createGroup([members, groupName]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createGroupHash });

    console.log("✅ Group created!");
    console.log("🔗 Transaction hash:", createGroupHash);

    // Get the group address from the transaction receipt (for ERC-1967 proxy deployments)
    const groupAddress = receipt.contractAddress;

    if (groupAddress) {
      console.log("✅ Group successfully created at:", groupAddress);

      // Register the group in the registry
      const registry = await viem.getContractAt("Registry", registryAddress);
      const registerHash = await registry.write.registerGroup([members, groupAddress]);
      await publicClient.waitForTransactionReceipt({ hash: registerHash });

      console.log("✅ Group registered in registry!");

      console.log("\n🎉 Group created and registered!");
      console.log("🔗 You can now access your group at:");
      console.log(`http://localhost:3000/group/${groupAddress}`);

    } else {
      console.log("⚠️ Could not extract group address from receipt");
    }

  } catch (error) {
    console.error("❌ Error creating group:", error);
  }
}

main().catch(console.error);
