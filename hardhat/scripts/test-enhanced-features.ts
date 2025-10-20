import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";
import { readFileSync } from 'fs';

console.log("🧪 Testing Enhanced BasedBills Features...");

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

const publicClient = await viem.getPublicClient();
const walletClients = await viem.getWalletClients();
const alice = walletClients[0];

console.log("👤 Alice:", alice.account.address);

if (walletClients.length < 2) {
  console.log("⚠️ Only one wallet available, using Alice for all operations");
}

// Load deployment data
const deployments = JSON.parse(readFileSync('../hardhat/deployments.json', 'utf8'));

// Use newly deployed enhanced contracts
const contractAddresses = {
  groupFactory: deployments.groupFactory,
  registry: deployments.registry,
  groupLogic: deployments.groupLogic
};

console.log("\n📋 Using deployed contracts:");
console.log("GroupFactory:", contractAddresses.groupFactory);

const groupFactory = await viem.getContractAt("GroupFactory", contractAddresses.groupFactory);
const registry = await viem.getContractAt("Registry", contractAddresses.registry);

console.log("\n🆕 TESTING ENHANCED FEATURES");
console.log("=" .repeat(50));

try {
  // Create a new group for testing (using Alice twice if no second wallet)
  console.log("\n1️⃣ Creating new group with Alice...");
  const bobAddress = walletClients.length > 1 ? walletClients[1].account.address : "0x742d35Cc6634C0532925a3b8D0C3E5E3C8B1c2D3"; // Dummy address for demo
  const members = [alice.account.address, bobAddress];
  
  const createGroupHash = await groupFactory.write.createGroup([members, "Test Group"]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
  console.log("✅ Group created!");
  
  // Wait for nonce to update
  console.log("⏳ Waiting 5 seconds for nonce to update...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get the new group address
  const aliceGroups = await registry.read.getGroupsForUser([alice.account.address]);
  const newGroupAddress = aliceGroups[aliceGroups.length - 1];
  console.log("🏠 New group address:", newGroupAddress);

  const group = await viem.getContractAt("Group", newGroupAddress);

  // Test 2: Add regular bill (equal split)
  console.log("\n2️⃣ Adding regular bill - Lunch $60 (equal split)...");
  const lunchAmount = parseUnits("60", 6); // 60 USDC
  const lunchParticipants = [alice.account.address, bobAddress];

  const lunchHash = await group.write.addBill([
    "Team Lunch",
    lunchAmount,
    lunchParticipants
  ], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: lunchHash });
  console.log("✅ Regular bill added");
  
  // Wait for nonce to update
  console.log("⏳ Waiting 3 seconds...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 3: Add custom bill (unequal split)
  console.log("\n3️⃣ Adding custom bill - Groceries $100 (Alice: $70, Bob: $30)...");
  const groceryParticipants = [alice.account.address, bobAddress];
  const groceryAmounts = [parseUnits("70", 6), parseUnits("30", 6)]; // Alice owes $70, Bob owes $30

  const groceryHash = await group.write.addCustomBill([
    "Weekly Groceries",
    groceryParticipants,
    groceryAmounts
  ], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: groceryHash });
  console.log("✅ Custom bill added");
  
  // Wait for nonce to update
  console.log("⏳ Waiting 3 seconds...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test 4: Get all balances
  console.log("\n4️⃣ Getting all member balances...");
  const [memberAddresses, memberBalances] = await group.read.getAllBalances();
  
  console.log("💰 All Balances:");
  for (let i = 0; i < memberAddresses.length; i++) {
    const name = memberAddresses[i] === alice.account.address ? "Alice" : "Bob";
    console.log(`   ${name}: ${formatUnits(memberBalances[i] < 0 ? -memberBalances[i] : memberBalances[i], 6)} USDC ${memberBalances[i] < 0 ? "(owes)" : "(owed)"}`);
  }

  // Test 5: Get settlement amounts
  console.log("\n5️⃣ Getting settlement breakdown...");
  const [creditors, creditorAmounts, debtors, debtorAmounts] = await group.read.getSettlementAmounts();
  
  console.log("💸 Settlement Breakdown:");
  console.log("   Creditors (owed money):");
  for (let i = 0; i < creditors.length; i++) {
    const name = creditors[i] === alice.account.address ? "Alice" : "Bob";
    console.log(`     ${name}: ${formatUnits(creditorAmounts[i], 6)} USDC`);
  }
  
  console.log("   Debtors (owe money):");
  for (let i = 0; i < debtors.length; i++) {
    const name = debtors[i] === alice.account.address ? "Alice" : "Bob";
    console.log(`     ${name}: ${formatUnits(debtorAmounts[i], 6)} USDC`);
  }

  // Test 6: Get bill history
  console.log("\n6️⃣ Getting bill history...");
  const billCount = await group.read.getBillCount();
  console.log(`📊 Total bills: ${billCount}`);
  
  const allBills = await group.read.getAllBills();
  console.log("📋 Bill History:");
  
  for (let i = 0; i < allBills.length; i++) {
    const bill = allBills[i];
    const payerName = bill.payer === alice.account.address ? "Alice" : "Bob";
    console.log(`   Bill ${bill.id}: "${bill.description}"`);
    console.log(`     Total: ${formatUnits(bill.totalAmount, 6)} USDC`);
    console.log(`     Paid by: ${payerName}`);
    console.log(`     Participants: ${bill.participants.length}`);
    console.log(`     Amounts: ${bill.amounts.map(amt => formatUnits(amt, 6)).join(", ")} USDC`);
    console.log(`     Date: ${new Date(Number(bill.timestamp) * 1000).toLocaleString()}`);
    console.log("");
  }

  // Test 7: Get bills by payer
  console.log("\n7️⃣ Getting Alice's bills...");
  const aliceBillIds = await group.read.getBillsByPayer([alice.account.address]);
  console.log(`📝 Alice paid ${aliceBillIds.length} bills: [${aliceBillIds.join(", ")}]`);

  // Test 8: Add another custom bill with different split
  console.log("\n8️⃣ Adding another custom bill - Uber $25 (Alice: $15, Bob: $10)...");
  const uberParticipants = [alice.account.address, bobAddress];
  const uberAmounts = [parseUnits("15", 6), parseUnits("10", 6)];

  const uberHash = await group.write.addCustomBill([
    "Uber Ride",
    uberParticipants,
    uberAmounts
  ], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: uberHash });
  console.log("✅ Another custom bill added by Alice");

  // Test 9: Final balances and settlement
  console.log("\n9️⃣ Final state after all bills...");
  const [finalAddresses, finalBalances] = await group.read.getAllBalances();
  
  console.log("💰 Final Balances:");
  for (let i = 0; i < finalAddresses.length; i++) {
    const name = finalAddresses[i] === alice.account.address ? "Alice" : "Bob";
    console.log(`   ${name}: ${formatUnits(finalBalances[i] < 0 ? -finalBalances[i] : finalBalances[i], 6)} USDC ${finalBalances[i] < 0 ? "(owes)" : "(owed)"}`);
  }

  const finalBillCount = await group.read.getBillCount();
  console.log(`📊 Total bills created: ${finalBillCount}`);

  console.log("\n🎉 ENHANCED FEATURES TESTING COMPLETED!");
  console.log("=" .repeat(50));

  console.log("\n✅ Successfully tested:");
  console.log("   ✅ Regular bill splitting (equal amounts)");
  console.log("   ✅ Custom bill splitting (specific amounts per person)");
  console.log("   ✅ Enhanced balance views (all balances at once)");
  console.log("   ✅ Settlement amount breakdown (creditors/debtors)");
  console.log("   ✅ Bill history tracking and retrieval");
  console.log("   ✅ Bills by payer filtering");
  console.log("   ✅ Detailed bill information with timestamps");

  console.log("\n🔗 View group on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${newGroupAddress}`);

} catch (error: any) {
  console.error("❌ Test failed:", error.message);
  throw error;
}
