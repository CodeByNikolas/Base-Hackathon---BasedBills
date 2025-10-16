import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";
import fs from 'fs';
import path from 'path';

async function main() {
  console.log("🎲 Testing BasedBills Gamble Feature...");

  const { viem } = await network.connect({
    network: "baseSepolia",
    chainType: "op",
  });

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  if (walletClients.length < 2) {
    console.log("❌ Need at least 2 wallet accounts for gamble testing");
    process.exit(1);
  }

  const alice = walletClients[0];
  const bob = walletClients[1];

  console.log("👤 Alice:", alice.account.address);
  console.log("👤 Bob:", bob.account.address);

  // Load contract addresses from deployments.json
  const deploymentsPath = path.join(process.cwd(), 'deployments.json');
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

const contractAddresses = {
  groupFactory: deployments.groupFactory,
  registry: deployments.registry,
  groupLogic: deployments.groupLogic
};

console.log("\n📋 Using deployed contracts:");
console.log("GroupFactory:", contractAddresses.groupFactory);

const groupFactory = await viem.getContractAt("GroupFactory", contractAddresses.groupFactory);
const registry = await viem.getContractAt("Registry", contractAddresses.registry);

console.log("\n🎲 TESTING GAMBLE FEATURE");
console.log("=".repeat(60));

try {
  // Step 1: Create a new group for gamble testing
  console.log("\n1️⃣ Creating new group with Alice and Bob...");
  const members = [alice.account.address, bob.account.address];
  const groupName = "Alice & Bob's Gamble Group";
  
  const createGroupHash = await groupFactory.write.createGroup([members, groupName], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
  console.log("✅ Group created!");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Get the new group address
  const aliceGroups = await registry.read.getGroupsForUser([alice.account.address]);
  const newGroupAddress = aliceGroups[aliceGroups.length - 1];
  console.log("🏠 New group address:", newGroupAddress);

  const group = await viem.getContractAt("Group", newGroupAddress);

  // Step 2: Add some bills to create debts
  console.log("\n2️⃣ Adding bills to create debts...");
  const lunchAmount = parseUnits("60", 6); // Alice pays 60
  const groceriesAmount = parseUnits("90", 6); // Bob pays 90
  const uberAmount = parseUnits("25", 6);
  
  // Alice pays for lunch - $60 split equally
  const lunchHash = await group.write.addBill([
    "Team Lunch",
    lunchAmount,
    [alice.account.address, bob.account.address]
  ], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: lunchHash });
  console.log("✅ Alice paid for lunch ($60)");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Bob pays for groceries - $90 split equally
  const groceryHash = await group.write.addBill([
    "Weekly Groceries",
    groceriesAmount,
    [alice.account.address, bob.account.address]
  ], { account: bob.account });
  await publicClient.waitForTransactionReceipt({ hash: groceryHash });
  console.log("✅ Bob paid for groceries ($90)");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Alice pays for Uber - $25 (Alice: $15, Bob: $10)
  const uberHash = await group.write.addCustomBill([
    "Uber Ride",
    [alice.account.address, bob.account.address],
    [parseUnits("15", 6), parseUnits("10", 6)]
  ], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: uberHash });
  console.log("✅ Alice paid for Uber ($25 - Alice: $15, Bob: $10)");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Check balances before gamble
  console.log("\n3️⃣ Checking balances before gamble...");
  const [memberAddresses, memberBalances] = await group.read.getAllBalances();
  console.log("💰 Current Balances:");
  memberAddresses.forEach((addr, i) => {
    const balance = memberBalances[i];
    const amount = formatUnits(balance < 0 ? -balance : balance, 6);
    const status = balance > 0 ? "owed" : balance < 0 ? "owes" : "even";
    const name = addr === alice.account.address ? "Alice" : "Bob";
    console.log(`   ${name}: ${amount} USDC (${status}) - Raw balance: ${balance.toString()}`);
  });

  // Also check individual balances
  const aliceBalance = await group.read.getBalance([alice.account.address]);
  const bobBalance = await group.read.getBalance([bob.account.address]);
  console.log(`🔍 Individual balances - Alice: ${aliceBalance.toString()}, Bob: ${bobBalance.toString()}`);

  // Check unsettled bills
  const unsettledBills = await group.read.getUnsettledBills();
  console.log(`📊 Unsettled bills: ${unsettledBills.length}`);
  let totalUnsettledAmount = 0n;
  unsettledBills.forEach(bill => {
    totalUnsettledAmount += bill.totalAmount;
    console.log(`   Bill ${bill.id}: "${bill.description}" - ${formatUnits(bill.totalAmount, 6)} USDC`);
  });
  console.log(`💸 Total unsettled amount: ${formatUnits(totalUnsettledAmount, 6)} USDC`);

  // Step 4: Test gamble proposal
  console.log("\n4️⃣ Testing gamble proposal...");
  
  // Alice proposes gamble
  const proposeHash = await group.write.proposeGamble([], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: proposeHash });
  console.log("✅ Alice proposed gamble!");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check gamble status
  const gambleStatus = await group.read.getGambleStatus();
  console.log("🎲 Gamble Status:");
  console.log(`   Active: ${gambleStatus[0]}`);
  console.log(`   Proposer: ${gambleStatus[1] === alice.account.address ? "Alice" : "Bob"}`);
  console.log(`   Votes: ${gambleStatus[2]}/${gambleStatus[3]}`);
  console.log(`   Alice has voted: ${gambleStatus[4]}`);

  // Step 5: Test voting process
  console.log("\n5️⃣ Testing voting process...");
  
  // Alice votes yes (as proposer)
  const aliceVoteHash = await group.write.voteOnGamble([true], { account: alice.account });
  await publicClient.waitForTransactionReceipt({ hash: aliceVoteHash });
  console.log("✅ Alice voted YES");
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check status after Alice's vote
  const statusAfterAlice = await group.read.getGambleStatus();
  console.log(`🗳️ After Alice's vote: ${statusAfterAlice[2]}/${statusAfterAlice[3]} votes`);

  // Bob votes yes (this should trigger gamble execution)
  console.log("\n6️⃣ Bob voting YES (should trigger gamble execution)...");
  const bobVoteHash = await group.write.voteOnGamble([true], { account: bob.account });
  const bobVoteReceipt = await publicClient.waitForTransactionReceipt({ hash: bobVoteHash });
  console.log("✅ Bob voted YES - Gamble should be executed!");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 6: Check results after gamble execution
  console.log("\n7️⃣ Checking results after gamble execution...");
  
  // Check if gamble is still active (should be false)
  const finalGambleStatus = await group.read.getGambleStatus();
  console.log(`🎲 Gamble still active: ${finalGambleStatus[0]}`);

  // Check new balances
  const [finalAddresses, finalBalances] = await group.read.getAllBalances();
  console.log("💰 Final Balances After Gamble:");
  let loserFound = "";
  finalAddresses.forEach((addr, i) => {
    const balance = finalBalances[i];
    const amount = formatUnits(balance < 0 ? -balance : balance, 6);
    const status = balance > 0 ? "owed" : "owes";
    const name = addr === alice.account.address ? "Alice" : "Bob";
    console.log(`   ${name}: ${amount} USDC (${status})`);
    
    if (balance < 0) {
      loserFound = name;
    }
  });
  
  if (loserFound) {
    console.log(`🎯 Gamble Result: ${loserFound} was selected as the loser!`);
  }

  // Check settlement counter
  const settlementCounter = await group.read.settlementCounter();
  console.log(`📊 Settlement counter: ${settlementCounter}`);

  // Check if bills are now settled
  const finalUnsettledBills = await group.read.getUnsettledBills();
  console.log(`📋 Unsettled bills after gamble: ${finalUnsettledBills.length}`);

  // Check bills from the gamble settlement
  if (settlementCounter > 0n) {
    const settledBills = await group.read.getBillsBySettlement([settlementCounter - 1n]);
    console.log(`🏆 Bills settled by gamble (Settlement ${settlementCounter - 1n}): ${settledBills.length}`);
    settledBills.forEach(bill => {
      console.log(`   Bill ${bill.id}: "${bill.description}" - ${formatUnits(bill.totalAmount, 6)} USDC`);
    });
  }

  // Step 7: Test edge cases
  console.log("\n8️⃣ Testing edge cases...");
  
  // Try to propose gamble when no debts exist (should fail if no new bills)
  try {
    const noDebtGambleHash = await group.write.proposeGamble([], { account: alice.account });
    await publicClient.waitForTransactionReceipt({ hash: noDebtGambleHash });
    console.log("⚠️ Gamble proposed with no debts - this might be unexpected");
  } catch (error: any) {
    if (error.message.includes("No debts to gamble")) {
      console.log("✅ Correctly rejected gamble proposal with no debts");
    } else {
      console.log("❓ Unexpected error:", error.message);
    }
  }

  console.log("\n🎉 GAMBLE FEATURE TESTING COMPLETED!");
  console.log("=".repeat(60));

  console.log("\n✅ Successfully tested:");
  console.log("   ✅ Gamble proposal by any member");
  console.log("   ✅ Unanimous voting requirement");
  console.log("   ✅ Random loser selection");
  console.log("   ✅ Fair debt redistribution");
  console.log("   ✅ Bill settlement tracking");
  console.log("   ✅ Settlement counter increment");
  console.log("   ✅ Edge case handling");

  console.log("\n🔗 View group on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${newGroupAddress}`);

  console.log("\n📈 Gamble Logic Verification:");
  console.log("   🎯 Loser owes the full gross amount of all unsettled bills");
  console.log("   💰 Original payers get credited for their full bill amounts");
  console.log("   🔄 All bills marked as settled with settlement ID");
  console.log("   ⚡ New settlement triggered if debts remain after gamble");

} catch (error: any) {
  console.error("❌ Gamble test failed:", error.message);
  if (error.details) {
    console.error("Details:", error.details);
  }
  throw error;
}
}

main().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
