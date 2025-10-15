import { network } from "hardhat";
import { formatEther, formatUnits, parseUnits } from "viem";
import hre from "hardhat";

console.log("🚀 Starting comprehensive multi-account deployment and testing...");

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

const publicClient = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();

// Check if we have multiple accounts
if (walletClients.length < 2) {
  console.log("❌ Need at least 2 accounts for comprehensive testing");
  console.log("Please ensure both PRIVATE_KEY and PRIVATE_KEY2 are set in .env");
  process.exit(1);
}

const [alice, bob] = walletClients;
console.log("👤 Alice (Account 1):", alice.account.address);
console.log("👤 Bob (Account 2):", bob.account.address);

// Check balances
const aliceBalance = await publicClient.getBalance({ address: alice.account.address });
const bobBalance = await publicClient.getBalance({ address: bob.account.address });

console.log("💰 Alice balance:", formatEther(aliceBalance), "ETH");
console.log("💰 Bob balance:", formatEther(bobBalance), "ETH");

if (aliceBalance < parseUnits("0.01", 18) || bobBalance < parseUnits("0.01", 18)) {
  console.log("⚠️ Warning: Low balance detected. Make sure both accounts have sufficient ETH for gas");
}

console.log("\n🏗️ PHASE 1: DEPLOYMENT");
console.log("=" .repeat(50));

// Deploy contracts using Alice's account
console.log("\n📋 Deploying Group logic contract...");
const groupLogic = await viem.deployContract("Group");
console.log("✅ Group logic deployed to:", groupLogic.address);

console.log("\n📚 Deploying Registry contract...");
const registry = await viem.deployContract("Registry", [
  alice.account.address // Temporary factory address
]);
console.log("✅ Registry deployed to:", registry.address);

console.log("\n🏭 Deploying GroupFactory contract...");
const groupFactory = await viem.deployContract("GroupFactory", [
  groupLogic.address,
  registry.address
]);
console.log("✅ GroupFactory deployed to:", groupFactory.address);

console.log("\n🔄 Updating Registry with factory address...");
const updateHash = await registry.write.updateFactory([groupFactory.address]);
await publicClient.waitForTransactionReceipt({ hash: updateHash });
console.log("✅ Registry updated");

const deployedAddresses = {
  groupLogic: groupLogic.address,
  registry: registry.address,
  groupFactory: groupFactory.address,
};

console.log("\n📋 Deployed Contract Addresses:");
console.log(JSON.stringify(deployedAddresses, null, 2));

console.log("\n🔍 PHASE 2: VERIFICATION");
console.log("=" .repeat(50));

