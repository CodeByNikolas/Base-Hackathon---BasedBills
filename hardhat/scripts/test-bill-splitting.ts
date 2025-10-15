import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";

console.log("💰 Testing Bill Splitting Functionality on Base Sepolia...");

// Contract addresses from deployment
const addresses = {
  groupFactory: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74",
  registry: "0x6add08fb50b7e6def745a87a16254522713a5676",
};

const { viem } = await network.connect({
  network: "baseSepolia",
  chainType: "op",
});

const publicClient = await viem.getPublicClient();
const [walletClient] = await viem.getWalletClients();

console.log("Testing with account:", walletClient.account.address);

// Get contract instances
const groupFactory = await viem.getContractAt("GroupFactory", addresses.groupFactory);
const registry = await viem.getContractAt("Registry", addresses.registry);

console.log("\n🎯 Creating a group for bill splitting demo...");

// Create a group with the deployer as the only member (simulating multiple members)
const members = [walletClient.account.address];

try {
  const createGroupHash = await groupFactory.write.createGroup([members]);
  await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
  console.log("✅ Demo group created! Transaction:", createGroupHash);
  
  // Get the group address
  const userGroups = await registry.read.getGroupsForUser([walletClient.account.address]);
  const groupAddress = userGroups[userGroups.length - 1];
  console.log("🏠 Group address:", groupAddress);
  
  const group = await viem.getContractAt("Group", groupAddress);
  
  console.log("\n💳 Scenario: Restaurant Bill Splitting");
  console.log("👥 Group members:", await group.read.getMembers());
  
  // Scenario 1: User pays for dinner and splits with themselves (demo)
  console.log("\n1️⃣ Adding dinner bill: $50 USDC");
  const dinnerAmount = parseUnits("50", 6); // 50 USDC
  const participants = [walletClient.account.address]; // In real scenario, this would be multiple people
  
  const addDinnerHash = await group.write.addBill([
    "Dinner at Italian Restaurant",
    dinnerAmount,
    participants
  ]);
  await publicClient.waitForTransactionReceipt({ hash: addDinnerHash });
  console.log("✅ Dinner bill added!");
  
  let balance = await group.read.getBalance([walletClient.account.address]);
  console.log("💰 Balance after dinner:", formatUnits(balance, 6), "USDC");
  
  // Scenario 2: Add another bill
  console.log("\n2️⃣ Adding taxi bill: $15 USDC");
  const taxiAmount = parseUnits("15", 6); // 15 USDC
  
  const addTaxiHash = await group.write.addBill([
    "Taxi ride home",
    taxiAmount,
    participants
  ]);
  await publicClient.waitForTransactionReceipt({ hash: addTaxiHash });
  console.log("✅ Taxi bill added!");
  
  balance = await group.read.getBalance([walletClient.account.address]);
  console.log("💰 Balance after taxi:", formatUnits(balance, 6), "USDC");
  
  // Scenario 3: Add a third bill
  console.log("\n3️⃣ Adding coffee bill: $8 USDC");
  const coffeeAmount = parseUnits("8", 6); // 8 USDC
  
  const addCoffeeHash = await group.write.addBill([
    "Morning coffee",
    coffeeAmount,
    participants
  ]);
  await publicClient.waitForTransactionReceipt({ hash: addCoffeeHash });
  console.log("✅ Coffee bill added!");
  
  balance = await group.read.getBalance([walletClient.account.address]);
  console.log("💰 Final balance:", formatUnits(balance, 6), "USDC");
  
  console.log("\n📊 Bill Summary:");
  console.log("🍝 Dinner: $50 USDC");
  console.log("🚕 Taxi: $15 USDC");
  console.log("☕ Coffee: $8 USDC");
  console.log("💵 Total paid by user:", formatUnits(balance, 6), "USDC");
  
  // Try settlement (will fail because no one owes money in single-member group)
  console.log("\n⚖️ Attempting settlement...");
  try {
    const settlementHash = await group.write.triggerSettlement();
    await publicClient.waitForTransactionReceipt({ hash: settlementHash });
    console.log("✅ Settlement triggered!");
  } catch (error) {
    console.log("ℹ️ Settlement not needed (no debts in single-member group)");
    console.log("   In a real scenario with multiple members, some would owe money");
  }
  
  console.log("\n🎉 Bill splitting demo completed!");
  console.log("\n💡 How it works in a real multi-member group:");
  console.log("   • When bills are added, the payer gets positive balance (owed money)");
  console.log("   • Participants get negative balance (owe money)");
  console.log("   • Settlement process allows automatic USDC transfers");
  console.log("   • All creditors must approve, all debtors must fund");
  console.log("   • Smart contract automatically distributes when conditions are met");
  
  console.log("\n🔗 View transactions on BaseScan:");
  console.log(`https://sepolia.basescan.org/address/${groupAddress}`);
  
} catch (error) {
  console.log("❌ Demo failed:", error.message);
}

console.log("\n📋 Contract Addresses:");
console.log("GroupFactory:", addresses.groupFactory);
console.log("Registry:", addresses.registry);
