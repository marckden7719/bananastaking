// ---------------------------------------------------------------------------
// Staking Service — all contract interactions via wagmi/viem
// ---------------------------------------------------------------------------
import {
  readContract,
  readContracts,
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { parseEther, formatEther } from "viem";
import { wagmiConfig } from "@/lib/web3/config";
import {
  STAKING_CONTRACT_ADDRESS,
  JAMES_TOKEN_ADDRESS,
  vaultAbi,
  erc20Abi,
} from "@/lib/web3/contracts";
import type { Address } from "viem";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProtocolSummary {
  totalUsers: bigint;
  activeStakes: bigint;
  totalMonStaked: bigint;
  rewardsReserved: bigint;
  rewardsDistributed: bigint;
  burnedPenalty: bigint;
}

export interface DashboardStats {
  totalActiveStakes: bigint;
  totalUsers: bigint;
  totalStakedMON: bigint;
  totalRewardsReserved: bigint;
  totalRewardsDistributed: bigint;
  totalBurnedPenalty: bigint;
  vaultBalance: bigint;
  vaultAllowance: bigint;
  vaultCoverage: bigint;
  emergencyMode: boolean;
  paused: boolean;
  rewardMultiplier: bigint;
  minHolding: bigint;
}

export interface VaultStatus {
  vaultBalance: bigint;
  vaultAllowance: bigint;
  reservedRewards: bigint;
  coverage: bigint;
  healthy: boolean;
}

export interface UserDashboard {
  monBalance: bigint;
  jamesBalance: bigint;
  currentTier: number;
  currentBonus: number;
  activeStakeCount: bigint;
  pendingRewards: bigint;
  totalStaked: bigint;
  rewardsEarned: bigint;
}

export interface StakeDetail {
  amount: bigint;
  reward: bigint;
  startTime: number;
  unlockTime: number;
  holderTier: number;
  claimed: boolean;
}

export interface ActiveStake {
  stakeId: bigint;
  amount: bigint;
  reward: bigint;
  poolId: number;
  tier: number;
  startTime: number;
  unlockTime: number;
  status: number; // 0=active, 1=claimed, 2=burned
}

export interface RewardCalculation {
  baseReward: bigint;
  tierBonus: bigint;
  finalReward: bigint;
}

export interface Eligibility {
  eligible: boolean;
  requiredHolding: bigint;
  currentBalance: bigint;
  reason: string;
}

// ---------------------------------------------------------------------------
// Read: Protocol-level
// ---------------------------------------------------------------------------

export async function getProtocolSummary(): Promise<ProtocolSummary | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "protocolSummary",
    });
    return {
      totalUsers: result[0],
      activeStakes: result[1],
      totalMonStaked: result[2],
      rewardsReserved: result[3],
      rewardsDistributed: result[4],
      burnedPenalty: result[5],
    };
  } catch (err) {
    console.error("[stakingService] protocolSummary failed:", err);
    return null;
  }
}

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getDashboardStats",
    });
    return {
      totalActiveStakes: result[0],
      totalUsers: result[1],
      totalStakedMON: result[2],
      totalRewardsReserved: result[3],
      totalRewardsDistributed: result[4],
      totalBurnedPenalty: result[5],
      vaultBalance: result[6],
      vaultAllowance: result[7],
      vaultCoverage: result[8],
      emergencyMode: result[9],
      paused: result[10],
      rewardMultiplier: result[11],
      minHolding: result[12],
    };
  } catch (err) {
    console.error("[stakingService] getDashboardStats failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read: Vault status
// ---------------------------------------------------------------------------

export async function getVaultStatus(): Promise<VaultStatus | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "vaultStatus",
    });
    return {
      vaultBalance: result[0],
      vaultAllowance: result[1],
      reservedRewards: result[2],
      coverage: result[3],
      healthy: result[4],
    };
  } catch (err) {
    console.error("[stakingService] vaultStatus failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read: User-level
// ---------------------------------------------------------------------------

export async function getUserDashboard(
  user: Address
): Promise<UserDashboard | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getUserDashboard",
      args: [user],
    });
    return {
      monBalance: result[0],
      jamesBalance: result[1],
      currentTier: result[2],
      currentBonus: result[3],
      activeStakeCount: result[4],
      pendingRewards: result[5],
      totalStaked: result[6],
      rewardsEarned: result[7],
    };
  } catch (err) {
    console.error("[stakingService] getUserDashboard failed:", err);
    return null;
  }
}

