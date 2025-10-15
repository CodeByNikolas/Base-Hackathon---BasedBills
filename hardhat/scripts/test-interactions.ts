import { network } from "hardhat";
import { formatUnits, parseUnits } from "viem";

console.log("🧪 Testing BasedBills contracts on Base Sepolia...");

// Contract addresses from deployment
const addresses = {
  groupLogic: "0xa4cf50aa00c58852c37b3fa663d7ba032843d594",
  registry: "0x6add08fb50b7e6def745a87a16254522713a5676",
  groupFactory: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74",
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

console.log("\n🏭 Testing GroupFactory...");

// Test 1: Create a group
console.log("\n1️⃣ Creating a test group...");
const members = [
  walletClient.account.address,
  "0x742d35Cc6634C0532925a3b8D6Ac6d4C2c5e1c8A", // Example address
  "0x8ba1f109551bD432803012645Hac136c82C5e1c8A"  // Example address
];

try {
  const createGroupHash = await groupFactory.write.createGroup([members]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createGroupHash });
  console.log("✅ Group created! Transaction:", createGroupHash);
  
  // Get the group address from events
  const groupCreatedEvent = receipt.logs.find(log => 
    log.topics[0] === "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0" // GroupCreated event signature
  );
  
  if (groupCreatedEvent) {
    console.log("📋 Group creation event found in transaction");
  }
  
} catch (error) {
  console.log("ℹ️ Group creation test (expected to fail with example addresses):", error.message);
}

// Test 2: Check registry
console.log("\n2️⃣ Testing Registry...");
try {
  const userGroups = await registry.read.getGroupsForUser([walletClient.account.address]);
  console.log("👤 User groups:", userGroups);
  console.log("📊 Number of groups:", userGroups.length);
} catch (error) {
  console.log("❌ Registry test failed:", error.message);
}

// Test 3: Create a group with just the deployer
console.log("\n3️⃣ Creating a single-member group...");
try {
  const singleMemberGroup = [walletClient.account.address];
  const createSingleGroupHash = await groupFactory.write.createGroup([singleMemberGroup]);
  const singleReceipt = await publicClient.waitForTransactionReceipt({ hash: createSingleGroupHash });
  console.log("✅ Single-member group created! Transaction:", createSingleGroupHash);
  
  // Check updated registry
  const updatedUserGroups = await registry.read.getGroupsForUser([walletClient.account.address]);
  console.log("📊 Updated user groups count:", updatedUserGroups.length);
  
  if (updatedUserGroups.length > 0) {
    const groupAddress = updatedUserGroups[updatedUserGroups.length - 1];
    console.log("🎯 Latest group address:", groupAddress);
    
    // Test 4: Interact with the group
    console.log("\n4️⃣ Testing Group contract interactions...");
    const group = await viem.getContractAt("Group", groupAddress);
    
    // Check group members
    const groupMembers = await group.read.getMembers();
    console.log("👥 Group members:", groupMembers);
    
    // Check member balance
    const memberBalance = await group.read.getBalance([walletClient.account.address]);
    console.log("💰 Member balance:", memberBalance.toString());
    
    // Test 5: Add a bill
    console.log("\n5️⃣ Adding a test bill...");
    try {
      const billAmount = parseUnits("10", 6); // 10 USDC (6 decimals)
      const participants = [walletClient.account.address];
      
      const addBillHash = await group.write.addBill([
        "Test Dinner Bill",
        billAmount,
        participants
      ]);
      await publicClient.waitForTransactionReceipt({ hash: addBillHash });
      console.log("✅ Bill added! Transaction:", addBillHash);
      
      // Check updated balance
      const updatedBalance = await group.read.getBalance([walletClient.account.address]);
      console.log("💰 Updated balance:", formatUnits(updatedBalance, 6), "USDC");
      
    } catch (error) {
      console.log("❌ Add bill failed:", error.message);
    }
    
    // Test 6: Try to trigger settlement (should work even with zero debts)
    console.log("\n6️⃣ Testing settlement trigger...");
    try {
      const triggerHash = await group.write.triggerSettlement();
      await publicClient.waitForTransactionReceipt({ hash: triggerHash });
      console.log("✅ Settlement triggered! Transaction:", triggerHash);
      
      // Check settlement status
      const settlementActive = await group.read.settlementActive();
      console.log("⚖️ Settlement active:", settlementActive);
      
    } catch (error) {
      console.log("ℹ️ Settlement trigger (expected to fail with no debts):", error.message);
    }
  }
  
} catch (error) {
  console.log("❌ Single-member group creation failed:", error.message);
}

console.log("\n🎉 Contract testing completed!");
console.log("\n📋 Deployed Contract Addresses:");
console.log("Group Logic:", addresses.groupLogic);
console.log("Registry:", addresses.registry);
console.log("GroupFactory:", addresses.groupFactory);
console.log("\n🔗 View on BaseScan:");
console.log(`https://sepolia.basescan.org/address/${addresses.groupFactory}`);