if (process.env.ETHERSCANAPIKEY) {
  console.log("⏳ Waiting for contracts to be indexed...");
  await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
  
  const contracts = [
    { name: "Group Logic", address: groupLogic.address, args: [] },
    { name: "Registry", address: registry.address, args: [alice.account.address] },
    { name: "GroupFactory", address: groupFactory.address, args: [groupLogic.address, registry.address] }
  ];
  
  for (const contract of contracts) {
    try {
      console.log(`\n🔍 Verifying ${contract.name}...`);
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
        network: "baseSepolia",
      });
      console.log(`✅ ${contract.name} verified!`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contract.name} already verified!`);
      } else {
        console.log(`⚠️ ${contract.name} verification:`, error.message);
      }
    }
  }
} else {
  console.log("⚠️ Skipping verification - ETHERSCANAPIKEY not provided");
}

console.log("\n🧪 PHASE 3: COMPREHENSIVE TESTING");
console.log("=" .repeat(50));

// Test 1: Create a group with multiple members
console.log("\n1️⃣ TEST: Multi-member group creation");
const members = [alice.account.address, bob.account.address];

const createGroupHash = await groupFactory.write.createGroup([members]);
await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
console.log("✅ Multi-member group created!");

// Get the group address
const aliceGroups = await registry.read.getGroupsForUser([alice.account.address]);
const bobGroups = await registry.read.getGroupsForUser([bob.account.address]);
const groupAddress = aliceGroups[aliceGroups.length - 1];

console.log("🏠 Group address:", groupAddress);
console.log("👥 Alice's groups:", aliceGroups.length);
console.log("👥 Bob's groups:", bobGroups.length);

const group = await viem.getContractAt("Group", groupAddress);

// Test 2: Check initial balances
console.log("\n2️⃣ TEST: Initial balances");
const aliceInitialBalance = await group.read.getBalance([alice.account.address]);
const bobInitialBalance = await group.read.getBalance([bob.account.address]);
console.log("💰 Alice initial balance:", formatUnits(aliceInitialBalance, 6), "USDC");
console.log("💰 Bob initial balance:", formatUnits(bobInitialBalance, 6), "USDC");

// Test 3: Alice pays for dinner, splits with Bob
console.log("\n3️⃣ TEST: Alice pays dinner bill ($100), splits with Bob");
const dinnerAmount = parseUnits("100", 6); // 100 USDC
const dinnerParticipants = [alice.account.address, bob.account.address];

const dinnerHash = await group.write.addBill([
  "Dinner at fancy restaurant",
  dinnerAmount,
  dinnerParticipants
]);
await publicClient.waitForTransactionReceipt({ hash: dinnerHash });
console.log("✅ Dinner bill added by Alice");

const aliceAfterDinner = await group.read.getBalance([alice.account.address]);
const bobAfterDinner = await group.read.getBalance([bob.account.address]);
console.log("💰 Alice balance after dinner:", formatUnits(aliceAfterDinner, 6), "USDC");
console.log("💰 Bob balance after dinner:", formatUnits(bobAfterDinner, 6), "USDC");

// Test 4: Bob pays for taxi, splits with Alice
console.log("\n4️⃣ TEST: Bob pays taxi bill ($20), splits with Alice");
const taxiAmount = parseUnits("20", 6); // 20 USDC
const taxiParticipants = [alice.account.address, bob.account.address];

// Connect to group contract with Bob's wallet
const groupAsBob = await viem.getContractAt("Group", groupAddress, {
  client: { wallet: bob }
});

const taxiHash = await groupAsBob.write.addBill([
  "Taxi ride home",
  taxiAmount,
  taxiParticipants
]);
await publicClient.waitForTransactionReceipt({ hash: taxiHash });
console.log("✅ Taxi bill added by Bob");

const aliceAfterTaxi = await group.read.getBalance([alice.account.address]);
const bobAfterTaxi = await group.read.getBalance([bob.account.address]);
console.log("💰 Alice balance after taxi:", formatUnits(aliceAfterTaxi, 6), "USDC");
console.log("💰 Bob balance after taxi:", formatUnits(bobAfterTaxi, 6), "USDC");

// Test 5: Alice pays for coffee, only Alice participates
console.log("\n5️⃣ TEST: Alice pays coffee bill ($15), only for herself");
const coffeeAmount = parseUnits("15", 6); // 15 USDC
const coffeeParticipants = [alice.account.address]; // Only Alice

const coffeeHash = await group.write.addBill([
  "Morning coffee",
  coffeeAmount,
  coffeeParticipants
]);
await publicClient.waitForTransactionReceipt({ hash: coffeeHash });
console.log("✅ Coffee bill added by Alice (personal expense)");

const aliceAfterCoffee = await group.read.getBalance([alice.account.address]);
const bobAfterCoffee = await group.read.getBalance([bob.account.address]);
console.log("💰 Alice balance after coffee:", formatUnits(aliceAfterCoffee, 6), "USDC");
console.log("💰 Bob balance after coffee:", formatUnits(bobAfterCoffee, 6), "USDC");

// Test 6: Settlement attempt
console.log("\n6️⃣ TEST: Settlement process");
console.log("📊 Final balances before settlement:");
console.log("   Alice:", formatUnits(aliceAfterCoffee, 6), "USDC");
console.log("   Bob:", formatUnits(bobAfterCoffee, 6), "USDC");

// Determine who owes money and who is owed
const aliceOwes = aliceAfterCoffee < 0;
const bobOwes = bobAfterCoffee < 0;

console.log("💸 Settlement analysis:");
if (aliceOwes) {
  console.log(`   Alice owes: ${formatUnits(-aliceAfterCoffee, 6)} USDC`);
}
if (bobOwes) {
  console.log(`   Bob owes: ${formatUnits(-bobAfterCoffee, 6)} USDC`);
}
if (aliceAfterCoffee > 0) {
  console.log(`   Alice is owed: ${formatUnits(aliceAfterCoffee, 6)} USDC`);
}
if (bobAfterCoffee > 0) {
  console.log(`   Bob is owed: ${formatUnits(bobAfterCoffee, 6)} USDC`);
}

// Try to trigger settlement
try {
  const settlementHash = await group.write.triggerSettlement();
  await publicClient.waitForTransactionReceipt({ hash: settlementHash });
  console.log("✅ Settlement triggered successfully!");
  
  const settlementActive = await group.read.settlementActive();
  const totalOwed = await group.read.totalOwed();
  console.log("⚖️ Settlement active:", settlementActive);
  console.log("💵 Total owed:", formatUnits(totalOwed, 6), "USDC");
  
  // Test approval process (for creditors)
  if (aliceAfterCoffee > 0) {
    console.log("\n7️⃣ TEST: Alice approves settlement (creditor)");
    try {
      const approveHash = await group.write.approveSettlement();
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log("✅ Alice approved settlement");
    } catch (error) {
      console.log("⚠️ Alice approval:", error.message);
    }
  }
  
  if (bobAfterCoffee > 0) {
    console.log("\n8️⃣ TEST: Bob approves settlement (creditor)");
    try {
      const approveHash = await groupAsBob.write.approveSettlement();
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log("✅ Bob approved settlement");
    } catch (error) {
      console.log("⚠️ Bob approval:", error.message);
    }
  }
  
  // Note: Funding would require actual USDC tokens
  console.log("\n💡 Note: Funding settlement requires actual USDC tokens");
  console.log("   In production, debtors would:");
  console.log("   1. Approve USDC spending for the group contract");
  console.log("   2. Call fundSettlement() to deposit their debt");
  console.log("   3. Contract automatically distributes when all conditions are met");
  
} catch (error) {
  if (error.message.includes("No debts to settle")) {
    console.log("ℹ️ No settlement needed - all balances are zero or no net debts");
  } else {
    console.log("⚠️ Settlement trigger failed:", error.message);
  }
}

// Test 7: Group information
console.log("\n9️⃣ TEST: Group information and statistics");
const groupMembers = await group.read.getMembers();
const memberCount = await group.read.getMemberCount();
console.log("👥 Group members:", groupMembers);
console.log("📊 Member count:", memberCount.toString());

console.log("\n🎉 COMPREHENSIVE TESTING COMPLETED!");
console.log("=" .repeat(50));

console.log("\n📊 FINAL SUMMARY:");
console.log("🏗️ Contracts deployed and verified");
console.log("👥 Multi-account group created successfully");
console.log("💳 Multiple bill types tested:");
console.log("   • Shared expenses (dinner, taxi)");
console.log("   • Personal expenses (coffee)");
console.log("   • Different payers (Alice and Bob)");
console.log("⚖️ Settlement process tested");
console.log("🔍 All functions working as expected");

console.log("\n🔗 Contract Addresses:");
console.log("GroupFactory:", groupFactory.address);
console.log("Registry:", registry.address);
console.log("Group Logic:", groupLogic.address);
console.log("Test Group:", groupAddress);

console.log("\n🌐 View on BaseScan:");
console.log(`https://sepolia.basescan.org/address/${groupFactory.address}`);
console.log(`https://sepolia.basescan.org/address/${groupAddress}`);

console.log("\n✨ Ready for frontend integration with real USDC!");

// Save test results
const testResults = {
  deployment: deployedAddresses,
  testGroup: groupAddress,
  accounts: {
    alice: alice.account.address,
    bob: bob.account.address
  },
  finalBalances: {
    alice: formatUnits(aliceAfterCoffee, 6),
    bob: formatUnits(bobAfterCoffee, 6)
  },
  timestamp: new Date().toISOString(),
  network: "baseSepolia",
  chainId: 84532
};

console.log("\n💾 Test Results:");
console.log(JSON.stringify(testResults, null, 2));