export async function getUserActiveStakes(
  user: Address
): Promise<ActiveStake[]> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getUserActiveStakes",
      args: [user],
    });
    return (result as readonly unknown[]).map((s) => {
      const t = s as readonly [bigint, bigint, bigint, number, number, number, number, number];
      return {
        stakeId: t[0],
        amount: t[1],
        reward: t[2],
        poolId: t[3],
        tier: t[4],
        startTime: t[5],
        unlockTime: t[6],
        status: t[7],
      };
    });
  } catch (err) {
    console.error("[stakingService] getUserActiveStakes failed:", err);
    return [];
  }
}

export async function getStake(
  user: Address,
  stakeId: bigint
): Promise<StakeDetail | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getStake",
      args: [user, stakeId],
    });
    return {
      amount: result[0],
      reward: result[1],
      startTime: result[2],
      unlockTime: result[3],
      holderTier: result[4],
      claimed: result[5],
    };
  } catch (err) {
    console.error("[stakingService] getStake failed:", err);
    return null;
  }
}

export async function getActiveStakeIds(user: Address): Promise<bigint[]> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "activeStakeIds",
      args: [user],
    });
    return result as bigint[];
  } catch (err) {
    console.error("[stakingService] activeStakeIds failed:", err);
    return [];
  }
}

export async function getPendingReward(stakeId: bigint): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "pendingReward",
      args: [stakeId],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] pendingReward failed:", err);
    return 0n;
  }
}

export async function getRequiredBurnAmount(
  user: Address,
  stakeId: bigint
): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "requiredBurnAmount",
      args: [user, stakeId],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] requiredBurnAmount failed:", err);
    return 0n;
  }
}

export async function calculateReward(
  amount: bigint,
  poolId: number
): Promise<RewardCalculation | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "calculateReward",
      args: [amount, poolId],
    });
    return {
      baseReward: result[0],
      tierBonus: result[1],
      finalReward: result[2],
    };
  } catch (err) {
    console.error("[stakingService] calculateReward failed:", err);
    return null;
  }
}

export async function checkEligibility(user: Address): Promise<Eligibility | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "isEligibleForStaking",
      args: [user],
    });
    return {
      eligible: result[0],
      requiredHolding: result[1],
      currentBalance: result[2],
      reason: result[3],
    };
  } catch (err) {
    console.error("[stakingService] isEligibleForStaking failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read: JAMES token balance
// ---------------------------------------------------------------------------

export async function getJamesBalance(user: Address): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: JAMES_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [user],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] JAMES balanceOf failed:", err);
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// Write: Stake
// ---------------------------------------------------------------------------

export async function stakeMon(poolId: number, amountMon: string) {
  const amountWei = parseEther(amountMon);
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "stake",
    args: [poolId],
    value: amountWei,
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

// ---------------------------------------------------------------------------
// Write: Claim
// ---------------------------------------------------------------------------

export async function claimReward(stakeId: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "claim",
    args: [stakeId],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

// ---------------------------------------------------------------------------
// Write: Early Claim (with burn penalty)
// ---------------------------------------------------------------------------

export async function earlyClaimReward(stakeId: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "earlyClaim",
    args: [stakeId],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatMon(wei: bigint): string {
  return Number(formatEther(wei)).toFixed(4);
}

export function formatMonExact(wei: bigint): number {
  return Number(formatEther(wei));
}

export const POOLS = [
  { id: 0, name: "Banana Lite", days: 7, apy: 30, emoji: "🍌" },
  { id: 1, name: "Banana Plus", days: 15, apy: 75, emoji: "🍌🍌" },
  { id: 2, name: "Banana Diamond", days: 30, apy: 180, emoji: "👑🍌" },
] as const;

export type PoolConfig = (typeof POOLS)[number];

export function getPoolConfig(poolId: number): PoolConfig | undefined {
  return POOLS.find((p) => p.id === poolId);
}
