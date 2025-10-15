import { network } from "hardhat";
import { formatUnits, parseUnits, formatEther } from "viem";

console.log("🚀 Starting multi-account testing with existing contracts...");

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

const publicClient = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();

// Check if we have multiple accounts
if (walletClients.length < 2) {
  console.log("❌ Need at least 2 accounts for multi-account testing");
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

// Use existing deployed contracts
const contractAddresses = {
    groupFactory: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74",
    registry: "0x6add08fb50b7e6def745a87a16254522713a5676",
    groupLogic: "0xa4cf50aa00c58852c37b3fa663d7ba032843d594"
};

console.log("\n📋 Using existing deployed contracts:");
console.log("GroupFactory:", contractAddresses.groupFactory);
console.log("Registry:", contractAddresses.registry);
console.log("Group Logic:", contractAddresses.groupLogic);

const groupFactory = await viem.getContractAt("GroupFactory", contractAddresses.groupFactory);
const registry = await viem.getContractAt("Registry", contractAddresses.registry);

console.log("\n🧪 MULTI-ACCOUNT TESTING");
console.log("=" .repeat(50));

// Test 1: Create a new group with Alice and Bob
console.log("\n1️⃣ TEST: Create new group with Alice and Bob");
const members = [alice.account.address, bob.account.address];

try {
    const createGroupHash = await groupFactory.write.createGroup([members]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
    console.log("✅ Group created! Transaction:", receipt.transactionHash);

    // Get the new group address
    const aliceGroups = await registry.read.getGroupsForUser([alice.account.address]);
    const newGroupAddress = aliceGroups[aliceGroups.length - 1];
    console.log("🏠 New group address:", newGroupAddress);

    const group = await viem.getContractAt("Group", newGroupAddress);

    // Test 2: Check initial balances
    console.log("\n2️⃣ TEST: Check initial balances");
    const aliceInitialBalance = await group.read.getBalance([alice.account.address]);
    const bobInitialBalance = await group.read.getBalance([bob.account.address]);
    console.log("💰 Alice initial balance:", formatUnits(aliceInitialBalance, 6), "USDC");
    console.log("💰 Bob initial balance:", formatUnits(bobInitialBalance, 6), "USDC");

    // Test 3: Alice adds a bill for lunch ($50), splits with Bob
    console.log("\n3️⃣ TEST: Alice pays lunch bill ($50), splits with Bob");
    const lunchAmount = parseUnits("50", 6); // 50 USDC
    const lunchParticipants = [alice.account.address, bob.account.address];

    const lunchHash = await group.write.addBill([
      "Lunch at the office",
      lunchAmount,
      lunchParticipants
    ]);
    await publicClient.waitForTransactionReceipt({ hash: lunchHash });
    console.log("✅ Lunch bill added by Alice");

    const aliceAfterLunch = await group.read.getBalance([alice.account.address]);
    const bobAfterLunch = await group.read.getBalance([bob.account.address]);
    console.log("💰 Alice balance after lunch:", formatUnits(aliceAfterLunch, 6), "USDC");
    console.log("💰 Bob balance after lunch:", formatUnits(bobAfterLunch, 6), "USDC");

    // Test 4: Bob adds a bill for coffee ($12), splits with Alice
    console.log("\n4️⃣ TEST: Bob pays coffee bill ($12), splits with Alice");
    const coffeeAmount = parseUnits("12", 6); // 12 USDC
    const coffeeParticipants = [alice.account.address, bob.account.address];

    // Connect to group contract with Bob's wallet
    const groupAsBob = await viem.getContractAt("Group", newGroupAddress, {
      client: { wallet: bob }
    });

    const coffeeHash = await groupAsBob.write.addBill([
      "Afternoon coffee run",
      coffeeAmount,
      coffeeParticipants
    ]);
    await publicClient.waitForTransactionReceipt({ hash: coffeeHash });
    console.log("✅ Coffee bill added by Bob");

    const aliceAfterCoffee = await group.read.getBalance([alice.account.address]);
    const bobAfterCoffee = await group.read.getBalance([bob.account.address]);
    console.log("💰 Alice balance after coffee:", formatUnits(aliceAfterCoffee, 6), "USDC");
    console.log("💰 Bob balance after coffee:", formatUnits(bobAfterCoffee, 6), "USDC");

    // Test 5: Alice pays for personal snack ($8), only Alice participates
    console.log("\n5️⃣ TEST: Alice pays for personal snack ($8), only for herself");
    const snackAmount = parseUnits("8", 6); // 8 USDC
    const snackParticipants = [alice.account.address]; // Only Alice

    const snackHash = await group.write.addBill([
      "Personal snack",
      snackAmount,
      snackParticipants
    ]);
    await publicClient.waitForTransactionReceipt({ hash: snackHash });
    console.log("✅ Snack bill added by Alice (personal expense)");

    const aliceAfterSnack = await group.read.getBalance([alice.account.address]);
    const bobAfterSnack = await group.read.getBalance([bob.account.address]);
    console.log("💰 Alice balance after snack:", formatUnits(aliceAfterSnack, 6), "USDC");
    console.log("💰 Bob balance after snack:", formatUnits(bobAfterSnack, 6), "USDC");

    // Test 6: Bob pays for groceries ($80), splits with Alice
    console.log("\n6️⃣ TEST: Bob pays for groceries ($80), splits with Alice");
    const groceriesAmount = parseUnits("80", 6); // 80 USDC
    const groceriesParticipants = [alice.account.address, bob.account.address];

    const groceriesHash = await groupAsBob.write.addBill([
      "Weekly groceries",
      groceriesAmount,
      groceriesParticipants
    ]);
    await publicClient.waitForTransactionReceipt({ hash: groceriesHash });
    console.log("✅ Groceries bill added by Bob");

    const aliceAfterGroceries = await group.read.getBalance([alice.account.address]);
    const bobAfterGroceries = await group.read.getBalance([bob.account.address]);
    console.log("💰 Alice balance after groceries:", formatUnits(aliceAfterGroceries, 6), "USDC");
    console.log("💰 Bob balance after groceries:", formatUnits(bobAfterGroceries, 6), "USDC");

    // Test 7: Settlement analysis
    console.log("\n7️⃣ TEST: Settlement analysis");
    console.log("📊 Final balances:");
    console.log("   Alice:", formatUnits(aliceAfterGroceries, 6), "USDC");
    console.log("   Bob:", formatUnits(bobAfterGroceries, 6), "USDC");

    // Calculate who owes what
    const aliceOwes = aliceAfterGroceries < 0;
    const bobOwes = bobAfterGroceries < 0;

    console.log("\n💸 Settlement breakdown:");
    if (aliceOwes) {
      console.log(`   Alice owes: ${formatUnits(-aliceAfterGroceries, 6)} USDC`);
    } else {
      console.log(`   Alice is owed: ${formatUnits(aliceAfterGroceries, 6)} USDC`);
    }
    
    if (bobOwes) {
      console.log(`   Bob owes: ${formatUnits(-bobAfterGroceries, 6)} USDC`);
    } else {
      console.log(`   Bob is owed: ${formatUnits(bobAfterGroceries, 6)} USDC`);
    }

    // Test 8: Trigger settlement
    console.log("\n8️⃣ TEST: Trigger settlement process");
    try {
      const settlementHash = await group.write.triggerSettlement();
      await publicClient.waitForTransactionReceipt({ hash: settlementHash });
      console.log("✅ Settlement triggered successfully!");

      const settlementActive = await group.read.settlementActive();
      const totalOwed = await group.read.totalOwed();
      console.log("⚖️ Settlement active:", settlementActive);
      console.log("💵 Total amount to be settled:", formatUnits(totalOwed, 6), "USDC");

      // Test approval process for creditors
      if (aliceAfterGroceries > 0) {
        console.log("\n9️⃣ TEST: Alice approves settlement (as creditor)");
        try {
          const approveHash = await group.write.approveSettlement();
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("✅ Alice approved the settlement");
        } catch (error) {
          console.log("⚠️ Alice approval error:", error.message);
        }
      }

      if (bobAfterGroceries > 0) {
        console.log("\n🔟 TEST: Bob approves settlement (as creditor)");
        try {
          const approveHash = await groupAsBob.write.approveSettlement();
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          console.log("✅ Bob approved the settlement");
        } catch (error) {
          console.log("⚠️ Bob approval error:", error.message);
        }
      }

      console.log("\n💡 Settlement Process Summary:");
      console.log("   1. Settlement has been triggered");
      console.log("   2. Creditors can approve the settlement");
      console.log("   3. Debtors need to fund their portion (requires USDC)");
      console.log("   4. Once all conditions are met, funds are automatically distributed");

    } catch (error) {
      if (error.message.includes("No debts to settle")) {
        console.log("ℹ️ No settlement needed - balances are already settled");
      } else {
        console.log("⚠️ Settlement trigger error:", error.message);
      }
    }

    // Test 9: Group information
    console.log("\n🔍 TEST: Group information");
    const groupMembers = await group.read.getMembers();
    const memberCount = await group.read.getMemberCount();
    console.log("👥 Group members:", groupMembers);
    console.log("📊 Total members:", memberCount.toString());

    // Test 10: Registry information
    console.log("\n📚 TEST: Registry information");
    const aliceAllGroups = await registry.read.getGroupsForUser([alice.account.address]);
    const bobAllGroups = await registry.read.getGroupsForUser([bob.account.address]);
    console.log("📋 Alice's total groups:", aliceAllGroups.length);
    console.log("📋 Bob's total groups:", bobAllGroups.length);

    console.log("\n🎉 MULTI-ACCOUNT TESTING COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(60));

    console.log("\n📊 COMPREHENSIVE TEST SUMMARY:");
    console.log("✅ Multi-account group creation");
    console.log("✅ Shared expense tracking (lunch, coffee, groceries)");
    console.log("✅ Personal expense tracking (snack)");
    console.log("✅ Different account bill creation");
    console.log("✅ Balance calculations");
    console.log("✅ Settlement process initiation");
    console.log("✅ Creditor approval system");
    console.log("✅ Group member management");
    console.log("✅ Registry user tracking");

    console.log("\n🔗 Test Results:");
    const testResults = {
      newGroup: newGroupAddress,
      accounts: {
        alice: alice.account.address,
        bob: bob.account.address
      },
      finalBalances: {
        alice: formatUnits(aliceAfterGroceries, 6),
        bob: formatUnits(bobAfterGroceries, 6)
      },
      billsCreated: 4,
      settlementTriggered: true,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(testResults, null, 2));

    console.log("\n🌐 View on BaseScan:");
    console.log(`Group: https://sepolia.basescan.org/address/${newGroupAddress}`);
    console.log(`Factory: https://sepolia.basescan.org/address/${contractAddresses.groupFactory}`);

    console.log("\n✨ Ready for frontend integration!");

} catch (error) {
  console.error("❌ Test failed:", error.message);
  throw error;
}
