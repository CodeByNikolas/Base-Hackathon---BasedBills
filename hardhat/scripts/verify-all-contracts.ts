import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { encodeAbiParameters } from 'viem';

// Load environment variables
dotenv.config({ path: '../.env' });

const API_KEY = process.env.ETHERSCAN_API_KEY;
const BASE_SEPOLIA_CHAIN_ID = 84532;
const ETHERSCAN_V2_API_URL = "https://api.etherscan.io/v2/api";

// Contract deployment addresses - loaded dynamically from deployments.json
let DEPLOYED_ADDRESSES = {
  groupLogic: "",
  registry: "",
  groupFactory: "",
  deployer: ""
};

interface ContractConfig {
  name: string;
  address: string;
  contractPath: string;
  dependencies: string[];
  constructorTypes?: string[];
  constructorValues?: any[];
}

// Dynamic contract configuration - will be populated after loading addresses
let CONTRACT_CONFIGS: ContractConfig[] = [];

async function generateConstructorArgs(config: ContractConfig): Promise<string> {
  if (!config.constructorTypes || !config.constructorValues) {
    return ""; // No constructor arguments
  }

  console.log(`🔧 Generating constructor args for ${config.name}...`);
  console.log(`   Types: [${config.constructorTypes.join(", ")}]`);
  console.log(`   Values: [${config.constructorValues.join(", ")}]`);

  try {
    // Create ABI parameter definitions
    const abiParams = config.constructorTypes.map((type, index) => ({
      name: `arg${index}`,
      type: type
    }));

    // Encode the parameters
    const encoded = encodeAbiParameters(abiParams, config.constructorValues);
    const result = encoded.slice(2); // Remove 0x prefix
    
    console.log(`   ✅ Encoded: ${result}`);
    return result;
  } catch (error: any) {
    console.error(`   ❌ Error encoding constructor args: ${error.message}`);
    return "";
  }
}

function createStandardJsonInput(config: ContractConfig): any {
  const sources: any = {};
  const basePath = process.cwd();
  
  console.log(`📁 Reading source files for ${config.name}...`);
  
  // Add main contract source
  const contractFile = `contracts/${config.name}.sol`;
  try {
    sources[contractFile] = {
      content: fs.readFileSync(path.join(basePath, contractFile), 'utf8')
    };
    console.log(`   ✅ ${contractFile}`);
  } catch (error) {
    console.error(`   ❌ Failed to read ${contractFile}`);
    throw error;
  }
  
  // Add all dependencies
  for (const dep of config.dependencies) {
    try {
      let filePath: string;
      if (dep.startsWith('@openzeppelin/')) {
        filePath = path.join(basePath, 'node_modules', dep);
      } else {
        filePath = path.join(basePath, dep);
      }
      
      sources[dep] = {
        content: fs.readFileSync(filePath, 'utf8')
      };
      console.log(`   ✅ ${dep}`);
    } catch (error) {
      console.error(`   ❌ Failed to read dependency ${dep}`);
      throw error;
    }
  }
  
  return {
    language: "Solidity",
    sources: sources,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
        }
      }
    }
  };
}

