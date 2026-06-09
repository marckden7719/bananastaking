import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import logo from "@/assets/logobanana.jpg?url";
import { FloatingBananas } from "@/components/site/FloatingBananas";
import { Counter } from "@/components/site/Counter";
import { monadMainnet } from "@/lib/web3/chain";
import {
  STAKING_CONTRACT_ADDRESS,
  JAMES_TOKEN_ADDRESS,
  vaultAbi,
  erc20Abi,
  hasContracts,
  VAULT_ADDRESS,
  BANANA_LITE_POOL,
  BANANA_PLUS_POOL,
  BANANA_DIAMOND_POOL,
} from "@/lib/web3/contracts";
import {
  POOLS,
  type PoolConfig,
  type ActiveStake,
} from "@/services/stakingService";

export const Route = createFileRoute("/staking")({
  head: () => ({
    meta: [
      { title: "Banana Vault | Stake $JAMES on Monad" },
      {
        name: "description",
        content:
          "Put your bananas to work. Stake MON and unlock rewards while powering the James Banana ecosystem.",
      },
      { property: "og:title", content: "Banana Vault | James Banana Staking" },
      {
        property: "og:description",
        content: "Stake MON. Earn bananas. Power the meme machine.",
      },
      { property: "og:image", content: logo },
    ],
    links: [{ rel: "canonical", href: "/staking" }],
  }),
  component: Staking,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function zeroAddress() {
  return "0x0000000000000000000000000000000000000000" as `0x${string}`;
}

function tierInfo(idx: number) {
  const t = [
    { name: "Bronze", emoji: "🍌", bonus: 0 },
    { name: "Silver", emoji: "🍌🍌", bonus: 10 },
    { name: "Gold", emoji: "🍌🍌🍌", bonus: 25 },
    { name: "Diamond", emoji: "👑🍌", bonus: 50 },
  ];
  return t[Math.min(idx, 3)];
}

function statusLabel(s: number) {
  return s === 0 ? "Active" : s === 1 ? "Claimed" : "Burned";
}

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(unlockTimeSec: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (unlockTimeSec <= now) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [unlockTimeSec, now]);
  const remaining = Math.max(0, unlockTimeSec - now);
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
    isUnlocked: remaining <= 0,
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function Staking() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== monadMainnet.id;
  const userAddr = (address ?? zeroAddress()) as `0x${string}`;
  const live = hasContracts();

  const [pool, setPool] = useState<PoolConfig>(POOLS[1]);
  const [amount, setAmount] = useState("10");
  const [burnOpen, setBurnOpen] = useState<ActiveStake | null>(null);

  const amt = parseFloat(amount) || 0;
  const amtWei = useMemo(() => {
    try { return parseEther((amt || 0).toString()); } catch { return 0n; }
  }, [amt]);

  const { data: nativeBal } = useBalance({
    address,
    chainId: monadMainnet.id,
    query: { enabled: !!address, refetchInterval: 12_000 },
  });

  // ========== BATCHED ON-CHAIN READS ==========
  const reads = useReadContracts({
    allowFailure: true,
    contracts: live
      ? [
          // 0: emergencyMode
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "emergencyMode" },
          // 1: rewardMultiplier
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "rewardMultiplier" },
          // 2: activeStakeCount
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "activeStakeCount" },
          // 3: totalProtocolPendingRewards
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "totalProtocolPendingRewards" },
          // 4: vaultCoverage
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "vaultCoverage" },
          // 5: protocolHealth
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "protocolHealth" },
          // 6: protocolSummary
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "protocolSummary" },
          // 7: getDashboardStats
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getDashboardStats" },
          // 8: vaultStatus
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "vaultStatus" },
          // 9: getUserDashboard
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getUserDashboard", args: [userAddr] },
          // 10: isEligibleForStaking
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "isEligibleForStaking", args: [userAddr] },
          // 11: calculateReward
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "calculateReward", args: [amtWei, pool.id] },
          // 12: getUserActiveStakes
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getUserActiveStakes", args: [userAddr] },
          // 13: JAMES balanceOf
          { address: JAMES_TOKEN_ADDRESS, abi: erc20Abi, functionName: "balanceOf", args: [userAddr] },
          // 14: vaultWallet
          { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "vaultWallet" },
        ]
      : [],
    query: { enabled: live, refetchInterval: 15_000 },
  });

  const r = reads.data;

  // ---- Parse results ----
  const emergencyMode = (r?.[0]?.result as boolean | undefined) ?? false;
  const rewardMultiplier = (r?.[1]?.result as bigint | undefined) ?? 100n;
  const contractActiveStakeCount = (r?.[2]?.result as bigint | undefined) ?? 0n;
  const pendingRewardsTotal = (r?.[3]?.result as bigint | undefined) ?? 0n;
  const vaultCoverageRaw = (r?.[4]?.result as bigint | undefined) ?? 0n;
  const protocolHealthRaw = (r?.[5]?.result as bigint | undefined) ?? 0n;

  // protocolSummary: [totalUsers, activeStakes, totalMonStaked, rewardsReserved, rewardsDistributed, burnedPenalty]
  const psRaw = (r?.[6]?.result ?? undefined) as readonly bigint[] | undefined;
  const psTotalUsers = psRaw?.[0] ?? 0n;
  const psActiveStakes = psRaw?.[1] ?? 0n;
  const psTotalMonStaked = psRaw?.[2] ?? 0n;
  const psRewardsReserved = psRaw?.[3] ?? 0n;
  const psRewardsDistributed = psRaw?.[4] ?? 0n;
  const psBurnedPenalty = psRaw?.[5] ?? 0n;

  // getDashboardStats: [totalActiveStakes, totalUsers, totalStakedMON, totalRewardsReserved, totalRewardsDistributed, totalBurnedPenalty, vaultBalance, vaultAllowance, vaultCoverage, emergencyMode, paused, rewardMultiplier, minHolding]
  const dsRaw = (r?.[7]?.result ?? undefined) as readonly (bigint | boolean)[] | undefined;
  const dsTotalActiveStakes = (dsRaw?.[0] as bigint) ?? 0n;
  const dsTotalUsers = (dsRaw?.[1] as bigint) ?? 0n;
  const dsTotalStakedMON = (dsRaw?.[2] as bigint) ?? 0n;
  const dsTotalRewardsReserved = (dsRaw?.[3] as bigint) ?? 0n;
  const dsTotalRewardsDistributed = (dsRaw?.[4] as bigint) ?? 0n;
  const dsTotalBurnedPenalty = (dsRaw?.[5] as bigint) ?? 0n;
  const dsVaultBalance = (dsRaw?.[6] as bigint) ?? 0n;
  const dsVaultAllowance = (dsRaw?.[7] as bigint) ?? 0n;
  const dsVaultCoverage = (dsRaw?.[8] as bigint) ?? 0n;
  const dsEmergencyMode = (dsRaw?.[9] as boolean) ?? false;
  const dsPaused = (dsRaw?.[10] as boolean) ?? false;
  const dsRewardMultiplier = (dsRaw?.[11] as bigint) ?? 100n;
  const dsMinHolding = (dsRaw?.[12] as bigint) ?? 0n;

  // vaultStatus: [vaultBalance, vaultAllowance, reservedRewards, coverage, healthy]
  const vsRaw = (r?.[8]?.result ?? undefined) as readonly (bigint | boolean)[] | undefined;
  const vsVaultBalance = (vsRaw?.[0] as bigint) ?? dsVaultBalance;
  const vsVaultAllowance = (vsRaw?.[1] as bigint) ?? dsVaultAllowance;
  const vsReservedRewards = (vsRaw?.[2] as bigint) ?? psRewardsReserved;
  const vsCoverage = (vsRaw?.[3] as bigint) ?? vaultCoverageRaw;
  const vsHealthy = (vsRaw?.[4] as boolean) ?? true;

  // getUserDashboard: [monBalance, jamesBalance, currentTier, currentBonus, activeStakeCount, pendingRewards, totalStaked, rewardsEarned]
  const udRaw = (r?.[9]?.result ?? undefined) as readonly bigint[] | undefined;
  const userMonBalance = udRaw?.[0] ?? 0n;
  const userJamesBalance = udRaw?.[1] ?? 0n;
  const userTier = Number(udRaw?.[2] ?? 0n);
  const userBonusBps = Number(udRaw?.[3] ?? 0n);
  const userStakeCount = udRaw?.[4] ?? 0n;
  const userPendingRewards = udRaw?.[5] ?? 0n;
  const userTotalStaked = udRaw?.[6] ?? 0n;
  const userRewardsEarned = udRaw?.[7] ?? 0n;

  // isEligibleForStaking: [eligible, requiredHolding, currentBalance, reason]
  const elRaw = (r?.[10]?.result ?? undefined) as readonly (bigint | boolean | string)[] | undefined;
  const eligible = (elRaw?.[0] as boolean) ?? true;
  const requiredHolding = (elRaw?.[1] as bigint) ?? 0n;
  const currentHolding = (elRaw?.[2] as bigint) ?? 0n;
  const eligibilityReason = (elRaw?.[3] as string) ?? "";

  // calculateReward: [baseReward, tierBonus, finalReward]
  const crRaw = (r?.[11]?.result ?? undefined) as readonly bigint[] | undefined;
  const crBase = crRaw && live && amt > 0 ? crRaw[0] : null;
  const crBonus = crRaw && live && amt > 0 ? crRaw[1] : null;
  const crFinal = crRaw && live && amt > 0 ? crRaw[2] : null;

  // getUserActiveStakes
  const rawStakes = (r?.[12]?.result ?? undefined) as readonly unknown[] | undefined;
  const userActiveStakes: ActiveStake[] = useMemo(() => {
    if (!rawStakes || !live) return [];
    return rawStakes.map((s) => {
      const t = s as readonly [bigint, bigint, bigint, number, number, number, number, number];
      return { stakeId: t[0], amount: t[1], reward: t[2], poolId: t[3], tier: t[4], startTime: t[5], unlockTime: t[6], status: t[7] };
    });
  }, [rawStakes, live]);

  const jamesBal = (r?.[13]?.result as bigint | undefined) ?? userJamesBalance;
  const vaultWallet = (r?.[14]?.result as string | undefined) ?? zeroAddress();

  // ---- Derived ----
  const tier = tierInfo(userTier);
  const coverage = Number(vsCoverage) / 100;
  const protocolHealth = Number(protocolHealthRaw) / 100;

  const baseRewardDisplay =
    crBase !== null && live ? Number(formatEther(crBase)).toFixed(4)
      : amt > 0 ? ((amt * pool.apy * pool.days) / 365 / 100).toFixed(4) : "0.0000";
  const bonusRewardDisplay =
    crBonus !== null && live ? Number(formatEther(crBonus)).toFixed(4)
      : amt > 0 ? (((amt * pool.apy * pool.days) / 365 / 100) * (tier.bonus / 100)).toFixed(4) : "0.0000";
  const finalRewardDisplay =
    crFinal !== null && live ? Number(formatEther(crFinal)).toFixed(4)
      : amt > 0 ? (((amt * pool.apy * pool.days) / 365 / 100) * (1 + tier.bonus / 100)).toFixed(4) : "0.0000";

  // ========== WRITES ==========
  const { writeContract, data: txHash, isPending: writing, reset: resetWrite } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (confirmed) {
      toast.success("Transaction confirmed");
      reads.refetch();
      resetWrite();
    }
  }, [confirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  function doSwitch() { switchChain({ chainId: monadMainnet.id }); }

  const stake = useCallback(() => {
    if (!isConnected) return toast.error("Connect wallet first");
    if (wrongNetwork) return toast.error("Switch to Monad Mainnet");
    if (amt <= 0) return toast.error("Enter an amount");
    if (!live) return toast.error("Contract not deployed on this network");
    if (emergencyMode || dsEmergencyMode) return toast.error("Emergency mode active — staking disabled");
    if (dsPaused) return toast.error("Contract paused — staking disabled");
    if (!eligible) return toast.error(`Not eligible: ${eligibilityReason}`);
    toast("Confirm the transaction in your wallet…");
    writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "stake", args: [pool.id], value: amtWei, chainId: monadMainnet.id });
  }, [isConnected, wrongNetwork, amt, live, emergencyMode, dsEmergencyMode, dsPaused, eligible, eligibilityReason, pool.id, amtWei, writeContract]);

  const claim = useCallback((stakeId: bigint, isEarly: boolean) => {
    if (!live) return toast.error("Contract not deployed on this network");
    setBurnOpen(null);
    if (isEarly) {
      toast("Confirm early claim in your wallet…");
      writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "earlyClaim", args: [stakeId], chainId: monadMainnet.id });
    } else {
      toast("Confirm claim in your wallet…");
      writeContract({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "claim", args: [stakeId], chainId: monadMainnet.id });
    }
  }, [live, writeContract]);

  const addressShort = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Not connected";

  // ========== RENDER ==========
  return (
    <>
      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-[36px] bg-banana-gradient p-8 md:p-12 shadow-pop border-4 border-white">
          <FloatingBananas count={14} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold">STAKING DAPP · MONAD</span>
              <h1 className="mt-3 font-display text-5xl md:text-7xl font-extrabold">Banana Vault</h1>
              <p className="mt-3 text-xl md:text-2xl font-extrabold">Put Your Bananas To Work</p>
              <p className="mt-2 max-w-lg text-base md:text-lg font-semibold text-foreground/80">
                Stake MON and unlock rewards while helping power the James Banana ecosystem.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <appkit-button label="Connect Wallet" balance="hide" />
                {isConnected && <appkit-network-button />}
                <a href="#pools" className="rounded-full bg-white px-6 py-3 font-extrabold shadow-cute border-2 border-foreground hover:scale-105 transition">View Pools</a>
              </div>
            </div>
            <div className="relative flex justify-center">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity }} className="relative">
                <div className="absolute inset-0 rounded-[40px] bg-white blur-2xl opacity-60" />
                <div className="relative rounded-[40px] bg-white border-4 border-foreground shadow-pop p-6 w-72">
                  <div className="text-center text-xs font-extrabold opacity-70">BANANA VAULT</div>
                  <motion.img src={logo} alt="vault" className="mx-auto mt-2 h-32 w-32 rounded-full ring-banana" animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} />
                  <div className="mt-3 text-center font-extrabold text-2xl">
                    {live ? `${Math.round(Number(formatEther(psTotalMonStaked))).toLocaleString()} MON` : "482,910 MON"}
                  </div>
                  <div className="text-center text-xs font-bold opacity-70">staked across protocol</div>
                  <div className="mt-3 flex justify-around text-2xl">
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>🪙</motion.span>
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}>🍌</motion.span>
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}>🪙</motion.span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* EMERGENCY / PAUSED BANNER */}
      {live && (emergencyMode || dsEmergencyMode || dsPaused) && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-red-500 bg-red-50 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-cute">
            <div className="font-extrabold text-lg">
              {dsPaused ? "Contract Paused — All operations temporarily disabled." : "Emergency Mode Active — New staking disabled. Claims remain available."}
            </div>
          </div>
        </section>
      )}

      {/* NETWORK WARNING */}
      {wrongNetwork && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-[color:var(--orange-accent)] bg-[color:var(--banana-cream)] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-cute">
            <div className="font-extrabold text-lg">Please switch to Monad Mainnet to use the vault.</div>
            <button onClick={doSwitch} disabled={switching} className="rounded-full bg-foreground text-[color:var(--banana)] px-5 py-2 font-extrabold shadow-cute disabled:opacity-60">
              {switching ? "Switching…" : "Switch Network"}
            </button>
          </div>
        </section>
      )}

      {/* ELIGIBILITY WARNING */}
      {live && isConnected && !eligible && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-yellow-500 bg-yellow-50 p-5 shadow-cute">
            <div className="font-extrabold text-lg">Not Eligible for Staking</div>
            <div className="text-sm font-semibold mt-1">{eligibilityReason}</div>
            <div className="text-xs font-bold mt-2">
              Required: {Number(formatEther(requiredHolding)).toLocaleString()} $JAMES · Your Balance: {Number(formatEther(currentHolding)).toLocaleString()} $JAMES
            </div>
          </div>
        </section>
      )}

      {/* USER + PROTOCOL DASHBOARD */}
      <section className="mx-auto max-w-7xl px-4 mt-10 grid lg:grid-cols-3 gap-5">
        {/* User Dashboard */}
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
          <div className="flex items-center gap-3">
            <img src={logo} className="h-12 w-12 rounded-full ring-banana" alt="" />
            <div>
              <div className="text-xs font-extrabold opacity-70">CONNECTED WALLET</div>
              <div className="font-extrabold">{addressShort}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Mini label="MON" value={isConnected && live ? Number(formatEther(userMonBalance || nativeBal?.value || 0n)).toFixed(4) : "—"} emoji="🟣" />
            <Mini label="$JAMES" value={isConnected && live ? Number(formatEther(jamesBal)).toLocaleString() : "—"} emoji="🍌" />
            <Mini label="Tier" value={`${tier.emoji} ${tier.name}`} emoji="🏅" />
            <Mini label="Bonus" value={`+${tier.bonus}%`} emoji="✨" />
            <Mini label="My Stakes" value={isConnected && live ? Number(userStakeCount).toString() : "—"} emoji="🎫" />
            <Mini label="Pending" value={isConnected && live ? Number(formatEther(userPendingRewards)).toFixed(4) : "—"} emoji="🪙" />
            <Mini label="Total Staked" value={isConnected && live ? Number(formatEther(userTotalStaked)).toFixed(4) : "—"} emoji="🔒" />
            <Mini label="Earned" value={isConnected && live ? Number(formatEther(userRewardsEarned)).toFixed(4) : "—"} emoji="🎉" />
          </div>
        </div>

        {/* Protocol Dashboard */}
        <div className="lg:col-span-2 rounded-[28px] bg-banana-gradient p-6 shadow-cute border-2 border-white">
          <h3 className="font-extrabold text-2xl">Protocol Dashboard</h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total Users", v: live ? Number(dsTotalUsers) : 7421, s: "" },
              { l: "Active Stakes", v: live ? Number(dsTotalActiveStakes) : 2318, s: "" },
              { l: "MON Staked", v: live ? Math.round(Number(formatEther(dsTotalStakedMON))) : 482910, s: "" },
              { l: "Rewards Reserved", v: live ? Math.round(Number(formatEther(dsTotalRewardsReserved))) : 91220, s: "" },
              { l: "Rewards Distributed", v: live ? Math.round(Number(formatEther(dsTotalRewardsDistributed))) : 38400, s: "" },
              { l: "Burned Penalty", v: live ? Math.round(Number(formatEther(dsTotalBurnedPenalty))) : 1250, s: "" },
              { l: "Coverage", v: live ? Math.round(coverage) : 84, s: "%" },
              { l: "Health", v: live ? Math.round(protocolHealth) : 92, s: "%" },
            ].map((m) => (
              <div key={m.l} className="rounded-2xl bg-white/90 p-3 text-center shadow-cute">
                <div className="text-[10px] font-extrabold opacity-60">{m.l}</div>
                <div className="text-lg font-extrabold"><Counter to={m.v} suffix={m.s} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADVANCED DASHBOARD */}
      {live && (
        <section className="mx-auto max-w-7xl px-4 mt-8">
          <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
            <h3 className="font-extrabold text-2xl">Advanced Dashboard</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Mini label="Min Holding" value={`${Number(formatEther(dsMinHolding)).toLocaleString()} $JAMES`} emoji="📋" />
              <Mini label="Reward Multiplier" value={`${Number(dsRewardMultiplier) / 100}x`} emoji="⚡" />
              <Mini label="Emergency" value={dsEmergencyMode ? "ON" : "Off"} emoji={dsEmergencyMode ? "🔴" : "🟢"} />
              <Mini label="Paused" value={dsPaused ? "Yes" : "No"} emoji={dsPaused ? "⛔" : "🟢"} />
              <Mini label="Vault Balance" value={`${Number(formatEther(dsVaultBalance)).toFixed(2)} MON`} emoji="🏦" />
              <Mini label="Vault Allowance" value={`${Number(formatEther(dsVaultAllowance)).toFixed(2)} MON`} emoji="✅" />
            </div>
          </div>
        </section>
      )}

      {/* VAULT DASHBOARD */}
      {live && (
        <section className="mx-auto max-w-7xl px-4 mt-8">
          <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
            <h3 className="font-extrabold text-2xl">Vault Status</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
              <Mini label="Vault" value={vaultWallet.slice(0, 6) + "…" + vaultWallet.slice(-4)} emoji="🏦" />
              <Mini label="Balance" value={`${Number(formatEther(vsVaultBalance)).toFixed(2)} MON`} emoji="💰" />
              <Mini label="Allowance" value={`${Number(formatEther(vsVaultAllowance)).toFixed(2)} MON`} emoji="✅" />
              <Mini label="Reserved" value={`${Number(formatEther(vsReservedRewards)).toFixed(2)} MON`} emoji="🔒" />
              <Mini label="Healthy" value={vsHealthy ? "Yes" : "No"} emoji={vsHealthy ? "💚" : "🔴"} />
            </div>
          </div>
        </section>
      )}

      {/* TIERS */}
      <section className="mx-auto max-w-7xl px-4 mt-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">Tier System</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n: "Bronze", e: "🍌", b: 0 },
            { n: "Silver", e: "🍌🍌", b: 10 },
            { n: "Gold", e: "🍌🍌🍌", b: 25 },
            { n: "Diamond", e: "👑🍌", b: 50 },
          ].map((t) => (
            <motion.div whileHover={{ y: -6, rotate: -1 }} key={t.n}
              className={`rounded-[24px] p-5 border-2 border-white shadow-cute text-center ${tier.name === t.n ? "bg-banana-gradient ring-banana" : "bg-white"}`}>
              <div className="text-4xl">{t.e}</div>
              <div className="mt-2 font-extrabold text-xl">{t.n}</div>
              <div className="text-sm font-bold opacity-70">+{t.b}% rewards bonus</div>
              {tier.name === t.n && <div className="mt-2 text-xs font-extrabold">YOUR TIER</div>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* POOLS + STAKE FORM */}
      <section id="pools" className="mx-auto max-w-7xl px-4 mt-12 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold">Staking Pools</h2>
          <p className="font-bold text-foreground/70 mt-1">Pick your banana adventure.</p>
          <div className="mt-5 space-y-4">
            {POOLS.map((p) => (
              <motion.button whileHover={{ scale: 1.01 }} key={p.id} onClick={() => setPool(p)}
                disabled={live && (emergencyMode || dsEmergencyMode || dsPaused)}
                className={`w-full text-left rounded-[24px] p-5 border-4 shadow-cute transition ${pool.id === p.id ? "border-foreground" : "border-white"} ${p.id === BANANA_LITE_POOL ? "bg-[color:var(--banana-cream)]" : p.id === BANANA_PLUS_POOL ? "bg-banana-gradient" : "bg-[color:var(--leaf)] text-white"} ${live && (emergencyMode || dsEmergencyMode || dsPaused) ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl">{p.emoji}</div>
                    <div className="font-extrabold text-xl mt-1">{p.name}</div>
                    <div className="text-sm font-bold opacity-80">{p.days} days lock</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold">{p.apy}%</div>
                    <div className="text-xs font-extrabold opacity-80">APY</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-pop">
          <h3 className="font-extrabold text-2xl">Reward Calculator</h3>
          <label className="mt-4 block text-sm font-extrabold opacity-70">Stake amount (MON)</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-[color:var(--banana-cream)] p-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal"
              className="flex-1 bg-transparent px-3 py-2 outline-none font-extrabold text-xl"
              disabled={live && (emergencyMode || dsEmergencyMode || dsPaused)} />
            <button onClick={() => setAmount(nativeBal ? Number(formatEther(nativeBal.value)).toString() : "0")}
              className="rounded-full bg-foreground text-[color:var(--banana)] px-3 py-1.5 text-xs font-extrabold">MAX</button>
          </div>
          <div className="mt-4 space-y-2">
            <Row k="Pool" v={`${pool.emoji} ${pool.name} · ${pool.days}d · ${pool.apy}%`} />
            <Row k="Estimated Reward" v={`${baseRewardDisplay} MON`} />
            <Row k={`Tier Bonus (${tier.name})`} v={`+${bonusRewardDisplay} MON`} />
            <div className="h-px bg-[color:var(--banana)]/40 my-2" />
            <Row k="Final Reward" v={`${finalRewardDisplay} MON`} highlight />
          </div>
          <button onClick={stake} disabled={writing || confirming || (live && (emergencyMode || dsEmergencyMode || dsPaused))}
            className="mt-5 w-full rounded-2xl bg-banana-gradient py-4 font-extrabold text-lg shadow-cute border-2 border-white hover:scale-[1.02] transition disabled:opacity-60">
            {writing ? "Confirm in wallet…" : confirming ? "Confirming…" : live && (emergencyMode || dsEmergencyMode) ? "Emergency Mode" : live && dsPaused ? "Paused" : "Stake Now"}
          </button>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-extrabold">
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Coverage: {Math.round(coverage)}% {coverage > 50 ? "🟢" : "🟠"}</div>
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Bonus: +{tier.bonus}% 🟢</div>
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Emergency: {live && (emergencyMode || dsEmergencyMode) ? "ON 🔴" : "Off 🟢"}</div>
          </div>
        </div>
      </section>

      {/* ACTIVE STAKES */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <h2 className="text-3xl md:text-4xl font-extrabold">Your Banana Certificates</h2>
        {!live ? (
          <div className="mt-6 rounded-[28px] border-4 border-dashed border-[color:var(--banana)] bg-white p-10 text-center font-extrabold text-foreground/60">
            Connect to Monad Mainnet to view your stakes.
          </div>
        ) : userActiveStakes.length === 0 ? (
          <div className="mt-6 rounded-[28px] border-4 border-dashed border-[color:var(--banana)] bg-white p-10 text-center font-extrabold text-foreground/60">
            No stakes yet. Mint your first banana certificate above!
          </div>
        ) : (
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userActiveStakes.map((s) => (
              <StakeCard key={s.stakeId.toString()} stake={s} onClaimEarly={() => setBurnOpen(s)}
                onClaim={() => claim(s.stakeId, false)} />
            ))}
          </div>
        )}
      </section>

      {/* EARLY CLAIM / BURN MODAL */}
      {burnOpen && (
        <EarlyClaimModal stake={burnOpen} userAddr={userAddr} jamesBalance={Number(formatEther(jamesBal))}
          onCancel={() => setBurnOpen(null)} onConfirm={() => claim(burnOpen.stakeId, true)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Mini({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-2xl bg-[color:var(--banana-cream)] p-3">
      <div className="text-[10px] font-extrabold opacity-60">{emoji} {label}</div>
      <div className="font-extrabold">{value}</div>
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-bold opacity-70">{k}</span>
      <span className={`font-extrabold ${highlight ? "text-xl text-[color:var(--orange-accent)]" : ""}`}>{v}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stake Card with live countdown
// ---------------------------------------------------------------------------

function StakeCard({ stake, onClaimEarly, onClaim }: {
  stake: ActiveStake;
  onClaimEarly: () => void;
  onClaim: () => void;
}) {
  const poolCfg = POOLS.find((p) => p.id === stake.poolId) ?? POOLS[0];
  const stakeTier = tierInfo(stake.tier);
  const { days, hours, minutes, seconds, isUnlocked } = useCountdown(stake.unlockTime);

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="rounded-[24px] bg-banana-gradient p-1 shadow-pop">
      <div className="rounded-[20px] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-3xl">{poolCfg.emoji}</div>
          <div className="flex gap-1">
            <span className="rounded-full bg-[color:var(--banana-cream)] px-2 py-0.5 text-[10px] font-extrabold">{stakeTier.emoji} {stakeTier.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${stake.status === 0 ? "bg-green-100 text-green-700" : stake.status === 1 ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-600"}`}>
              {statusLabel(stake.status)}
            </span>
          </div>
        </div>
        <div className="mt-2 font-extrabold text-xl">{poolCfg.name}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Amount</div>
            <div className="font-extrabold">{Number(formatEther(stake.amount))} MON</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Reward</div>
            <div className="font-extrabold">{Number(formatEther(stake.reward)).toFixed(4)} MON</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Start</div>
            <div className="font-extrabold">{new Date(stake.startTime * 1000).toLocaleDateString()}</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Unlock</div>
            <div className="font-extrabold">{new Date(stake.unlockTime * 1000).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Countdown */}
        <div className="mt-3 rounded-xl bg-[color:var(--banana-cream)] p-3">
          <div className="text-[10px] font-extrabold opacity-60 text-center mb-1">
            {isUnlocked ? "UNLOCKED" : "COUNTDOWN"}
          </div>
          {isUnlocked ? (
            <div className="text-center font-extrabold text-green-600">Ready to Claim!</div>
          ) : (
            <div className="grid grid-cols-4 gap-1 text-center">
              <div><div className="font-extrabold text-lg">{String(days).padStart(2, "0")}</div><div className="text-[9px] font-bold opacity-50">DAYS</div></div>
              <div><div className="font-extrabold text-lg">{String(hours).padStart(2, "0")}</div><div className="text-[9px] font-bold opacity-50">HRS</div></div>
              <div><div className="font-extrabold text-lg">{String(minutes).padStart(2, "0")}</div><div className="text-[9px] font-bold opacity-50">MIN</div></div>
              <div><div className="font-extrabold text-lg">{String(seconds).padStart(2, "0")}</div><div className="text-[9px] font-bold opacity-50">SEC</div></div>
            </div>
          )}
        </div>

        {stake.status === 0 && (
          <button onClick={isUnlocked ? onClaim : onClaimEarly}
            className={`mt-3 w-full rounded-xl py-2.5 font-extrabold shadow-cute hover:scale-[1.02] transition ${isUnlocked ? "bg-foreground text-[color:var(--banana)]" : "bg-[color:var(--orange-accent)] text-white"}`}>
            {isUnlocked ? "Claim Reward" : "Early Claim"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Early Claim Modal — reads requiredBurnAmount on-chain
// ---------------------------------------------------------------------------

function EarlyClaimModal({ stake, userAddr, jamesBalance, onCancel, onConfirm }: {
  stake: ActiveStake;
  userAddr: `0x${string}`;
  jamesBalance: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { data: burnAmount } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "requiredBurnAmount",
    args: [userAddr, stake.stakeId],
    query: { enabled: !!stake.stakeId },
  });
  const burnDisplay = burnAmount ? Number(formatEther(burnAmount as bigint)).toLocaleString() : "—";
  const penalty = (Number(formatEther(stake.reward)) * 0.2).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm px-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full rounded-[28px] bg-white p-6 border-4 border-[color:var(--orange-accent)] shadow-pop">
        <div className="text-center text-5xl">Burn Warning</div>
        <h3 className="mt-3 text-2xl font-extrabold text-center">Early Claim Warning</h3>
        <p className="mt-2 text-sm font-semibold text-foreground/80 text-center">
          Claiming before unlock requires a 20% burn penalty. Burned tokens are permanently destroyed.
        </p>
        <div className="mt-4 rounded-2xl bg-[color:var(--banana-cream)] p-4 space-y-2 text-sm">
          <Row k="Required Burn" v={`${burnDisplay} $JAMES`} />
          <Row k="Current Balance" v={`${jamesBalance.toLocaleString()} $JAMES`} />
          <Row k="Penalty" v={`20% of reward (~${penalty} MON)`} />
          <Row k="Burn Address" v="0x000…dEaD" />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-[color:var(--banana-cream)] py-3 font-extrabold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-2xl bg-[color:var(--orange-accent)] text-white py-3 font-extrabold shadow-cute">Confirm Burn</button>
        </div>
      </motion.div>
    </div>
  );
}

export default Staking;
