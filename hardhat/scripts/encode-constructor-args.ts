import { encodeAbiParameters } from "viem";
import { readFileSync } from 'fs';

async function main() {
  // Load deployment data
  const deployments = JSON.parse(readFileSync('../hardhat/deployments.json', 'utf8'));

  const groupLogic = deployments.groupLogic;
  const registry = deployments.registry;

  // Encode constructor arguments for GroupFactory(address _logicContract, address _registryAddress)
  const encoded = encodeAbiParameters(
    [
      { name: '_logicContract', type: 'address' },
      { name: '_registryAddress', type: 'address' }
    ],
    [groupLogic, registry]
  );

  console.log("GroupFactory constructor arguments (ABI-encoded):");
  console.log(encoded.slice(2)); // Remove 0x prefix for Etherscan
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