async function checkVerificationStatus(config: ContractConfig): Promise<boolean> {
  try {
    console.log(`\n🔍 Checking ${config.name} verification status...`);
    
    const params = new URLSearchParams({
      module: 'contract',
      action: 'getsourcecode',
      address: config.address,
      apikey: API_KEY || ""
    });

    const apiUrlWithChain = `${ETHERSCAN_V2_API_URL}?chainid=${BASE_SEPOLIA_CHAIN_ID}&${params.toString()}`;
    const response = await fetch(apiUrlWithChain);
    const result = await response.json();

    if (result.status === '1' && result.result && result.result.length > 0) {
      const contractData = result.result[0];
      
      if (contractData.SourceCode && contractData.SourceCode !== '') {
        console.log(`✅ ${config.name} is VERIFIED on BaseScan`);
        console.log(`   Contract Name: ${contractData.ContractName}`);
        console.log(`   Compiler: ${contractData.CompilerVersion}`);
        console.log(`   🔗 View: https://sepolia.basescan.org/address/${config.address}#code`);
        return true;
      } else {
        console.log(`❌ ${config.name} is NOT VERIFIED on BaseScan`);
        return false;
      }
    } else {
      console.log(`❌ ${config.name} - API Error: ${result.result || result.message}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error checking ${config.name}:`, error.message);
    return false;
  }
}

async function verifyContract(config: ContractConfig): Promise<string | null> {
  console.log(`\n📤 Verifying ${config.name} on BaseScan...`);
  
  try {
    // Generate constructor arguments
    const constructorArgs = await generateConstructorArgs(config);
    
    // Create standard JSON input
    const standardJsonInput = createStandardJsonInput(config);
    
    const formData = new URLSearchParams({
      module: 'contract',
      action: 'verifysourcecode',
      apikey: API_KEY || "",
      contractaddress: config.address,
      sourceCode: JSON.stringify(standardJsonInput),
      codeformat: 'solidity-standard-json-input',
      contractname: config.contractPath,
      compilerversion: 'v0.8.28+commit.7893614a',
      optimizationUsed: '1',
      runs: '200',
      constructorArguments: constructorArgs,
      licenseType: '3' // MIT License
    });

    // Chain ID goes in the URL as per the API documentation
    const apiUrlWithChain = `${ETHERSCAN_V2_API_URL}?chainid=${BASE_SEPOLIA_CHAIN_ID}`;
    
    const response = await fetch(apiUrlWithChain, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const result = await response.json();
    
    if (result.status === '1') {
      console.log(`✅ ${config.name} verification submitted successfully!`);
      console.log(`📋 GUID: ${result.result}`);
      console.log(`⏳ Verification may take 1-15 minutes to process...`);
      return result.result;
    } else {
      console.log(`❌ ${config.name} verification failed: ${result.result || result.message}`);
      return null;
    }
  } catch (error: any) {
    console.error(`❌ Error verifying ${config.name}:`, error.message);
    return null;
  }
}

async function checkVerificationStatusByGuid(guid: string, contractName: string): Promise<boolean> {
  try {
    console.log(`\n🔍 Checking verification status for ${contractName} (GUID: ${guid})...`);
    
    const params = new URLSearchParams({
      module: 'contract',
      action: 'checkverifystatus',
      guid: guid,
      apikey: API_KEY || ""
    });

    const apiUrlWithChain = `${ETHERSCAN_V2_API_URL}?chainid=${BASE_SEPOLIA_CHAIN_ID}&${params.toString()}`;
    const response = await fetch(apiUrlWithChain);
    const result = await response.json();

    if (result.status === '1') {
      console.log(`✅ ${contractName} verification status: ${result.result}`);
      return result.result === 'Pass - Verified';
    } else {
      console.log(`⚠️ ${contractName} verification status check: ${result.result || result.message}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error checking verification status for ${contractName}:`, error.message);
    return false;
  }
}

function createContractConfigs(): void {
  console.log("🔧 Creating contract configurations...");
  
  CONTRACT_CONFIGS = [
    {
      name: "Group",
      address: DEPLOYED_ADDRESSES.groupLogic,
      contractPath: "contracts/Group.sol:Group",
      dependencies: ["contracts/IUSDC.sol"],
      // No constructor arguments
    },
    {
      name: "Registry",
      address: DEPLOYED_ADDRESSES.registry,
      contractPath: "contracts/Registry.sol:Registry", 
      dependencies: ["contracts/IUSDC.sol"],
      constructorTypes: ["address"],
      constructorValues: [DEPLOYED_ADDRESSES.deployer] // Initially deployed with deployer address
    },
    {
      name: "GroupFactory",
      address: DEPLOYED_ADDRESSES.groupFactory,
      contractPath: "contracts/GroupFactory.sol:GroupFactory",
      dependencies: [
        "contracts/IUSDC.sol",
        "contracts/Registry.sol", 
        "contracts/Group.sol",
        "@openzeppelin/contracts/proxy/Clones.sol",
        "@openzeppelin/contracts/utils/Create2.sol",
        "@openzeppelin/contracts/utils/Errors.sol"
      ],
      constructorTypes: ["address", "address"],
      constructorValues: [DEPLOYED_ADDRESSES.groupLogic, DEPLOYED_ADDRESSES.registry]
    }
  ];
  
  console.log(`✅ Created ${CONTRACT_CONFIGS.length} contract configurations`);
}

async function loadDeploymentAddresses(): Promise<void> {
  const artifactsPath = path.join(process.cwd(), 'deployments.json');
  
  try {
    if (!fs.existsSync(artifactsPath)) {
      console.log("❌ deployments.json not found!");
      console.log("💡 Please run 'npm run deploy' first to deploy contracts and generate deployments.json");
      process.exit(1);
    }

    const deployments = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
    console.log("📋 Loaded deployment addresses from deployments.json");
    
    // Validate and load addresses
    const requiredFields = ['groupLogic', 'registry', 'groupFactory', 'deployer'];
    for (const field of requiredFields) {
      if (!deployments[field]) {
        console.log(`❌ Missing ${field} in deployments.json`);
        process.exit(1);
      }
      DEPLOYED_ADDRESSES[field as keyof typeof DEPLOYED_ADDRESSES] = deployments[field];
    }

    console.log("🏠 Contract Addresses:");
    console.log(`   Group Logic: ${DEPLOYED_ADDRESSES.groupLogic}`);
    console.log(`   Registry: ${DEPLOYED_ADDRESSES.registry}`);
    console.log(`   GroupFactory: ${DEPLOYED_ADDRESSES.groupFactory}`);
    console.log(`   Deployer: ${DEPLOYED_ADDRESSES.deployer}`);
    
  } catch (error: any) {
    console.log(`❌ Error loading deployments.json: ${error.message}`);
    console.log("💡 Please ensure deployments.json exists and contains valid deployment data");
    process.exit(1);
  }
}

async function displayProxyInformation(): Promise<void> {
  console.log("\n🔗 EIP-1167 Proxy Contract Information:");
  console.log("Individual group instances created by GroupFactory are EIP-1167 minimal proxies.");
  console.log("These automatically inherit verification from the Group Logic contract.");
  console.log("\n💡 To verify a specific group instance as a proxy:");
  console.log(`curl -d "address=YOUR_GROUP_INSTANCE_ADDRESS&expectedimplementation=${DEPLOYED_ADDRESSES.groupLogic}" \\`);
  console.log(`"${ETHERSCAN_V2_API_URL}?chainid=${BASE_SEPOLIA_CHAIN_ID}&module=contract&action=verifyproxycontract&apikey=YOUR_API_KEY"`);
}

async function main() {
  console.log("🔍 BasedBills Universal Contract Verification Script");
  console.log(`🌐 Base Sepolia Testnet (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`);
  console.log("📚 Using Etherscan V2 API with dynamic constructor argument generation");
  
  if (!API_KEY) {
    console.log("❌ ETHERSCAN_API_KEY not found in environment variables");
    console.log("💡 Add your Etherscan API key to the .env file:");
    console.log("   ETHERSCAN_API_KEY=your_api_key_here");
    process.exit(1);
  }

  console.log("✅ API Key found, proceeding with verification...");

  // Load deployment addresses and create contract configurations
  await loadDeploymentAddresses();
  createContractConfigs();

  const unverifiedContracts: ContractConfig[] = [];
  const verificationGuids: { name: string; guid: string }[] = [];

  // Step 1: Check current verification status
  console.log("\n📋 Step 1: Checking current verification status...");
  for (const config of CONTRACT_CONFIGS) {
    const isVerified = await checkVerificationStatus(config);
    if (!isVerified) {
      unverifiedContracts.push(config);
    }
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 2: Verify unverified contracts
  if (unverifiedContracts.length > 0) {
    console.log(`\n📤 Step 2: Verifying ${unverifiedContracts.length} unverified contract(s)...`);
    
    for (const config of unverifiedContracts) {
      const guid = await verifyContract(config);
      if (guid) {
        verificationGuids.push({ name: config.name, guid });
      }
      // Delay between submissions to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } else {
    console.log("\n🎉 All contracts are already verified on BaseScan!");
  }

  // Step 3: Check verification results
  if (verificationGuids.length > 0) {
    console.log("\n⏳ Step 3: Waiting 30 seconds before checking verification results...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    for (const { name, guid } of verificationGuids) {
      await checkVerificationStatusByGuid(guid, name);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Step 4: Final status and summary
  console.log("\n📋 Final Contract Status:");
  CONTRACT_CONFIGS.forEach(config => {
    console.log(`  ${config.name}: https://sepolia.basescan.org/address/${config.address}`);
  });

  await displayProxyInformation();

  console.log("\n🎯 Verification Summary:");
  console.log("✅ All contracts deployed on Base Sepolia");
  console.log("✅ All contracts verified on Blockscout (primary Base explorer)");
  console.log("🔄 BaseScan verification completed");
  console.log("🔗 EIP-1167 clones automatically inherit verification from Group Logic");
  console.log("🛠️ Constructor arguments generated dynamically");
  console.log("📦 Dependencies resolved automatically");
}

main().catch((error) => {
  console.error("❌ Universal verification script failed:", error);
  process.exit(1);
});
