// Contract addresses + ABIs for the Banana Vault.
// Replace ZERO addresses with the real deployed Monad Mainnet addresses.

export const VAULT_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;
export const JAMES_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const hasContracts = () =>
  VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000";

// Minimal ABI matching the assumed view + write surface.
// Adjust signatures to match the deployed contract before going live.
export const vaultAbi = [
  { type: "function", name: "tierOf", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint8" }] },
  { type: "function", name: "bonusOf", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint16" }] },
  { type: "function", name: "coverage", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint16" }] },
  { type: "function", name: "totalStaked", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "rewardsReserved", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "distributed", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "activeStakes", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  {
    type: "function",
    name: "previewReward",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "poolId", type: "uint8" },
    ],
    outputs: [
      { name: "base", type: "uint256" },
      { name: "bonus", type: "uint256" },
      { name: "total", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "payable",
    inputs: [{ name: "poolId", type: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "earlyClaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8" }] },
] as const;