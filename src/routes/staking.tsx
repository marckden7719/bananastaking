import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
} from "wagmi";
import { formatEther, formatUnits, parseEther, parseUnits, zeroAddress } from "viem";
import logo from "@/assets/logobanana.jpg?url";
import { FloatingBananas } from "@/components/site/FloatingBananas";
import { Counter } from "@/components/site/Counter";
import { monadMainnet } from "@/lib/web3/chain";
import {
  STAKING_CONTRACT_ADDRESS,
  vaultAbi,
  erc20Abi,
} from "@/lib/web3/contracts";
import {
  formatMon,
  formatCoverage,
  getCoverageStatus,
  MIN_JAMES_REQUIRED,
  type Pool,
  type ActiveStake,
} from "@/services/stakingService";
import { fetchTokenMetadata, type TokenMetadata } from "@/services/tokenDiscovery";
import { AdminConfirmationModal } from "@/components/staking/AdminConfirmationModal";
import { PublicStakingActivity } from "@/components/staking/PublicStakingActivity";
import type { Address } from "viem";

export const Route = createFileRoute("/staking")({
  head: () => ({
    meta: [
      { title: "James Universal Staking | Monad" },
      {
        name: "description",
        content: "Stake your tokens and earn MON rewards with James Universal Staking V3.",
      },
      { property: "og:title", content: "James Universal Staking V3" },
      { property: "og:description", content: "Stake tokens, earn MON rewards." },
      { property: "og:image", content: logo },
    ],
    links: [{ rel: "canonical", href: "/staking" }],
  }),
  component: Staking,
});

// ---------------------------------------------------------------------------
// Countdown hook
// ---------------------------------------------------------------------------

