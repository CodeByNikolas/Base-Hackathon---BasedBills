import { expect } from "chai";
import { viem } from "hardhat";
import { getAddress, parseUnits } from "viem";

describe("BillSplit System", function () {
  let groupLogic: any;
  let registry: any;
  let groupFactory: any;
  let mockUSDC: any;
  let accounts: any[];

  beforeEach(async function () {
    accounts = await viem.getWalletClients();

    // Deploy a mock USDC contract for testing
    mockUSDC = await viem.deployContract("MockUSDC");

    // Deploy the Group logic contract
    groupLogic = await viem.deployContract("Group");

    // Deploy Registry with placeholder factory address
    registry = await viem.deployContract("Registry", [
      "0x0000000000000000000000000000000000000000"
    ]);

    // Deploy GroupFactory
    groupFactory = await viem.deployContract("GroupFactory", [
      groupLogic.address,
      registry.address
    ]);

    // Update registry with correct factory address
    await registry.write.updateFactory([groupFactory.address]);
  });

  describe("GroupFactory", function () {
    it("Should create a new group successfully", async function () {
      const members = [accounts[0].account.address, accounts[1].account.address];
      
      const groupAddress = await groupFactory.write.createGroup([members]);
      
      expect(groupAddress).to.not.equal("0x0000000000000000000000000000000000000000");
      
      // Check that the group was registered
      const userGroups = await registry.read.getGroupsForUser([accounts[0].account.address]);
      expect(userGroups.length).to.equal(1);
    });

    it("Should fail if creator is not in members list", async function () {
      const members = [accounts[1].account.address, accounts[2].account.address];
      
      await expect(
        groupFactory.write.createGroup([members])
      ).to.be.rejectedWith("GroupFactory: Creator must be included in members");
    });

    it("Should fail with duplicate members", async function () {
      const members = [
        accounts[0].account.address, 
        accounts[1].account.address, 
        accounts[1].account.address // Duplicate
      ];
      
      await expect(
        groupFactory.write.createGroup([members])
      ).to.be.rejectedWith("GroupFactory: Duplicate member");
    });
  });

  describe("Group Contract", function () {
    let groupContract: any;
    
    beforeEach(async function () {
      const members = [accounts[0].account.address, accounts[1].account.address, accounts[2].account.address];
      
      const { result: groupAddress } = await groupFactory.simulate.createGroup([members]);
      await groupFactory.write.createGroup([members]);
      
      groupContract = await viem.getContractAt("Group", groupAddress);
    });

    it("Should add a bill correctly", async function () {
      const participants = [accounts[0].account.address, accounts[1].account.address];
      const amount = parseUnits("100", 6); // 100 USDC
      
      await groupContract.write.addBill(["Dinner", amount, participants]);
      
      // Check balances
      const payerBalance = await groupContract.read.getBalance([accounts[0].account.address]);
      const participant1Balance = await groupContract.read.getBalance([accounts[1].account.address]);
      
      expect(payerBalance).to.equal(amount); // Payer should have positive balance
      expect(participant1Balance).to.equal(-amount / 2n); // Each participant owes half
    });

    it("Should trigger settlement correctly", async function () {
      // Add a bill first
      const participants = [accounts[0].account.address, accounts[1].account.address];
      const amount = parseUnits("100", 6);
      
      await groupContract.write.addBill(["Dinner", amount, participants]);
      
      // Trigger settlement
      await groupContract.write.triggerSettlement();
      
      const settlementActive = await groupContract.read.settlementActive();
      const totalOwed = await groupContract.read.totalOwed();
      
      expect(settlementActive).to.be.true;
      expect(totalOwed).to.equal(amount / 2n); // Only account[1] owes money
    });

    it("Should not allow adding bills during settlement", async function () {
      // Add a bill and trigger settlement
      const participants = [accounts[0].account.address, accounts[1].account.address];
      const amount = parseUnits("100", 6);
      
      await groupContract.write.addBill(["Dinner", amount, participants]);
      await groupContract.write.triggerSettlement();
      
      // Try to add another bill
      await expect(
        groupContract.write.addBill(["Lunch", amount, participants])
      ).to.be.rejectedWith("Group: Settlement is active");
    });
  });

  describe("Registry", function () {
    it("Should track user groups correctly", async function () {
      const members1 = [accounts[0].account.address, accounts[1].account.address];
      const members2 = [accounts[0].account.address, accounts[2].account.address];
      
      await groupFactory.write.createGroup([members1]);
      await groupFactory.write.createGroup([members2]);
      
      const userGroups = await registry.read.getGroupsForUser([accounts[0].account.address]);
      expect(userGroups.length).to.equal(2);
    });

    it("Should only allow factory to register groups", async function () {
      const members = [accounts[0].account.address, accounts[1].account.address];
      
      await expect(
        registry.write.registerGroup([members, accounts[3].account.address])
      ).to.be.rejectedWith("Registry: Caller is not the factory");
    });
  });
});
