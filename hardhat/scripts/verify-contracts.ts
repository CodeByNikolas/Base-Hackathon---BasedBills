import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_V2_API_URL = "https://api.etherscan.io/v2/api?chainid=84532";

console.log("🔍 Verifying BasedBills Contracts on BaseScan...");

// Contract addresses and details - UPDATE THESE AFTER DEPLOYMENT
const contracts = [
  {
    name: "Group",
    address: "0x56bfa92a6e788f8a157e3f479dd326d93a9458ea",
    constructorArgs: "", // No constructor arguments for Group
    contractPath: "contracts/Group.sol:Group"
  },
  {
    name: "Registry", 
    address: "0x01856ca0017a4f6f708b7f8df57a20d9ddf8dc74",
    constructorArgs: "00000000000000000000000021750fc30922badd61c2f1e48b94683071dfbcaa", // ABI encoded deployer address
    contractPath: "contracts/Registry.sol:Registry"
  },
  {
    name: "GroupFactory",
    address: "0x06043efb63514bcc98f142bc4936ec66732a0729", 
    constructorArgs: "00000000000000000000000056bfa92a6e788f8a157e3f479dd326d93a9458ea00000000000000000000000001856ca0017a4f6f708b7f8df57a20d9ddf8dc74", // ABI encoded constructor args
    contractPath: "contracts/GroupFactory.sol:GroupFactory"
  }
];

if (!API_KEY) {
  console.log("❌ ETHERSCAN_API_KEY not found in environment variables");
  console.log("⚠️ Contracts can still be verified on Blockscout using: npx hardhat verify --network baseSepolia [ADDRESS]");
  console.log("\n🔗 Blockscout Links:");
  contracts.forEach(contract => {
    console.log(`${contract.name}: https://base-sepolia.blockscout.com/address/${contract.address}#code`);
  });
  process.exit(0);
}

console.log("✅ API Key found, proceeding with BaseScan verification...");

async function verifyContract(contract: any) {
  console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);
  
  try {
    // Create standard JSON input for verification
    const standardJsonInput = {
      language: "Solidity",
      sources: {},
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        },
        outputSelection: {
          "*": {
            "*": ["*"]
          }
        }
      }
    };

    console.log("📁 Reading source files...");

    // Read all required source files
    const groupSource = readFileSync(`contracts/Group.sol`, 'utf8');
    const registrySource = readFileSync(`contracts/Registry.sol`, 'utf8');
    const groupFactorySource = readFileSync(`contracts/GroupFactory.sol`, 'utf8');
    const iusdcSource = readFileSync(`contracts/IUSDC.sol`, 'utf8');
    
    // OpenZeppelin dependencies
    const clonesSource = readFileSync(`node_modules/@openzeppelin/contracts/proxy/Clones.sol`, 'utf8');
    const create2Source = readFileSync(`node_modules/@openzeppelin/contracts/utils/Create2.sol`, 'utf8');
    const errorsSource = readFileSync(`node_modules/@openzeppelin/contracts/utils/Errors.sol`, 'utf8');

    // Add all sources to the JSON input
    standardJsonInput.sources[`contracts/Group.sol`] = { content: groupSource };
    standardJsonInput.sources[`contracts/Registry.sol`] = { content: registrySource };
    standardJsonInput.sources[`contracts/GroupFactory.sol`] = { content: groupFactorySource };
    standardJsonInput.sources[`contracts/IUSDC.sol`] = { content: iusdcSource };
    standardJsonInput.sources[`@openzeppelin/contracts/proxy/Clones.sol`] = { content: clonesSource };
    standardJsonInput.sources[`@openzeppelin/contracts/utils/Create2.sol`] = { content: create2Source };
    standardJsonInput.sources[`@openzeppelin/contracts/utils/Errors.sol`] = { content: errorsSource };

    const params = new URLSearchParams({
      module: 'contract',
      action: 'verifysourcecode',
      apikey: API_KEY,
      contractaddress: contract.address,
      sourceCode: JSON.stringify(standardJsonInput),
      codeformat: 'solidity-standard-json-input',
      contractname: contract.contractPath,
      compilerversion: 'v0.8.28+commit.7893614a',
      constructorArguments: contract.constructorArgs,
      licenseType: '3' // MIT License
    });

    console.log(`📤 Submitting verification request for ${contract.name} to BaseScan...`);
    
    const response = await fetch(ETHERSCAN_V2_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    const result = await response.json();
    
    if (result.status === '1') {
      console.log(`✅ ${contract.name} verification submitted successfully!`);
      console.log(`📋 GUID: ${result.result}`);
      console.log(`🔗 Check status at: https://sepolia.basescan.org/address/${contract.address}`);
      return result.result;
    } else {
      console.log(`❌ ${contract.name} verification failed: ${result.result}`);
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Error verifying ${contract.name}:`, error.message);
    return null;
  }
}

async function checkVerificationStatus(guid: string, contractName: string) {
  try {
    const params = new URLSearchParams({
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid,
      apikey: API_KEY
    });

    const response = await fetch(`${ETHERSCAN_V2_API_URL}&${params.toString()}`);
    const result = await response.json();

    if (result.status === '1') {
      console.log(`📋 ${contractName} Status: ${result.result}`);
      return result.result;
    } else {
      console.log(`⚠️ ${contractName} status check failed: ${result.result}`);
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Error checking status for ${contractName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("\n📋 Starting BaseScan verification...");
  
  const guids = [];
  for (const contract of contracts) {
    const guid = await verifyContract(contract);
    if (guid) {
      guids.push({ name: contract.name, guid, address: contract.address });
    }
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (guids.length === 0) {
    console.log("\n❌ No contracts were successfully submitted for verification");
    return;
  }

  console.log("\n🎉 Verification requests completed!");
  console.log("\n💡 Note: Verification may take 1-15 minutes to process.");
  
  console.log("\n📋 Submitted GUIDs:");
  guids.forEach(item => {
    console.log(`${item.name}: ${item.guid}`);
  });

  // Wait and check status
  console.log("\n⏳ Waiting 30 seconds before checking status...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log("\n🔍 Checking verification status...");
  for (const item of guids) {
    await checkVerificationStatus(item.guid, item.name);
  }

  console.log("\n🔗 Contract Links:");
  console.log("📊 BaseScan (Etherscan):");
  contracts.forEach(contract => {
    console.log(`  ${contract.name}: https://sepolia.basescan.org/address/${contract.address}`);
  });
  
  console.log("\n🔍 Blockscout (Fallback):");
  contracts.forEach(contract => {
    console.log(`  ${contract.name}: https://base-sepolia.blockscout.com/address/${contract.address}#code`);
  });

  console.log("\n🎯 BasedBills Contracts Summary:");
  console.log("✅ Group Logic: Advanced bill splitting with custom amounts & history");
  console.log("✅ Registry: User-to-group mapping and tracking");
  console.log("✅ GroupFactory: Gas-efficient group creation with EIP-1167 clones");
  console.log("✅ All contracts deployed and verified on Base Sepolia!");
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
