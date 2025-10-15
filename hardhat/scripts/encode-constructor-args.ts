import { encodeAbiParameters } from "viem";

async function main() {
  const groupLogic = "0x8e36374afe7e093f721b88baad72aaf4536c9834";
  const registry = "0x2e72fca70cb001e3f3d6cce6d7340657b47b1d64";

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
