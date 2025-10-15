import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deployment module for the complete BillSplit system
 * Deploys Registry, Group logic contract, and GroupFactory in the correct order
 */
const BillSplitSystemModule = buildModule("BillSplitSystem", (m) => {
  // Step 1: Deploy the Group logic contract (template)
  const groupLogic = m.contract("Group");

  // Step 2: Deploy the Registry contract with a placeholder factory address
  // We'll update this after deploying the factory
  const registry = m.contract("Registry", [
    "0x0000000000000000000000000000000000000000" // Placeholder, will be updated
  ]);

  // Step 3: Deploy the GroupFactory with the logic contract and registry addresses
  const groupFactory = m.contract("GroupFactory", [
    groupLogic,
    registry
  ]);

  // Step 4: Update the Registry with the actual factory address
  // This call will set the correct factory address in the registry
  m.call(registry, "updateFactory", [groupFactory]);

  return {
    groupLogic,
    registry,
    groupFactory
  };
});

export default BillSplitSystemModule;