function useCountdown(unlockTimeSec: bigint) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const unlockNum = Number(unlockTimeSec);
    if (unlockNum <= now) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [unlockTimeSec, now]);
  const unlockNum = Number(unlockTimeSec);
  const remaining = Math.max(0, unlockNum - now);
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
  const userAddr = (address ?? zeroAddress) as `0x${string}`;

  const [selectedPoolId, setSelectedPoolId] = useState<bigint>(0n);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState<string>("");
  const [selectedStake, setSelectedStake] = useState<ActiveStake | null>(null);
  const [showEarlyUnstakeModal, setShowEarlyUnstakeModal] = useState(false);
  const [step, setStep] = useState<"idle" | "approving" | "staking" | "confirmed">("idle");

  // Admin confirmation modal state
  const [adminAction, setAdminAction] = useState<{
    action: string; description: string; onConfirm: () => void;
  } | null>(null);

  // Token metadata loading state
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(false);
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);

  // ========== MULTICALL: Protocol Dashboard ==========
  const { data: protocolMultiData, refetch: refetchProtocol } = useReadContracts({
    contracts: [
      { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "protocolSummary" },
      { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "vaultCoverage" },
      { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getEmergencyStatus" },
    ],
    query: { refetchInterval: 30_000 },
  });

  const protocolSummary = useMemo(() => {
    if (!protocolMultiData?.[0]?.result) return null;
    const r = protocolMultiData[0].result as readonly [bigint, bigint, bigint, bigint, boolean, boolean, boolean];
    return { totalStakes: r[0], reservedMon: r[1], treasuryBalance: r[2], availableMon: r[3], emergencyMode: r[4], refundMode: r[5], paused: r[6] };
  }, [protocolMultiData]);

  // vaultCoverage: raw bigint from contract
  //   - type(uint256).max when reserved rewards == 0 (infinite coverage)
  //   - percentage scaled by 1e18 otherwise
  const vaultCoverageRaw = protocolMultiData?.[1]?.result
    ? (protocolMultiData[1].result as bigint)
    : 0n;

  // Debug: log raw contract response
  useEffect(() => {
    if (protocolMultiData?.[1]?.result !== undefined) {
      console.log(
        "[staking] vaultCoverage raw:",
        vaultCoverageRaw.toString(),
        vaultCoverageRaw === 0n
          ? "(zero — no coverage data)"
          : vaultCoverageRaw >=
              115792089237316195423570985008687907853269984665640564039457584007913129639935n
            ? "(MaxUint256 — infinite coverage)"
            : "(normal value)",
      );
    }
  }, [vaultCoverageRaw]);

  const coverageDisplay = formatCoverage(vaultCoverageRaw);
  const coverageStatusInfo = getCoverageStatus(vaultCoverageRaw);

  const emergencyStatus = useMemo(() => {
    if (!protocolMultiData?.[2]?.result) return null;
    const r = protocolMultiData[2].result as readonly [boolean, boolean];
    return { emergencyMode: r[0], refundMode: r[1] };
  }, [protocolMultiData]);

  // ========== Pools ==========
  const { data: poolsData, refetch: refetchPools } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getAllPools",
    query: { refetchInterval: 30_000 },
  });

  const pools: Pool[] = useMemo(() => {
    if (!poolsData) return [];
    return (poolsData as readonly unknown[]).map((p) => {
      const t = p as readonly [bigint, string, bigint, bigint, number];
      return { poolId: t[0], name: t[1], duration: t[2], rewardPercentage: t[3], status: t[4] };
    });
  }, [poolsData]);

  // ========== MULTICALL: User Dashboard ==========
  const { data: userMultiData, refetch: refetchUser } = useReadContracts({
    contracts: [
      { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "isEligibleForStaking", args: [userAddr] },
      { address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "getUserActiveStakes", args: [userAddr] },
    ],
    query: { enabled: isConnected, refetchInterval: 30_000 },
  });

  const eligibility = useMemo(() => {
    if (!userMultiData?.[0]?.result) return null;
    const r = userMultiData[0].result as readonly [boolean, bigint];
    return { eligible: r[0], jamesBalance: r[1] };
  }, [userMultiData]);

  const userStakes: ActiveStake[] = useMemo(() => {
    if (!userMultiData?.[1]?.result) return [];
    return (userMultiData[1].result as readonly unknown[]).map((s) => {
      const t = s as readonly [bigint, Address, bigint, bigint, bigint, bigint, bigint, number, bigint, bigint, bigint, bigint];
      return { stakeId: t[0], token: t[1], amount: t[2], poolId: t[3], rewardMon: t[4], startTime: t[5], unlockTime: t[6], status: t[7], snapshotValueMon: t[8], stakeFee: t[9], effectiveValueMon: t[10], snapshotJamesBalance: t[11] };
    });
  }, [userMultiData]);

  // ========== MULTICALL: Token Metadata ==========
  const tokenAddr = tokenAddress as `0x${string}`;
  const isValidTokenAddr = !!tokenAddress && tokenAddress !== zeroAddress;

  const { data: tokenMultiData, refetch: refetchToken } = useReadContracts({
    contracts: [
      { address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
      { address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
      { address: tokenAddr, abi: erc20Abi, functionName: "name" },
      { address: tokenAddr, abi: erc20Abi, functionName: "balanceOf", args: [userAddr] },
      { address: tokenAddr, abi: erc20Abi, functionName: "allowance", args: [userAddr, STAKING_CONTRACT_ADDRESS] },
    ],
    query: { enabled: isValidTokenAddr, refetchInterval: 15_000 },
  });

  const tokenDecimals = tokenMultiData?.[0]?.result as number | undefined;
  const tokenSymbol = tokenMultiData?.[1]?.result as string | undefined;
  const tokenName = tokenMultiData?.[2]?.result as string | undefined;
  const tokenBalance = tokenMultiData?.[3]?.result as bigint | undefined;
  const tokenAllowance = tokenMultiData?.[4]?.result as bigint | undefined;

  // Loading state for token info
  const isLoadingToken = isValidTokenAddr && (
    tokenDecimals === undefined || tokenSymbol === undefined || tokenName === undefined
  );

  // ========== Stake Preview ==========
  const amountWei = useMemo(() => {
    if (!tokenAddress || !tokenAmount || tokenDecimals === undefined) return 0n;
    try { return parseUnits(tokenAmount, Number(tokenDecimals)); }
    catch { return 0n; }
  }, [tokenAddress, tokenAmount, tokenDecimals]);

  const { data: stakePreviewData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "previewStake",
    args: [tokenAddr, amountWei, selectedPoolId],
    query: {
      enabled: isValidTokenAddr && amountWei > 0n && pools.some((p) => p.poolId === selectedPoolId),
      refetchInterval: 10_000,
    },
  });

  const stakePreview = useMemo(() => {
    if (!stakePreviewData) return null;
    const t = stakePreviewData as readonly [bigint, bigint, boolean];
    return { snapshotValue: t[0], rewardMon: t[1], treasuryCanAfford: t[2] };
  }, [stakePreviewData]);

  // ========== Owner check ==========
  const { data: ownerAddress } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "owner",
  });
  const isOwner = address && ownerAddress &&
    address.toLowerCase() === (ownerAddress as string).toLowerCase();

  // ========== WRITES ==========
  const { writeContractAsync, data: txHash, isPending: writing, reset: resetWrite } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (confirmed) {
      if (step === "approving") {
        toast.success("Token approved! Now staking...");
        handleStake();
      } else if (step === "staking") {
        toast.success("Stake created successfully!");
        setStep("confirmed");
        refetchUser();
        refetchProtocol();
        setTokenAmount("");
      }
      resetWrite();
    }
  }, [confirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========== REALTIME EVENTS ==========
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "Staked",
    onLogs() { refetchProtocol(); refetchUser(); refetchPools(); },
  });
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "Claimed",
    onLogs() { refetchProtocol(); refetchUser(); },
  });
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "RewardsFunded",
    onLogs() { refetchProtocol(); },
  });
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "EmergencyModeToggled",
    onLogs() { refetchProtocol(); },
  });
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "EmergencyRefundModeEnabled",
    onLogs() { refetchProtocol(); },
  });
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, eventName: "EmergencyRefundModeDisabled",
    onLogs() { refetchProtocol(); },
  });

  // ========== Token Discovery ==========
  useEffect(() => {
    if (!isValidTokenAddr || tokenDecimals === undefined) return;
    setIsLoadingTokenInfo(true);
    fetchTokenMetadata(
      tokenAddress,
      tokenDecimals,
      tokenSymbol,
      tokenName
    ).then((meta) => {
      setTokenMetadata(meta);
      setIsLoadingTokenInfo(false);
    }).catch(() => setIsLoadingTokenInfo(false));
  }, [tokenAddress, tokenDecimals, tokenSymbol, tokenName, isValidTokenAddr]);

  function doSwitch() { switchChain({ chainId: monadMainnet.id }); }

  // ========== Handlers ==========
  const handleApprove = useCallback(async () => {
    if (!isConnected) return toast.error("Connect wallet first");
    if (wrongNetwork) return toast.error("Switch to Monad Mainnet");
    if (!tokenAddress || tokenAddress === zeroAddress) return toast.error("Enter token address");
    if (amountWei <= 0n) return toast.error("Enter amount");
    try {
      setStep("approving");
      toast("Approving token...");
      await writeContractAsync({
        address: tokenAddr, abi: erc20Abi, functionName: "approve",
        args: [STAKING_CONTRACT_ADDRESS, amountWei], chainId: monadMainnet.id,
      });
    } catch (err) { console.error(err); toast.error("Approval failed"); setStep("idle"); }
  }, [isConnected, wrongNetwork, tokenAddress, amountWei, writeContractAsync, tokenAddr]);

  const handleStake = useCallback(async () => {
    if (!isConnected) return toast.error("Connect wallet first");
    if (wrongNetwork) return toast.error("Switch to Monad Mainnet");
    if (!tokenAddress || tokenAddress === zeroAddress) return toast.error("Enter token address");
    if (amountWei <= 0n) return toast.error("Enter amount");
    if (!stakePreview?.treasuryCanAfford) return toast.error("Treasury cannot afford this reward");
    if (protocolSummary?.emergencyMode || protocolSummary?.paused) return toast.error("Staking is currently disabled");
    if (!eligibility?.eligible) return toast.error(`You need at least ${Number(formatEther(MIN_JAMES_REQUIRED)).toLocaleString()} $JAMES to stake`);
    try {
      if (step !== "approving") setStep("staking");
      toast("Creating stake...");
      await writeContractAsync({
        address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "stake",
        args: [tokenAddr, amountWei, selectedPoolId], chainId: monadMainnet.id,
      });
    } catch (err) { console.error(err); toast.error("Staking failed"); setStep("idle"); }
  }, [isConnected, wrongNetwork, tokenAddress, amountWei, stakePreview, protocolSummary, eligibility, selectedPoolId, step, writeContractAsync, tokenAddr]);

  const startStakeFlow = useCallback(() => {
    if (!isConnected) return toast.error("Connect wallet first");
    if (wrongNetwork) return toast.error("Switch to Monad Mainnet");
    if (!tokenAddress || tokenAddress === zeroAddress) return toast.error("Enter token address");
    if (amountWei <= 0n) return toast.error("Enter amount");
    if (!stakePreview?.treasuryCanAfford) return toast.error("Treasury cannot afford this reward");
    if (protocolSummary?.emergencyMode || protocolSummary?.paused) return toast.error("Staking is currently disabled");
    if (!eligibility?.eligible) return toast.error(`You need at least ${Number(formatEther(MIN_JAMES_REQUIRED)).toLocaleString()} $JAMES to stake`);
    if ((tokenAllowance ?? 0n) >= amountWei) { handleStake(); } else { handleApprove(); }
  }, [isConnected, wrongNetwork, tokenAddress, amountWei, tokenAllowance, stakePreview, protocolSummary, eligibility, handleApprove, handleStake]);

  const handleClaim = useCallback(async (stakeId: bigint) => {
    try {
      toast("Claiming reward...");
      await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "claim", args: [stakeId], chainId: monadMainnet.id });
    } catch (err) { console.error(err); toast.error("Claim failed"); }
  }, [writeContractAsync]);

  const handleEarlyUnstake = useCallback(async () => {
    if (!selectedStake) return;
    try {
      setShowEarlyUnstakeModal(false);
      toast("Unstaking early...");
      await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "earlyUnstake", args: [selectedStake.stakeId], chainId: monadMainnet.id });
    } catch (err) { console.error(err); toast.error("Early unstake failed"); }
  }, [selectedStake, writeContractAsync]);

  // Admin action wrappers with confirmation
  const adminFund = useCallback(() => {
    const amount = prompt("Enter amount to fund (MON):");
    if (!amount) return;
    setAdminAction({
      action: "Fund Rewards",
      description: `Fund ${amount} MON to the staking contract.`,
      onConfirm: async () => {
        setAdminAction(null);
        try {
          const { parseEther: pe } = await import("viem");
          const hash = await writeContractAsync({
            address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "fundRewards",
            value: pe(amount), chainId: monadMainnet.id,
          });
          toast.success(`Funding ${amount} MON...`);
        } catch (err) { toast.error("Fund failed"); }
      },
    });
  }, [writeContractAsync]);

  const adminActionHandler = useCallback((action: string, description: string, fn: () => Promise<void>) => {
    setAdminAction({ action, description, onConfirm: async () => { setAdminAction(null); try { await fn(); } catch { toast.error(`${action} failed`); } } });
  }, []);

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
              <h1 className="mt-3 font-display text-5xl md:text-7xl font-extrabold">James Universal Staking</h1>
              <p className="mt-3 text-xl md:text-2xl font-extrabold">Stake Tokens, Earn MON</p>
              <p className="mt-2 max-w-lg text-base md:text-lg font-semibold text-foreground/80">
                Stake your favorite tokens and earn MON rewards with James Universal Staking V3.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                <appkit-button label="Connect Wallet" balance="hide" />
                {isConnected && <appkit-network-button />}
                <a href="#stake" className="rounded-full bg-white px-6 py-3 font-extrabold shadow-cute border-2 border-foreground hover:scale-105 transition">Start Staking</a>
              </div>
            </div>
            <div className="relative flex justify-center">
              <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 6, repeat: Infinity }} className="relative">
                <div className="absolute inset-0 rounded-[40px] bg-white blur-2xl opacity-60" />
                <div className="relative rounded-[40px] bg-white border-4 border-foreground shadow-pop p-6 w-72">
                  <div className="text-center text-xs font-extrabold opacity-70">JAMES UNIVERSAL STAKING</div>
                  <motion.img src={logo} alt="vault" className="mx-auto mt-2 h-32 w-32 rounded-full ring-banana" animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} />
                  <div className="mt-3 text-center font-extrabold text-2xl">
                    {protocolSummary ? `${Math.round(Number(formatEther(protocolSummary.treasuryBalance))).toLocaleString()} MON` : "— MON"}
                  </div>
                  <div className="text-center text-xs font-bold opacity-70">in treasury</div>
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
      {(emergencyStatus?.emergencyMode || emergencyStatus?.refundMode || protocolSummary?.paused) && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-red-500 bg-red-50 p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-cute">
            <div className="font-extrabold text-lg">
              {protocolSummary?.paused ? "Contract paused — All operations temporarily disabled." :
               emergencyStatus?.refundMode ? "Protocol operating in refund mode." :
               "Emergency mode active — New staking disabled."}
            </div>
          </div>
        </section>
      )}

      {/* NETWORK WARNING */}
      {wrongNetwork && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-[color:var(--orange-accent)] bg-[color:var(--banana-cream)] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-cute">
            <div className="font-extrabold text-lg">Please switch to Monad Mainnet to use the staking app.</div>
            <button onClick={doSwitch} disabled={switching} className="rounded-full bg-foreground text-[color:var(--banana)] px-5 py-2 font-extrabold shadow-cute disabled:opacity-60">
              {switching ? "Switching…" : "Switch Network"}
            </button>
          </div>
        </section>
      )}

      {/* ELIGIBILITY WARNING */}
      {isConnected && eligibility && !eligibility.eligible && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-yellow-500 bg-yellow-50 p-5 shadow-cute">
            <div className="font-extrabold text-lg">Not Eligible for Staking</div>
            <div className="text-xs font-bold mt-2">
              Required: {Number(formatEther(MIN_JAMES_REQUIRED)).toLocaleString()} $JAMES · Your Balance: {Number(formatEther(eligibility.jamesBalance)).toLocaleString()} $JAMES
            </div>
          </div>
        </section>
      )}

      {/* PROTOCOL DASHBOARD */}
      <section className="mx-auto max-w-7xl px-4 mt-10">
        <div className="rounded-[28px] bg-banana-gradient p-6 shadow-cute border-2 border-white">
          <h3 className="font-extrabold text-2xl">Protocol Dashboard</h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total Stakes", v: protocolSummary ? Number(protocolSummary.totalStakes) : 0, s: "" },
              { l: "Reserved MON", v: protocolSummary ? Math.round(Number(formatEther(protocolSummary.reservedMon))) : 0, s: "" },
              { l: "Treasury Balance", v: protocolSummary ? Math.round(Number(formatEther(protocolSummary.treasuryBalance))) : 0, s: "" },
              { l: "Available MON", v: protocolSummary ? Math.round(Number(formatEther(protocolSummary.availableMon))) : 0, s: "" },
              { l: "Coverage", v: coverageDisplay, s: "", c: coverageStatusInfo.colorClass },
              { l: "Coverage Status", v: coverageStatusInfo.label, s: "", c: coverageStatusInfo.colorClass },
              { l: "Emergency Mode", v: emergencyStatus?.emergencyMode ? "ON" : "Off", s: "", c: emergencyStatus?.emergencyMode ? "text-red-600" : "text-green-600" },
              { l: "Paused", v: protocolSummary?.paused ? "Yes" : "No", s: "", c: protocolSummary?.paused ? "text-red-600" : "text-green-600" },
            ].map((m) => (
              <div key={m.l} className="rounded-2xl bg-white/90 p-3 text-center shadow-cute">
                <div className="text-[10px] font-extrabold opacity-60">{m.l}</div>
                <div className={`text-lg font-extrabold ${m.c || ""}`}>{typeof m.v === "number" ? <Counter to={m.v} suffix={m.s} /> : m.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USER DASHBOARD */}
      {isConnected && (
        <section className="mx-auto max-w-7xl px-4 mt-10">
          <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
            <div className="flex items-center gap-3">
              <img src={logo} className="h-12 w-12 rounded-full ring-banana" alt="" />
              <div>
                <div className="text-xs font-extrabold opacity-70">CONNECTED WALLET</div>
                <div className="font-extrabold">{addressShort}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Mini label="$JAMES Balance" value={eligibility ? Number(formatEther(eligibility.jamesBalance)).toLocaleString() : "—"} emoji="🍌" />
              <Mini label="Active Stakes" value={userStakes.length.toString()} emoji="🎫" />
            </div>
          </div>
        </section>
      )}

      {/* STAKING FORM */}
      <section id="stake" className="mx-auto max-w-7xl px-4 mt-12 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold">Staking Pools</h2>
          <p className="font-bold text-foreground/70 mt-1">Select a pool to stake in.</p>
          <div className="mt-5 space-y-4">
            {pools.map((p) => (
              <motion.button whileHover={{ scale: 1.01 }} key={p.poolId.toString()} onClick={() => setSelectedPoolId(p.poolId)}
                disabled={protocolSummary?.emergencyMode || protocolSummary?.paused}
                className={`w-full text-left rounded-[24px] p-5 border-4 shadow-cute transition ${selectedPoolId === p.poolId ? "border-foreground" : "border-white"} ${p.status === 0 ? "bg-[color:var(--banana-cream)]" : p.status === 1 ? "bg-banana-gradient" : "bg-gray-100"} ${(protocolSummary?.emergencyMode || protocolSummary?.paused) ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-xl">{p.name}</div>
                    <div className="text-sm font-bold opacity-80">{Number(p.duration) / 86400} days lock</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold">{Number(p.rewardPercentage) / 100}%</div>
                    <div className="text-xs font-extrabold opacity-80">Reward</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-pop">
          <h3 className="font-extrabold text-2xl">Create Stake</h3>

          <label className="mt-4 block text-sm font-extrabold opacity-70">Token Address</label>
          <input value={tokenAddress} onChange={(e) => setTokenAddress(e.target.value)} placeholder="0x..."
            className="mt-1 w-full rounded-2xl bg-[color:var(--banana-cream)] p-3 font-extrabold outline-none"
            disabled={protocolSummary?.emergencyMode || protocolSummary?.paused} />

          {/* Token Info Loading / Display */}
          {isValidTokenAddr && (
            <div className="mt-3 rounded-2xl bg-[color:var(--banana-cream)] p-3">
              {isLoadingToken ? (
                <div className="space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
                  <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="font-extrabold opacity-50">Name</div>
                    <div className="font-extrabold">{tokenName || "—"}</div>
                  </div>
                  <div>
                    <div className="font-extrabold opacity-50">Symbol</div>
                    <div className="font-extrabold">{tokenSymbol || "—"}</div>
                  </div>
                  <div>
                    <div className="font-extrabold opacity-50">Balance</div>
                    <div className="font-extrabold">
                      {tokenBalance !== undefined && tokenDecimals !== undefined
                        ? Number(formatUnits(tokenBalance, tokenDecimals)).toLocaleString() : "—"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="mt-4 block text-sm font-extrabold opacity-70">Amount ({tokenSymbol || "tokens"})</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-[color:var(--banana-cream)] p-2">
            <input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value)} inputMode="decimal" placeholder="0.0"
              className="flex-1 bg-transparent px-3 py-2 outline-none font-extrabold text-xl"
              disabled={protocolSummary?.emergencyMode || protocolSummary?.paused} />
            <button onClick={() => {
              if (tokenBalance !== undefined && tokenDecimals !== undefined) {
                setTokenAmount(formatUnits(tokenBalance, tokenDecimals));
              }
            }} className="rounded-full bg-foreground text-[color:var(--banana)] px-3 py-1.5 text-xs font-extrabold">MAX</button>
          </div>

          <div className="mt-4 space-y-2">
            {stakePreview && (
              <>
                <Row k="Snapshot Value" v={`${formatMon(stakePreview.snapshotValue)} MON`} />
                <Row k="Reward MON" v={`${formatMon(stakePreview.rewardMon)} MON`} highlight />
                <Row k="Treasury Status" v={stakePreview.treasuryCanAfford ? "✅ Can afford" : "❌ Cannot afford"} />
              </>
            )}
          </div>

          <button onClick={startStakeFlow}
            disabled={writing || confirming || (protocolSummary?.emergencyMode || protocolSummary?.paused) || !stakePreview?.treasuryCanAfford || !eligibility?.eligible}
            className="mt-5 w-full rounded-2xl bg-banana-gradient py-4 font-extrabold text-lg shadow-cute border-2 border-white hover:scale-[1.02] transition disabled:opacity-60">
            {step === "approving" ? "Approving..." : step === "staking" ? "Staking..." : writing ? "Confirm in wallet…" : confirming ? "Confirming…" : "Stake Now"}
          </button>
        </div>
      </section>

      {/* USER STAKES */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <h2 className="text-3xl md:text-4xl font-extrabold">Your Stakes</h2>
        {!isConnected ? (
          <div className="mt-6 rounded-[28px] border-4 border-dashed border-[color:var(--banana)] bg-white p-10 text-center font-extrabold text-foreground/60">
            Connect your wallet to view your stakes.
          </div>
        ) : userStakes.length === 0 ? (
          <div className="mt-6 rounded-[28px] border-4 border-dashed border-[color:var(--banana)] bg-white p-10 text-center font-extrabold text-foreground/60">
            No stakes yet. Create your first stake above!
          </div>
        ) : (
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userStakes.map((s) => (
              <StakeCard key={s.stakeId.toString()} stake={s}
                onClaim={() => handleClaim(s.stakeId)}
                onEarlyUnstake={() => { setSelectedStake(s); setShowEarlyUnstakeModal(true); }}
                onViewDetails={() => { /* navigate to detail */ }} />
            ))}
          </div>
        )}
      </section>

      {/* PUBLIC COMMUNITY ACTIVITY */}
      <PublicStakingActivity />

      {/* ADMIN PANEL */}
      {isOwner && (
        <section className="mx-auto max-w-7xl px-4 mt-12">
          <div className="rounded-[28px] bg-red-50 border-4 border-red-200 p-6 shadow-cute">
            <h3 className="font-extrabold text-2xl text-red-700">Admin Panel</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <AdminButton label="Fund Rewards" onClick={adminFund} />
              <AdminButton label="Pause" onClick={() => adminActionHandler("Pause Contract", "Pause all staking operations.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "pause", chainId: monadMainnet.id });
                toast.success("Contract paused");
              })} disabled={protocolSummary?.paused} />
              <AdminButton label="Unpause" onClick={() => adminActionHandler("Unpause Contract", "Resume all staking operations.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "unpause", chainId: monadMainnet.id });
                toast.success("Contract unpaused");
              })} disabled={!protocolSummary?.paused} />
              <AdminButton label="Enable Emergency" onClick={() => adminActionHandler("Enable Emergency Mode", "Disable new staking. Existing stakes remain active.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "enableEmergencyMode", chainId: monadMainnet.id });
                toast.success("Emergency mode enabled");
              })} disabled={emergencyStatus?.emergencyMode} />
              <AdminButton label="Disable Emergency" onClick={() => adminActionHandler("Disable Emergency Mode", "Resume normal staking operations.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "disableEmergencyMode", chainId: monadMainnet.id });
                toast.success("Emergency mode disabled");
              })} disabled={!emergencyStatus?.emergencyMode} />
              <AdminButton label="Enable Refund Mode" onClick={() => adminActionHandler("Enable Refund Mode", "Protocol will operate in refund mode.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "enableEmergencyRefundMode", chainId: monadMainnet.id });
                toast.success("Refund mode enabled");
              })} disabled={emergencyStatus?.refundMode} />
              <AdminButton label="Disable Refund Mode" onClick={() => adminActionHandler("Disable Refund Mode", "Exit refund mode.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "disableEmergencyRefundMode", chainId: monadMainnet.id });
                toast.success("Refund mode disabled");
              })} disabled={!emergencyStatus?.refundMode} />
              <AdminButton label="Withdraw Surplus" onClick={() => adminActionHandler("Withdraw Surplus MON", "Withdraw surplus MON from the contract.", async () => {
                await writeContractAsync({ address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "withdrawSurplusMON", chainId: monadMainnet.id });
                toast.success("Surplus withdrawn");
              })} />
            </div>
          </div>
        </section>
      )}

      {/* EARLY UNSTAKE MODAL */}
      {showEarlyUnstakeModal && selectedStake && (
        <EarlyUnstakeModal stake={selectedStake}
          onCancel={() => setShowEarlyUnstakeModal(false)}
          onConfirm={handleEarlyUnstake} />
      )}

      {/* ADMIN CONFIRMATION MODAL */}
      {adminAction && address && (
        <AdminConfirmationModal
          action={adminAction.action}
          description={adminAction.description}
          contract={STAKING_CONTRACT_ADDRESS}
          wallet={address}
          onCancel={() => setAdminAction(null)}
          onConfirm={adminAction.onConfirm}
        />
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

function AdminButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="rounded-2xl bg-red-600 text-white py-3 font-extrabold shadow-cute disabled:opacity-50">
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Stake Card
// ---------------------------------------------------------------------------

function StakeCard({ stake, onClaim, onEarlyUnstake, onViewDetails }: {
  stake: ActiveStake; onClaim: () => void; onEarlyUnstake: () => void; onViewDetails: () => void;
}) {
  const { days, hours, minutes, seconds, isUnlocked } = useCountdown(stake.unlockTime);

  const { data: pendingRewardData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "pendingReward",
    args: [stake.stakeId], query: { refetchInterval: 10_000 },
  });

  const pendingRewardInfo = useMemo(() => {
    if (!pendingRewardData) return null;
    const t = pendingRewardData as readonly [bigint, boolean];
    return { reward: t[0], unlocked: t[1] };
  }, [pendingRewardData]);

  return (
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="rounded-[24px] bg-banana-gradient p-1 shadow-pop">
      <div className="rounded-[20px] bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold opacity-70">Stake #{stake.stakeId.toString()}</div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${stake.status === 0 ? "bg-green-100 text-green-700" : stake.status === 1 ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-600"}`}>
            {stake.status === 0 ? "Locked" : stake.status === 1 ? "Unlocked" : "Claimed"}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Token</div>
            <div className="font-extrabold text-xs">{stake.token.slice(0, 8)}…{stake.token.slice(-6)}</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Amount</div>
            <div className="font-extrabold">{Number(formatEther(stake.amount)).toLocaleString()}</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Snapshot Value</div>
            <div className="font-extrabold">{formatMon(stake.snapshotValueMon)} MON</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Reward</div>
            <div className="font-extrabold">{formatMon(stake.rewardMon)} MON</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Start</div>
            <div className="font-extrabold">{new Date(Number(stake.startTime) * 1000).toLocaleDateString()}</div>
          </div>
          <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
            <div className="text-[10px] font-extrabold opacity-60">Unlock</div>
            <div className="font-extrabold">{new Date(Number(stake.unlockTime) * 1000).toLocaleDateString()}</div>
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
          <div className="mt-3 flex gap-2">
            {isUnlocked ? (
              <button onClick={onClaim} className="flex-1 rounded-xl bg-foreground text-[color:var(--banana)] py-2.5 font-extrabold shadow-cute">
                Claim Reward
              </button>
            ) : (
              <button onClick={onEarlyUnstake} className="flex-1 rounded-xl bg-[color:var(--orange-accent)] text-white py-2.5 font-extrabold shadow-cute">
                Early Unstake
              </button>
            )}
            <Link to="/staking/stake/$stakeId" params={{ stakeId: stake.stakeId.toString() }}
              className="rounded-xl bg-[color:var(--banana-cream)] px-3 py-2.5 font-extrabold text-xs flex items-center">
              Details
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Early Unstake Modal
// ---------------------------------------------------------------------------

function EarlyUnstakeModal({ stake, onCancel, onConfirm }: {
  stake: ActiveStake; onCancel: () => void; onConfirm: () => void;
}) {
  const { data: penaltyData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS, abi: vaultAbi, functionName: "previewEarlyExitPenalty",
    args: [stake.stakeId], query: { enabled: !!stake.stakeId },
  });

  const penalty = useMemo(() => {
    if (!penaltyData) return null;
    const t = penaltyData as readonly [bigint, boolean];
    return { jamesBurnPenalty: t[0], userCanAfford: t[1] };
  }, [penaltyData]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm px-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full rounded-[28px] bg-white p-6 border-4 border-[color:var(--orange-accent)] shadow-pop">
        <div className="text-center text-5xl">⚠️</div>
        <h3 className="mt-3 text-2xl font-extrabold text-center">Early Unstake Warning</h3>
        <p className="mt-2 text-sm font-semibold text-foreground/80 text-center">
          Unstaking early will incur a JAMES burn penalty.
        </p>
        <div className="mt-4 rounded-2xl bg-[color:var(--banana-cream)] p-4 space-y-2 text-sm">
          <Row k="JAMES Burn Penalty" v={penalty ? `${Number(formatEther(penalty.jamesBurnPenalty)).toLocaleString()} $JAMES` : "—"} />
          <Row k="Can Afford" v={penalty ? (penalty.userCanAfford ? "✅ Yes" : "❌ No") : "—"} />
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-[color:var(--banana-cream)] py-3 font-extrabold">Cancel</button>
          <button onClick={onConfirm} disabled={!penalty?.userCanAfford} className="flex-1 rounded-2xl bg-[color:var(--orange-accent)] text-white py-3 font-extrabold shadow-cute disabled:opacity-50">
            Confirm Unstake
          </button>
        </div>
      </motion.div>
    </div>
  );
}
