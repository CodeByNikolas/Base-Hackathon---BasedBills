import { readFileSync } from 'fs';
import { join } from 'path';

console.log("🔍 Manual BaseScan verification using API...");

// Contract addresses and details
const contracts = [
  {
    name: "Group",
    address: "0xa4cf50aa00c58852c37b3fa663d7ba032843d594",
    constructorArgs: "",
    contractPath: "contracts/Group.sol:Group"
  },
  {
    name: "Registry", 
    address: "0x6add08fb50b7e6def745a87a16254522713a5676",
    constructorArgs: "00000000000000000000000021750fc30922badd61c2f1e48b94683071dfbcaa", // ABI encoded constructor args
    contractPath: "contracts/Registry.sol:Registry"
  },
  {
    name: "GroupFactory",
    address: "0xfdf8a83a3d1dc0aa285616883452a2824e559d74", 
    constructorArgs: "000000000000000000000000a4cf50aa00c58852c37b3fa663d7ba032843d5940000000000000000000000006add08fb50b7e6def745a87a16254522713a5676", // ABI encoded constructor args
    contractPath: "contracts/GroupFactory.sol:GroupFactory"
  }
];

const API_KEY = process.env.ETHERSCANAPIKEY;
const BASE_SEPOLIA_API_URL = "https://api-sepolia.basescan.org/api";

if (!API_KEY) {
  console.log("❌ ETHERSCANAPIKEY not found in environment variables");
  process.exit(1);
}

console.log("✅ API Key found, proceeding with verification...");

async function verifyContract(contract: any) {
  console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);
  
  try {
    // Read the flattened source code
    let sourceCode = "";
    try {
      sourceCode = readFileSync(join(__dirname, `../contracts/${contract.name}.sol`), 'utf8');
    } catch (error) {
      console.log(`⚠️ Could not read source file for ${contract.name}`);
      return;
    }

    const params = new URLSearchParams({
      module: 'contract',
      action: 'verifysourcecode',
      apikey: API_KEY,
      contractaddress: contract.address,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file',
      contractname: contract.contractPath,
      compilerversion: 'v0.8.28+commit.7893614a', // Update this to match your compiler version
      optimizationUsed: '0',
      runs: '200',
      constructorArguements: contract.constructorArgs,
      evmversion: 'default',
      licenseType: '3' // MIT License
    });

    console.log(`📤 Submitting verification request for ${contract.name}...`);
    
    const response = await fetch(BASE_SEPOLIA_API_URL, {
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
    } else {
      console.log(`❌ ${contract.name} verification failed:`, result.result);
    }
    
  } catch (error) {
    console.log(`❌ Error verifying ${contract.name}:`, error.message);
  }
}

async function main() {
  console.log("\n📋 Starting manual BaseScan verification...");
  
  for (const contract of contracts) {
    await verifyContract(contract);
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log("\n🎉 Verification requests completed!");
  console.log("\n💡 Note: Verification may take a few minutes to process.");
  console.log("Check the contract pages on BaseScan to see the verification status.");
  
  console.log("\n🔗 Contract Links:");
  contracts.forEach(contract => {
    console.log(`${contract.name}: https://sepolia.basescan.org/address/${contract.address}`);
  });
}

main().catch(console.error);
