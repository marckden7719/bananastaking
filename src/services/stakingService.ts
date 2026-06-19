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
import { parseEther, formatEther, formatUnits } from "viem";
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
  totalStakes: bigint;
  reservedMon: bigint;
  treasuryBalance: bigint;
  availableMon: bigint;
  emergencyMode: boolean;
  refundMode: boolean;
  paused: boolean;
}

export interface Pool {
  poolId: bigint;
  name: string;
  duration: bigint;
  rewardPercentage: bigint;
  active: boolean;
}

export interface ActiveStake {
  stakeId: bigint;
  token: Address;
  amount: bigint;
  poolId: bigint;
  rewardMon: bigint;
  startTime: bigint;
  unlockTime: bigint;
  status: number;
  snapshotValueMon: bigint;
  stakeFee: bigint;
  effectiveValueMon: bigint;
  snapshotJamesBalance: bigint;
}

export interface Eligibility {
  eligible: boolean;
  jamesBalance: bigint;
}

export interface PendingReward {
  reward: bigint;
  unlocked: boolean;
}

export interface EarlyExitPenalty {
  jamesBurnPenalty: bigint;
  userCanAfford: boolean;
}

export interface StakePreview {
  snapshotValue: bigint;
  rewardMon: bigint;
  treasuryCanAfford: boolean;
}

export interface TokenStatus {
  graduated: boolean;
  migrated: boolean;
  nonGraduated: boolean;
  bondingCurve: boolean;
}

export interface EmergencyStatus {
  emergencyMode: boolean;
  refundMode: boolean;
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
      totalStakes: result[0],
      reservedMon: result[1],
      treasuryBalance: result[2],
      availableMon: result[3],
      emergencyMode: result[4],
      refundMode: result[5],
      paused: result[6],
    };
  } catch (err) {
    console.error("[stakingService] protocolSummary failed:", err);
    return null;
  }
}

export async function getVaultCoverage(): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "vaultCoverage",
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] vaultCoverage failed:", err);
    return 0n;
  }
}

export async function getEmergencyStatus(): Promise<EmergencyStatus | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getEmergencyStatus",
    });
    return {
      emergencyMode: result[0],
      refundMode: result[1],
    };
  } catch (err) {
    console.error("[stakingService] getEmergencyStatus failed:", err);
    return null;
  }
}

export async function getAllPools(): Promise<Pool[]> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getAllPools",
    });
    // Contract returns PoolConfig[] where each element is:
    // { name: string, lockDuration: uint256, rewardPercent: uint256, active: bool }
    // poolId is the array index
    const rawPools = result as unknown as readonly { name: string; lockDuration: bigint; rewardPercent: bigint; active: boolean }[];
    return rawPools.map((p, index) => ({
      poolId: BigInt(index),
      name: p.name,
      duration: p.lockDuration,
      rewardPercentage: p.rewardPercent,
      active: p.active,
    }));
  } catch (err) {
    console.error("[stakingService] getAllPools failed:", err);
    return DEFAULT_POOLS;
  }
}

export async function getStakeCount(): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getStakeCount",
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] getStakeCount failed:", err);
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// Read: User-level
// ---------------------------------------------------------------------------

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
      jamesBalance: result[1],
    };
  } catch (err) {
    console.error("[stakingService] isEligibleForStaking failed:", err);
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
      const t = s as readonly [
        bigint,
        Address,
        bigint,
        bigint,
        bigint,
        bigint,
        bigint,
        number,
        bigint,
        bigint,
        bigint,
        bigint
      ];
      return {
        stakeId: t[0],
        token: t[1],
        amount: t[2],
        poolId: t[3],
        rewardMon: t[4],
        startTime: t[5],
        unlockTime: t[6],
        status: t[7],
        snapshotValueMon: t[8],
        stakeFee: t[9],
        effectiveValueMon: t[10],
        snapshotJamesBalance: t[11],
      };
    });
  } catch (err) {
    console.error("[stakingService] getUserActiveStakes failed:", err);
    return [];
  }
}

export async function getPendingReward(stakeId: bigint): Promise<PendingReward | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "pendingReward",
      args: [stakeId],
    });
    return {
      reward: result[0],
      unlocked: result[1],
    };
  } catch (err) {
    console.error("[stakingService] pendingReward failed:", err);
    return null;
  }
}

export async function previewEarlyExitPenalty(stakeId: bigint): Promise<EarlyExitPenalty | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "previewEarlyExitPenalty",
      args: [stakeId],
    });
    return {
      jamesBurnPenalty: result[0],
      userCanAfford: result[1],
    };
  } catch (err) {
    console.error("[stakingService] previewEarlyExitPenalty failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read: Token-level
// ---------------------------------------------------------------------------

export async function getCurrentTokenValue(token: Address, amount: bigint): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "getCurrentTokenValue",
      args: [token, amount],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] getCurrentTokenValue failed:", err);
    return 0n;
  }
}

export async function previewStake(token: Address, amount: bigint, poolId: bigint): Promise<StakePreview | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "previewStake",
      args: [token, amount, poolId],
    });
    return {
      snapshotValue: result[0],
      rewardMon: result[1],
      treasuryCanAfford: result[2],
    };
  } catch (err) {
    console.error("[stakingService] previewStake failed:", err);
    return null;
  }
}

export async function isTokenGraduated(token: Address): Promise<TokenStatus | null> {
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_CONTRACT_ADDRESS,
      abi: vaultAbi,
      functionName: "isTokenGraduated",
      args: [token],
    });
    return {
      graduated: result[0],
      migrated: result[1],
      nonGraduated: result[2],
      bondingCurve: result[3],
    };
  } catch (err) {
    console.error("[stakingService] isTokenGraduated failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Read: ERC20
// ---------------------------------------------------------------------------

export async function getTokenDecimals(token: Address): Promise<number> {
  try {
    const result = await readContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "decimals",
    });
    return Number(result);
  } catch (err) {
    console.error("[stakingService] getTokenDecimals failed:", err);
    return 18;
  }
}

