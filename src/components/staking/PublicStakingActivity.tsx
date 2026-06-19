// ---------------------------------------------------------------------------
// PublicStakingActivity — Community Activity Dashboard (no login required)
// ---------------------------------------------------------------------------

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  useReadContract,
  useWatchContractEvent,
} from "wagmi";
import { formatEther } from "viem";
import {
  STAKING_CONTRACT_ADDRESS,
  vaultAbi,
} from "@/lib/web3/contracts";
import { formatMon } from "@/services/stakingService";

interface PublicStakeEvent {
  id: string;
  wallet: string;
  token: string;
  amount: bigint;
  poolId: bigint;
  timestamp: number;
}

interface PublicClaimEvent {
  id: string;
  wallet: string;
  stakeId: bigint;
  reward: bigint;
  timestamp: number;
}

function maskWallet(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PublicStakingActivity() {
  const [recentStakes, setRecentStakes] = useState<PublicStakeEvent[]>([]);
  const [recentClaims, setRecentClaims] = useState<PublicClaimEvent[]>([]);

  // Get total stake count
  const { data: stakeCount } = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    functionName: "getStakeCount",
    query: { refetchInterval: 30_000 },
  });

  // Listen to Staked events
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    eventName: "Staked",
    onLogs(logs: any[]) {
      const newStakes = logs.map((log: any) => ({
        id: `${log.blockNumber}-${log.logIndex}`,
        wallet: log.args.user as string,
        token: log.args.token as string,
        amount: log.args.amount as bigint,
        poolId: log.args.poolId as bigint,
        timestamp: Math.floor(Date.now() / 1000),
      }));
      setRecentStakes((prev) => [...newStakes, ...prev].slice(0, 50));
    },
  });

  // Listen to Claimed events
  useWatchContractEvent({
    address: STAKING_CONTRACT_ADDRESS,
    abi: vaultAbi,
    eventName: "Claimed",
    onLogs(logs: any[]) {
      const newClaims = logs.map((log: any) => ({
        id: `${log.blockNumber}-${log.logIndex}`,
        wallet: log.args.user as string,
        stakeId: log.args.stakeId as bigint,
        reward: log.args.reward as bigint,
        timestamp: Math.floor(Date.now() / 1000),
      }));
      setRecentClaims((prev) => [...newClaims, ...prev].slice(0, 50));
    },
  });

  // Calculate unique stakers from recent stakes
  const uniqueStakers = useMemo(() => {
    const wallets = new Set(recentStakes.map((s) => s.wallet.toLowerCase()));
    return wallets.size;
  }, [recentStakes]);

  const totalStakes = stakeCount ? Number(stakeCount) : 0;

  return (
    <section className="mx-auto max-w-7xl px-4 mt-12">
      <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
        <h2 className="text-3xl md:text-4xl font-extrabold">Community Activity</h2>
        <p className="font-bold text-foreground/70 mt-1">Public staking transparency — no login required.</p>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-banana-gradient p-4 text-center shadow-cute border-2 border-white">
            <div className="text-[10px] font-extrabold opacity-60">TOTAL STAKES</div>
            <div className="text-2xl font-extrabold">{totalStakes.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-banana-gradient p-4 text-center shadow-cute border-2 border-white">
            <div className="text-[10px] font-extrabold opacity-60">ACTIVE STAKERS</div>
            <div className="text-2xl font-extrabold">{uniqueStakers.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-banana-gradient p-4 text-center shadow-cute border-2 border-white">
            <div className="text-[10px] font-extrabold opacity-60">RECENT STAKES</div>
            <div className="text-2xl font-extrabold">{recentStakes.length}</div>
          </div>
          <div className="rounded-2xl bg-banana-gradient p-4 text-center shadow-cute border-2 border-white">
            <div className="text-[10px] font-extrabold opacity-60">RECENT CLAIMS</div>
            <div className="text-2xl font-extrabold">{recentClaims.length}</div>
          </div>
        </div>

        {/* Recent Activity Feeds */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {/* Recent Stakes Feed */}
          <div>
            <h3 className="font-extrabold text-lg mb-3">Recent Stakes</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentStakes.length === 0 ? (
                <div className="text-center text-sm font-bold opacity-50 py-8">
                  Waiting for on-chain activity...
                </div>
              ) : (
                recentStakes.slice(0, 15).map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl bg-[color:var(--banana-cream)] p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs font-mono">
                        {maskWallet(s.wallet)}
                      </span>
                      <span className="text-[10px] font-bold opacity-50">
                        {timeAgo(s.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-xs">
                      staked {Number(formatEther(s.amount)).toLocaleString()} tokens
                      <span className="opacity-50"> · Pool #{s.poolId.toString()}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Recent Claims Feed */}
          <div>
            <h3 className="font-extrabold text-lg mb-3">Recent Claims</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentClaims.length === 0 ? (
                <div className="text-center text-sm font-bold opacity-50 py-8">
                  Waiting for on-chain activity...
                </div>
              ) : (
                recentClaims.slice(0, 15).map((c) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-xl bg-green-50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs font-mono">
                        {maskWallet(c.wallet)}
                      </span>
                      <span className="text-[10px] font-bold opacity-50">
                        {timeAgo(c.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 font-bold text-xs">
                      claimed {formatMon(c.reward)} MON
                      <span className="opacity-50"> · Stake #{c.stakeId.toString()}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
