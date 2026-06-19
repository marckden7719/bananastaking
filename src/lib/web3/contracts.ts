// Contract addresses + ABIs for James Universal Staking V3
// Deployed on Monad Mainnet (Chain ID: 143)

export const STAKING_CONTRACT_ADDRESS =
  "0x60c80270dCceE8Aa6C36aea35BfE4172a05a7777" as `0x${string}`;

// Keep legacy alias so existing imports don't break
export const VAULT_ADDRESS = STAKING_CONTRACT_ADDRESS;

// JAMES token address
export const JAMES_TOKEN_ADDRESS =
  "0x60c80270dCceE8Aa6C36aea35BfE4172a05a7777" as `0x${string}`;

export const hasContracts = () =>
  STAKING_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// James Universal Staking V3 ABI
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
    name: "protocolSummary",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalStakes", type: "uint256" },
      { name: "reservedMon", type: "uint256" },
      { name: "treasuryBalance", type: "uint256" },
      { name: "availableMon", type: "uint256" },
      { name: "emergencyMode", type: "bool" },
      { name: "refundMode", type: "bool" },
      { name: "paused", type: "bool" },
    ],
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
    name: "getEmergencyStatus",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "emergencyMode", type: "bool" },
      { name: "refundMode", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getAllPools",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "name", type: "string" },
          { name: "lockDuration", type: "uint256" },
          { name: "rewardPercent", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getStakeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ---- Read: User-level ----
  {
    type: "function",
    name: "isEligibleForStaking",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "eligible", type: "bool" },
      { name: "jamesBalance", type: "uint256" },
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
          { name: "token", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "poolId", type: "uint256" },
          { name: "rewardMon", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "unlockTime", type: "uint256" },
          { name: "status", type: "uint8" },
          { name: "snapshotValueMon", type: "uint256" },
          { name: "stakeFee", type: "uint256" },
          { name: "effectiveValueMon", type: "uint256" },
          { name: "snapshotJamesBalance", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [
      { name: "reward", type: "uint256" },
      { name: "unlocked", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "previewEarlyExitPenalty",
    stateMutability: "view",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [
      { name: "jamesBurnPenalty", type: "uint256" },
      { name: "userCanAfford", type: "bool" },
    ],
  },

  // ---- Read: Token-level ----
  {
    type: "function",
    name: "getCurrentTokenValue",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "valueMon", type: "uint256" }],
  },
  {
    type: "function",
    name: "previewStake",
    stateMutability: "view",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "poolId", type: "uint256" },
    ],
    outputs: [
      { name: "snapshotValue", type: "uint256" },
      { name: "rewardMon", type: "uint256" },
      { name: "treasuryCanAfford", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isTokenGraduated",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "graduated", type: "bool" },
      { name: "migrated", type: "bool" },
      { name: "nonGraduated", type: "bool" },
      { name: "bondingCurve", type: "bool" },
    ],
  },

  // ---- Write: User ----
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "poolId", type: "uint256" },
    ],
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
    name: "earlyUnstake",
    stateMutability: "nonpayable",
    inputs: [{ name: "stakeId", type: "uint256" }],
    outputs: [],
  },

  // ---- Write: Admin ----
  {
    type: "function",
    name: "fundRewards",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "unpause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "enableEmergencyMode",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "disableEmergencyMode",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "enableEmergencyRefundMode",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "disableEmergencyRefundMode",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setPool",
    stateMutability: "nonpayable",
    inputs: [
      { name: "poolId", type: "uint256" },
      { name: "name", type: "string" },
      { name: "duration", type: "uint256" },
      { name: "rewardPercentage", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setFeeRecipient",
    stateMutability: "nonpayable",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "setJamesToken",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawSurplusMON",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // ---- Events ----
  {
    type: "event",
    name: "Staked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "stakeId", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "poolId", type: "uint256", indexed: false },
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
    name: "RewardsFunded",
    inputs: [
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EmergencyModeToggled",
    inputs: [
      { name: "enabled", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "EmergencyRefundModeEnabled",
    inputs: [],
  },
  {
    type: "event",
    name: "EmergencyRefundModeDisabled",
    inputs: [],
  },
] as const;

// ---------------------------------------------------------------------------
// Minimal ERC-20 ABI
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
    name: "name",
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
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