export async function getTokenSymbol(token: Address): Promise<string> {
  try {
    const result = await readContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "symbol",
    });
    return result as string;
  } catch (err) {
    console.error("[stakingService] getTokenSymbol failed:", err);
    return "UNKNOWN";
  }
}

export async function getTokenName(token: Address): Promise<string> {
  try {
    const result = await readContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "name",
    });
    return result as string;
  } catch (err) {
    console.error("[stakingService] getTokenName failed:", err);
    return "Unknown Token";
  }
}

export async function getTokenBalance(token: Address, user: Address): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [user],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] getTokenBalance failed:", err);
    return 0n;
  }
}

export async function getTokenAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
  try {
    const result = await readContract(wagmiConfig, {
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender],
    });
    return result as bigint;
  } catch (err) {
    console.error("[stakingService] getTokenAllowance failed:", err);
    return 0n;
  }
}

// ---------------------------------------------------------------------------
// Write: Approve
// ---------------------------------------------------------------------------

export async function approveToken(token: Address, spender: Address, amount: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

// ---------------------------------------------------------------------------
// Write: Stake
// ---------------------------------------------------------------------------

export async function stake(token: Address, amount: bigint, poolId: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "stake",
    args: [token, amount, poolId],
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
// Write: Early Unstake
// ---------------------------------------------------------------------------

export async function earlyUnstake(stakeId: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "earlyUnstake",
    args: [stakeId],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

// ---------------------------------------------------------------------------
// Write: Admin
// ---------------------------------------------------------------------------

export async function fundRewards(amount: string) {
  const amountWei = parseEther(amount);
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "fundRewards",
    value: amountWei,
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function pauseContract() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "pause",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function unpauseContract() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "unpause",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function enableEmergencyMode() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "enableEmergencyMode",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function disableEmergencyMode() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "disableEmergencyMode",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function enableEmergencyRefundMode() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "enableEmergencyRefundMode",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function disableEmergencyRefundMode() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "disableEmergencyRefundMode",
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function setPool(poolId: bigint, name: string, duration: bigint, rewardPercentage: bigint, status: number) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "setPool",
    args: [poolId, name, duration, rewardPercentage, status],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function setFeeRecipient(recipient: Address) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "setFeeRecipient",
    args: [recipient],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function setJamesToken(token: Address) {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "setJamesToken",
    args: [token],
  });
  const hash = await writeContract(wagmiConfig, request);
  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
  return { hash, receipt };
}

export async function withdrawSurplusMON() {
  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "withdrawSurplusMON",
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

// ---------------------------------------------------------------------------
// Coverage formatting
// ---------------------------------------------------------------------------

/**
 * MaxUint256 — the contract returns this when reserved rewards are zero,
 * meaning the vault has effectively infinite coverage.
 */
const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

/**
 * Format the raw vaultCoverage() return value for display.
 *
 * The contract returns:
 *   - type(uint256).max when reserved rewards == 0  → "Infinite"
 *   - a percentage scaled by 1e18 otherwise         → "123.45%"
 *
 * Never renders raw BigInt values.
 */
export function formatCoverage(raw: bigint): string {
  if (raw === MAX_UINT256 || raw >= MAX_UINT256) {
    return "Infinite";
  }
  // Coverage is scaled by 1e18 — convert to percentage
  const formatted = formatUnits(raw, 18);
  const num = Number(formatted);
  if (!Number.isFinite(num)) return "Infinite";
  return `${num.toFixed(2)}%`;
}

/**
 * Determine coverage status label and color class from raw value.
 * Returns null status when coverage is infinite (no risk).
 */
export function getCoverageStatus(raw: bigint): {
  label: string;
  colorClass: string;
} {
  if (raw === MAX_UINT256 || raw >= MAX_UINT256) {
    return { label: "Infinite", colorClass: "text-green-600" };
  }
  const formatted = formatUnits(raw, 18);
  const pct = Number(formatted);
  if (!Number.isFinite(pct) || pct >= 150) {
    return { label: "Healthy", colorClass: "text-green-600" };
  }
  if (pct >= 110) return { label: "Warning", colorClass: "text-yellow-600" };
  if (pct >= 100) return { label: "Critical", colorClass: "text-orange-600" };
  return { label: "Danger", colorClass: "text-red-600" };
}

export const MIN_JAMES_REQUIRED = 1000000n; // 1,000,000 JAMES

// ---------------------------------------------------------------------------
// Safe BigInt utilities
// ---------------------------------------------------------------------------

const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Safely convert a bigint to a JavaScript number.
 * Throws if the value exceeds Number.MAX_SAFE_INTEGER (9007199254740991).
 */
export function safeBigIntToNumber(value: bigint): number {
  if (value > MAX_SAFE_BIGINT) {
    throw new Error(
      `BigInt exceeds JS safe integer range: ${value.toString()}`
    );
  }
  return Number(value);
}

/**
 * Default pools used as fallback when getAllPools() fails.
 * These match the standard James Universal Staking V3 pool configuration.
 */
export const DEFAULT_POOLS: Pool[] = [
  { poolId: 0n, name: "Lite", duration: 604800n, rewardPercentage: 30n, active: true },
  { poolId: 1n, name: "Plus", duration: 1209600n, rewardPercentage: 60n, active: true },
  { poolId: 2n, name: "Diamond", duration: 2592000n, rewardPercentage: 120n, active: true },
];
