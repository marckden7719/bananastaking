// Contract addresses + ABIs for the Banana Vault Staking Contract
// Deployed on Monad Mainnet (Chain ID: 143)

export const STAKING_CONTRACT_ADDRESS =
  "0xbb8A0CDeED62D2633E03eCF14c40B0e6d18d29c7" as `0x${string}`;

// Keep legacy alias so existing imports don't break
export const VAULT_ADDRESS = STAKING_CONTRACT_ADDRESS;

// JAMES token address — update when known
export const JAMES_TOKEN_ADDRESS =
  "0x0000000000000000000000000000000000000000" as `0x${string}`;

export const hasContracts = () =>
  STAKING_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Pool constants matching the contract
// ---------------------------------------------------------------------------
export const BANANA_LITE_POOL = 0;
export const BANANA_PLUS_POOL = 1;
export const BANANA_DIAMOND_POOL = 2;

// ---------------------------------------------------------------------------
// Full staking contract ABI
// ---------------------------------------------------------------------------
export const vaultAbi = [
  // ---- Read: Protocol-level ----
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "rewardToken",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "vaultWallet",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "emergencyMode",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "rewardMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "activeStakeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalProtocolPendingRewards",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "vaultCoverage",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "protocolHealth",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "protocolSummary",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalUsers", type: "uint256" },
      { name: "activeStakes", type: "uint256" },
      { name: "totalMonStaked", type: "uint256" },
      { name: "rewardsReserved", type: "uint256" },
      { name: "rewardsDistributed", type: "uint256" },
      { name: "burnedPenalty", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getDashboardStats",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalActiveStakes", type: "uint256" },
      { name: "totalUsers", type: "uint256" },
      { name: "totalStakedMON", type: "uint256" },
      { name: "totalRewardsReserved", type: "uint256" },
      { name: "totalRewardsDistributed", type: "uint256" },
      { name: "totalBurnedPenalty", type: "uint256" },
      { name: "vaultBalance", type: "uint256" },
      { name: "vaultAllowance", type: "uint256" },
      { name: "vaultCoverage", type: "uint256" },
      { name: "emergencyMode", type: "bool" },
      { name: "paused", type: "bool" },
      { name: "rewardMultiplier", type: "uint256" },
      { name: "minHolding", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "vaultStatus",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "vaultBalance", type: "uint256" },
      { name: "vaultAllowance", type: "uint256" },
      { name: "reservedRewards", type: "uint256" },
      { name: "coverage", type: "uint256" },
      { name: "healthy", type: "bool" },
    ],
  },

  // ---- Read: User-level ----
  {
    type: "function",
    name: "getUserDashboard",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "monBalance", type: "uint256" },
      { name: "jamesBalance", type: "uint256" },
      { name: "currentTier", type: "uint8" },
      { name: "currentBonus", type: "uint16" },
      { name: "activeStakeCount", type: "uint256" },
      { name: "pendingRewards", type: "uint256" },
      { name: "totalStaked", type: "uint256" },
      { name: "rewardsEarned", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getUserActiveStakes",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "stakeId", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "reward", type: "uint256" },
          { name: "poolId", type: "uint8" },
          { name: "tier", type: "uint8" },
          { name: "startTime", type: "uint40" },
          { name: "unlockTime", type: "uint40" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getStake",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "stakeId", type: "uint256" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "reward", type: "uint256" },
      { name: "startTime", type: "uint40" },
      { name: "unlockTime", type: "uint40" },
      { name: "holderTier", type: "uint8" },
      { name: "claimed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "activeStakeIds",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "requiredBurnAmount",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "stakeId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "calculateReward",
    stateMutability: "view",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "poolId", type: "uint8" },
    ],
    outputs: [
      { name: "baseReward", type: "uint256" },
      { name: "tierBonus", type: "uint256" },
      { name: "finalReward", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "isEligibleForStaking",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "eligible", type: "bool" },
      { name: "requiredHolding", type: "uint256" },
      { name: "currentBalance", type: "uint256" },
      { name: "reason", type: "string" },
    ],
  },

  // ---- Legacy aliases kept for backward-compat ----
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
    name: "tierOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "bonusOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "coverage",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "totalStaked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "rewardsReserved",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "distributed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "activeStakes",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ---- Write ----
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

  // ---- Events ----
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "stakeId", type: "uint256", indexed: true },
      { name: "poolId", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "stakeId", type: "uint256", indexed: true },
      { name: "reward", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EmergencyModeToggled",
    inputs: [{ name: "enabled", type: "bool", indexed: false }],
  },
] as const;

// ---------------------------------------------------------------------------
// Minimal ERC-20 ABI for JAMES token
// ---------------------------------------------------------------------------
export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
