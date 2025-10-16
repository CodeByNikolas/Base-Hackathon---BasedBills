export const GROUP_FACTORY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_members",
        "type": "address[]"
      },
      {
        "internalType": "string",
        "name": "_groupName",
        "type": "string"
      }
    ],
    "name": "createGroup",
    "outputs": [
      {
        "internalType": "address",
        "name": "groupAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_groupId",
        "type": "uint256"
      }
    ],
    "name": "getGroup",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalGroups",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
