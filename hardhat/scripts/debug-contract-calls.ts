import { network } from "hardhat";
import { readFileSync } from 'fs';

async function main() {
  console.log("🔍 Debugging contract calls for frontend...");

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

  const groupAddress = "0x5625d9b02C9fEFdD544Da6b9B758adEAF638D6e7";
  const registryAddress = deployments.registry;

  console.log("🏠 Group address:", groupAddress);
  console.log("📋 Registry address:", registryAddress);

  // Load ABIs from JSON files (same as frontend)
  const GROUP_ABI = JSON.parse(readFileSync('./artifacts/contracts/Group.sol/Group.json', 'utf8'));
  const REGISTRY_ABI = JSON.parse(readFileSync('./artifacts/contracts/Registry.sol/Registry.json', 'utf8'));

  try {
    // Test 1: Check if group exists by getting its name
    console.log("\n1️⃣ Testing group name call...");
    const groupContract = await viem.getContractAt("Group", groupAddress);
    const groupName = await groupContract.read.getGroupName();
    console.log("✅ Group name:", groupName);

    // Test 2: Check if user is a member
    console.log("\n2️⃣ Testing membership check...");
    const isMember = await groupContract.read.isMember([user.account.address]);
    console.log("✅ Is user a member?", isMember);

    if (!isMember) {
      console.log("❌ User is not a member of this group!");
      console.log("👥 Group members:", await groupContract.read.getMembers());
      return;
    }

    // Test 3: Get members (this is what the frontend does)
    console.log("\n3️⃣ Testing getMembers call...");
    const members = await groupContract.read.getMembers();
    console.log("✅ Members:", members);

    // Test 4: Get balances (this is what the frontend does)
    console.log("\n4️⃣ Testing getAllBalances call...");
    const balances = await groupContract.read.getAllBalances();
    console.log("✅ Balances:", balances);

    // Test 5: Get all bills (this is what the frontend does)
    console.log("\n5️⃣ Testing getAllBills call...");
    const bills = await groupContract.read.getAllBills();
    console.log("✅ Bills count:", bills.length);

    // Test 6: Get unsettled bills (this is what the frontend does)
    console.log("\n6️⃣ Testing getUnsettledBills call...");
    const unsettledBills = await groupContract.read.getUnsettledBills();
    console.log("✅ Unsettled bills count:", unsettledBills.length);

    // Test 7: Check settlement status
    console.log("\n7️⃣ Testing settlement status...");
    const settlementActive = await groupContract.read.settlementActive();
    console.log("✅ Settlement active?", settlementActive);

    // Test 8: Check gamble status for user
    console.log("\n8️⃣ Testing gamble status for user...");
    const gambleStatus = await groupContract.read.getGambleStatusForUser([user.account.address]);
    console.log("✅ Gamble status:", gambleStatus);

    // Test 9: Get USDC address
    console.log("\n9️⃣ Testing USDC address...");
    const usdcAddress = await groupContract.read.usdcAddress();
    console.log("✅ USDC address:", usdcAddress);

    // Test 10: Check if user has approved settlement
    console.log("\n🔟 Testing hasApproved call...");
    const hasApproved = await groupContract.read.hasApproved([user.account.address]);
    console.log("✅ Has approved?", hasApproved);

    // Test 11: Check if user has funded settlement
    console.log("\n1️⃣1️⃣ Testing hasFunded call...");
    const hasFunded = await groupContract.read.hasFunded([user.account.address]);
    console.log("✅ Has funded?", hasFunded);

    console.log("\n🎉 All contract calls successful!");

    // Simulate the exact contract calls the frontend makes
    console.log("\n📋 Simulating frontend contract calls...");
    const contracts = [
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getGroupName',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getMembers',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getAllBalances',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getAllBills',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getUnsettledBills',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'settlementActive',
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'getGambleStatusForUser',
        args: [user.account.address],
      },
      {
        address: groupAddress,
        abi: GROUP_ABI,
        functionName: 'usdcAddress',
      },
    ];

    console.log("🔄 Testing batch contract reads...");
    const results = await publicClient.multicall({
      contracts: contracts.map(contract => ({
        ...contract,
        // For wagmi compatibility, we need to handle the args properly
      }))
    });

    console.log("✅ Batch calls successful!");

    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      const result = results[i];
      console.log(`  ${i + 1}. ${contract.functionName}: ${result.status === 'success' ? '✅' : '❌'} ${result.status}`);
      if (result.status === 'failure') {
        console.log(`     Error:`, result.error);
      }
    }

  } catch (error) {
    console.error("❌ Error during contract calls:", error);
    console.error("Error details:", error);
  }
}

main().catch(console.error);
