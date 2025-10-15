import type { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import { configVariable } from "hardhat/config";

// Load environment variables from parent directory
dotenv.config({ path: "../.env" });

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    baseSepolia: {
      type: "http",
      chainType: "op",
      url: "https://base-sepolia-rpc.publicnode.com",
      accounts: [
        ...(process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []),
        ...(process.env.PRIVATE_KEY2 ? [process.env.PRIVATE_KEY2] : [])
      ].filter(Boolean),
      chainId: 84532,
      timeout: 60000,
      httpHeaders: {},
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCANAPIKEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org/",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
