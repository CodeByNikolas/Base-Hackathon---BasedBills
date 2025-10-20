import { network } from "hardhat";
import { readFileSync } from 'fs';

async function main() {
  console.log("🔍 Checking existing groups in Registry...");

  const { viem } = await network.connect({
    network: "baseSepolia",
    chainType: "op",
  });

  const publicClient = await viem.getPublicClient();

  // Load deployment data
  const deployments = JSON.parse(readFileSync('../hardhat/deployments.json', 'utf8'));

  const registryAddress = deployments.registry;
  console.log("📋 Registry address:", registryAddress);

  // Get the registry contract
  const registry = await viem.getContractAt("Registry", registryAddress);

  // Check if there are any groups at all
  try {
    // Check a specific user (Alice from the test)
    const aliceAddress = "0x21750fc30922badd61c2f1e48b94683071dfbcaa";
    const aliceGroups = await registry.read.getGroupsForUser([aliceAddress]);
    console.log("👤 Alice's groups:", aliceGroups);

    if (aliceGroups.length === 0) {
      console.log("❌ No groups found for Alice");
      return;
    }

    // Get all group addresses for Alice
    const groupAddresses = aliceGroups;
    console.log("🏠 Group addresses for Alice:", groupAddresses);

    // Check the group we created in the test
    const testGroup = "0x5625d9b02C9fEFdD544Da6b9B758adEAF638D6e7";
    if (groupAddresses.includes(testGroup)) {
      console.log("✅ Test group exists in registry");

      // Check if Alice is a member of the test group
      const groupContract = await viem.getContractAt("Group", testGroup);
      const members = await groupContract.read.getMembers();
      console.log("👥 Members of test group:", members);

      const isAliceMember = members.includes(aliceAddress);
      console.log("👤 Is Alice a member?", isAliceMember);
    }

  } catch (error) {
    console.error("❌ Error checking groups:", error);
  }
}

main().catch(console.error);
