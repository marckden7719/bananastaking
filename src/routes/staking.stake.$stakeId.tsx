// ---------------------------------------------------------------------------
// Stake Details Page — /staking/stake/$stakeId
// ---------------------------------------------------------------------------

import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, zeroAddress } from "viem";
import logo from "@/assets/logobanana.jpg?url";
import { monadMainnet } from "@/lib/web3/chain";
import {
  STAKING_CONTRACT_ADDRESS,
  vaultAbi,
  erc20Abi,
} from "@/lib/web3/contracts";
import {
  getPendingReward,
  previewEarlyExitPenalty,
  formatMon,
  type ActiveStake,
} from "@/services/stakingService";
import type { Address } from "viem";

export const Route = createFileRoute("/staking/stake/$stakeId")({
  head: () => ({
    meta: [
      { title: "Stake Details | James Universal Staking" },
      {
        name: "description",
        content: "View stake details, claim rewards, or early unstake.",
      },
    ],
  }),
  component: StakeDetails,
});

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

function StakeDetails() {
  const { stakeId } = Route.useParams();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const wrongNetwork = isConnected && chainId !== monadMainnet.id;
  const userAddr = (address ?? zeroAddress()) as `0x${string}`;
  const stakeIdBigInt = BigInt(stakeId);

  const [showEarlyUnstakeModal, setShowEarlyUnstakeModal] = useState(false);

  // Fetch user stakes to find this one
  const { data: userStakesData, refetch: refetchStakes } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "getUserActiveStakes",
    args: [userAddr],
    query: { enabled: isConnected, refetchInterval: 30_000 },
  });

  const stake: ActiveStake | undefined = useMemo(() => {
    if (!userStakesData) return undefined;
    const all = (userStakesData as readonly unknown[]).map((s) => {
      const t = s as readonly [
        bigint, Address, bigint, bigint, bigint, bigint, bigint, number,
        bigint, bigint, bigint, bigint
      ];
      return {
        stakeId: t[0], token: t[1], amount: t[2], poolId: t[3],
        rewardMon: t[4], startTime: t[5], unlockTime: t[6], status: t[7],
        snapshotValueMon: t[8], stakeFee: t[9], effectiveValueMon: t[10],
        snapshotJamesBalance: t[11],
      };
    });
    return all.find((s) => s.stakeId === stakeIdBigInt);
  }, [userStakesData, stakeIdBigInt]);

  // Token metadata
  const { data: tokenSymbol } = useReadContract({
    address: stake?.token as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: !!stake },
  });

  const { data: tokenName } = useReadContract({
    address: stake?.token as `0x${string}`,
    abi: erc20Abi,
    functionName: "name",
    query: { enabled: !!stake },
  });

  // Pending reward for this stake
  const { data: pendingRewardData, refetch: refetchReward } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "pendingReward",
    args: [stakeIdBigInt],
    query: { enabled: !!stake, refetchInterval: 10_000 },
  });

  const pendingRewardInfo = useMemo(() => {
    if (!pendingRewardData) return null;
    const t = pendingRewardData as readonly [bigint, boolean];
    return { reward: t[0], unlocked: t[1] };
  }, [pendingRewardData]);

  // Countdown
  const countdown = stake ? useCountdown(stake.unlockTime) : null;

  // Owner check
  const { data: ownerAddress } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "owner",
  });
  const isOwner = address && ownerAddress &&
    address.toLowerCase() === (ownerAddress as string).toLowerCase();

  // Writes
  const { writeContractAsync, data: txHash, isPending: writing } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (confirmed) {
      toast.success("Transaction confirmed!");
      refetchStakes();
      refetchReward();
    }
  }, [confirmed, refetchStakes, refetchReward]);

  const doSwitch = () => switchChain({ chainId: monadMainnet.id });

  const handleClaim = useCallback(async () => {
    try {
      toast("Claiming reward...");
      await writeContractAsync({
        address: STAKING_CONTRACT_ADDRESS,
        abi: vaultAbi,
        functionName: "claim",
        args: [stakeIdBigInt],
        chainId: monadMainnet.id,
      });
    } catch (err) {
      console.error(err);
      toast.error("Claim failed");
    }
  }, [writeContractAsync, stakeIdBigInt]);

  const handleEarlyUnstake = useCallback(async () => {
    try {
      setShowEarlyUnstakeModal(false);
      toast("Unstaking early...");
      await writeContractAsync({
        address: STAKING_CONTRACT_ADDRESS,
        abi: vaultAbi,
        functionName: "earlyUnstake",
        args: [stakeIdBigInt],
        chainId: monadMainnet.id,
      });
    } catch (err) {
      console.error(err);
      toast.error("Early unstake failed");
    }
  }, [writeContractAsync, stakeIdBigInt]);

  if (!isConnected) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-10 text-center shadow-cute">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-2xl font-extrabold">Connect Wallet</h2>
          <p className="mt-2 font-bold text-foreground/60">Connect your wallet to view stake details.</p>
          <div className="mt-4">
            <appkit-button label="Connect Wallet" balance="hide" />
          </div>
        </div>
      </section>
    );
  }

  if (!stake) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-10">
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-10 text-center shadow-cute">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-extrabold">Stake Not Found</h2>
          <p className="mt-2 font-bold text-foreground/60">
            Stake #{stakeId} not found in your wallet.
          </p>
          <Link to="/staking" className="mt-4 inline-block rounded-full bg-banana-gradient px-6 py-3 font-extrabold shadow-cute border-2 border-white">
            Back to Staking
          </Link>
        </div>
      </section>
    );
  }

  const statusLabel = stake.status === 0 ? "Locked" : stake.status === 1 ? "Unlocked" : "Claimed";
  const statusColor = stake.status === 0 ? "bg-green-100 text-green-700" : stake.status === 1 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600";

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-10">
        {/* Breadcrumb */}
        <Link to="/staking" className="inline-flex items-center gap-2 text-sm font-extrabold opacity-70 hover:opacity-100 transition">
          ← Back to Staking
        </Link>

        <div className="mt-6 grid lg:grid-cols-2 gap-6">
          {/* Stake Info */}
          <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold">Stake #{stake.stakeId.toString()}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <DetailRow label="Token Address" value={`${stake.token.slice(0, 10)}…${stake.token.slice(-8)}`} mono />
              <DetailRow label="Token Symbol" value={tokenSymbol as string || "—"} />
              <DetailRow label="Token Name" value={tokenName as string || "—"} />
              <DetailRow label="Token Amount" value={Number(formatEther(stake.amount)).toLocaleString()} />
              <DetailRow label="Snapshot Value" value={`${formatMon(stake.snapshotValueMon)} MON`} />
              <DetailRow label="Stake Fee" value={`${formatMon(stake.stakeFee)} MON`} />
              <DetailRow label="Effective Value" value={`${formatMon(stake.effectiveValueMon)} MON`} highlight />
              <DetailRow label="Reward MON" value={`${formatMon(stake.rewardMon)} MON`} highlight />
              <DetailRow label="Pool" value={`#${stake.poolId.toString()}`} />
              <DetailRow label="Start Time" value={new Date(Number(stake.startTime) * 1000).toLocaleString()} />
              <DetailRow label="Unlock Time" value={new Date(Number(stake.unlockTime) * 1000).toLocaleString()} />
              <DetailRow label="Snapshot JAMES Balance" value={Number(formatEther(stake.snapshotJamesBalance)).toLocaleString()} />
            </div>
          </div>

          {/* Actions & Countdown */}
          <div className="space-y-6">
            {/* Countdown */}
            {stake.status === 0 && countdown && (
              <div className="rounded-[28px] bg-banana-gradient p-6 shadow-cute border-2 border-white">
                <h3 className="font-extrabold text-lg text-center">
                  {countdown.isUnlocked ? "UNLOCKED" : "TIME REMAINING"}
                </h3>
                {countdown.isUnlocked ? (
                  <div className="mt-3 text-center font-extrabold text-green-600 text-xl">
                    Ready to Claim!
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[
                      { v: String(countdown.days).padStart(2, "0"), l: "DAYS" },
                      { v: String(countdown.hours).padStart(2, "0"), l: "HRS" },
                      { v: String(countdown.minutes).padStart(2, "0"), l: "MIN" },
                      { v: String(countdown.seconds).padStart(2, "0"), l: "SEC" },
                    ].map((item) => (
                      <div key={item.l} className="rounded-xl bg-white/90 p-2">
                        <div className="font-extrabold text-2xl">{item.v}</div>
                        <div className="text-[9px] font-bold opacity-50">{item.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Reward */}
            {pendingRewardInfo && stake.status === 0 && (
              <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
                <h3 className="font-extrabold text-lg">Pending Reward</h3>
                <div className="mt-2 text-3xl font-extrabold text-[color:var(--orange-accent)]">
                  {formatMon(pendingRewardInfo.reward)} MON
                </div>
                <div className="mt-1 text-sm font-bold opacity-60">
                  {pendingRewardInfo.unlocked ? "Unlocked — ready to claim" : "Still locked"}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {stake.status === 0 && (
              <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
                <h3 className="font-extrabold text-lg">Actions</h3>
                {countdown?.isUnlocked ? (
                  <button
                    onClick={handleClaim}
                    disabled={writing || confirming}
                    className="mt-4 w-full rounded-2xl bg-foreground text-[color:var(--banana)] py-4 font-extrabold text-lg shadow-cute hover:scale-[1.02] transition disabled:opacity-60"
                  >
                    {writing ? "Confirm in wallet…" : confirming ? "Confirming…" : "Claim Reward"}
                  </button>
                ) : (
                  <button
                    onClick={() => setShowEarlyUnstakeModal(true)}
                    className="mt-4 w-full rounded-2xl bg-[color:var(--orange-accent)] text-white py-4 font-extrabold text-lg shadow-cute hover:scale-[1.02] transition"
                  >
                    Early Unstake
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Early Unstake Modal */}
      {showEarlyUnstakeModal && (
        <EarlyUnstakeDetailModal
          stake={stake}
          onCancel={() => setShowEarlyUnstakeModal(false)}
          onConfirm={handleEarlyUnstake}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DetailRow({ label, value, highlight, mono }: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[color:var(--banana-cream)]">
      <span className="text-xs font-bold opacity-60">{label}</span>
      <span className={`font-extrabold text-sm ${highlight ? "text-[color:var(--orange-accent)]" : ""} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function EarlyUnstakeDetailModal({ stake, onCancel, onConfirm }: {
  stake: ActiveStake; onCancel: () => void; onConfirm: () => void;
}) {
  const { data: penaltyData } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "previewEarlyExitPenalty",
    args: [stake.stakeId],
    query: { enabled: !!stake.stakeId },
  });

  const penalty = useMemo(() => {
    if (!penaltyData) return null;
    const t = penaltyData as readonly [bigint, boolean];
    return { jamesBurnPenalty: t[0], userCanAfford: t[1] };
  }, [penaltyData]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full rounded-[28px] bg-white p-6 border-4 border-[color:var(--orange-accent)] shadow-pop"
      >
        <div className="text-center text-5xl">⚠️</div>
        <h3 className="mt-3 text-2xl font-extrabold text-center">Early Unstake Warning</h3>
        <p className="mt-2 text-sm font-semibold text-foreground/80 text-center">
          Unstaking early will incur a JAMES burn penalty.
        </p>
        <div className="mt-4 rounded-2xl bg-[color:var(--banana-cream)] p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">JAMES Burn Penalty</span>
            <span className="font-extrabold">
              {penalty ? `${Number(formatEther(penalty.jamesBurnPenalty)).toLocaleString()} $JAMES` : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">Can Afford</span>
            <span className="font-extrabold">
              {penalty ? (penalty.userCanAfford ? "Yes" : "No") : "—"}
            </span>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-2xl bg-[color:var(--banana-cream)] py-3 font-extrabold">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!penalty?.userCanAfford}
            className="flex-1 rounded-2xl bg-[color:var(--orange-accent)] text-white py-3 font-extrabold shadow-cute disabled:opacity-50"
          >
            Confirm Unstake
          </button>
        </div>
      </motion.div>
    </div>
  );
}
