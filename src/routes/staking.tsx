import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logobanana.jpg.asset.json";
import { FloatingBananas } from "@/components/site/FloatingBananas";
import { Counter } from "@/components/site/Counter";

export const Route = createFileRoute("/staking")({
  head: () => ({
    meta: [
      { title: "Banana Vault | Stake $JAMES on Monad" },
      { name: "description", content: "Put your bananas to work. Stake MON and unlock rewards while powering the James Banana ecosystem." },
      { property: "og:title", content: "Banana Vault | James Banana Staking" },
      { property: "og:description", content: "Stake MON. Earn bananas. Power the meme machine." },
      { property: "og:image", content: logo.url },
    ],
    links: [{ rel: "canonical", href: "/staking" }],
  }),
  component: Staking,
});

type Pool = { id: string; name: string; days: number; apy: number; emoji: string; color: string };
const POOLS: Pool[] = [
  { id: "lite", name: "Banana Lite", days: 7, apy: 30, emoji: "🍌", color: "bg-[color:var(--banana-cream)]" },
  { id: "plus", name: "Banana Plus", days: 15, apy: 75, emoji: "🍌🍌", color: "bg-banana-gradient" },
  { id: "diamond", name: "Banana Diamond", days: 30, apy: 180, emoji: "👑🍌", color: "bg-[color:var(--leaf)] text-white" },
];

type Stake = { id: number; amount: number; pool: Pool; start: number };

function Staking() {
  const [connected, setConnected] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [addr] = useState("0x42n4n4...c47");
  const [mon] = useState(128.42);
  const [james] = useState(1_250_000);
  const [pool, setPool] = useState<Pool>(POOLS[1]);
  const [amount, setAmount] = useState("10");
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [burnOpen, setBurnOpen] = useState<Stake | null>(null);

  const tier = useMemo(() => {
    if (james >= 1_000_000) return { name: "Diamond", emoji: "👑🍌", bonus: 50 };
    if (james >= 250_000) return { name: "Gold", emoji: "🍌🍌🍌", bonus: 25 };
    if (james >= 50_000) return { name: "Silver", emoji: "🍌🍌", bonus: 10 };
    return { name: "Bronze", emoji: "🍌", bonus: 0 };
  }, [james]);

  const amt = parseFloat(amount) || 0;
  const base = (amt * pool.apy * pool.days) / 365 / 100;
  const bonus = base * (tier.bonus / 100);
  const finalReward = base + bonus;

  function connect() {
    setConnected(true);
    toast.success("🍌 Wallet Connected");
  }
  function fakeSwitch() {
    setWrongNetwork(false);
    toast.success("✅ Switched to Monad Mainnet");
  }
  function stake() {
    if (!connected) return toast.error("Connect wallet first 🍌");
    if (wrongNetwork) return toast.error("⚠ Wrong Network");
    if (amt <= 0) return toast.error("Enter an amount 🍌");
    setStakes((s) => [...s, { id: Date.now(), amount: amt, pool, start: Date.now() }]);
    toast.success("🚀 Stake Successful");
  }
  function claim(s: Stake) {
    const unlock = s.start + s.pool.days * 86400_000;
    if (Date.now() < unlock) return setBurnOpen(s);
    setStakes((arr) => arr.filter((x) => x.id !== s.id));
    toast.success("🎉 Rewards Claimed");
  }
  function confirmBurn() {
    if (!burnOpen) return;
    setStakes((arr) => arr.filter((x) => x.id !== burnOpen.id));
    setBurnOpen(null);
    toast.success("🔥 Bananas burned. Early claim complete.");
  }

  return (
    <>
      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10">
        <div className="relative overflow-hidden rounded-[36px] bg-banana-gradient p-8 md:p-12 shadow-pop border-4 border-white">
          <FloatingBananas count={14} />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold">🏦 STAKING DAPP · MONAD</span>
              <h1 className="mt-3 font-display text-5xl md:text-7xl font-extrabold">Banana Vault</h1>
              <p className="mt-3 text-xl md:text-2xl font-extrabold">Put Your Bananas To Work</p>
              <p className="mt-2 max-w-lg text-base md:text-lg font-semibold text-foreground/80">
                Stake MON and unlock rewards while helping power the James Banana ecosystem.
              </p>
              <div className="mt-6 flex gap-3 flex-wrap">
                {!connected ? (
                  <button onClick={connect} className="rounded-full bg-foreground text-[color:var(--banana)] px-6 py-3 font-extrabold shadow-cute hover:scale-105 transition">
                    🔌 Connect Wallet
                  </button>
                ) : (
                  <button onClick={() => setWrongNetwork((v) => !v)} className="rounded-full bg-white px-6 py-3 font-extrabold shadow-cute border-2 border-foreground">
                    {wrongNetwork ? "🔴 Wrong Network" : "🟢 Monad Mainnet"}
                  </button>
                )}
                <a href="#pools" className="rounded-full bg-white px-6 py-3 font-extrabold shadow-cute border-2 border-foreground hover:scale-105 transition">View Pools</a>
              </div>
            </div>
            <div className="relative flex justify-center">
              <motion.div animate={{ rotate: [0,5,-5,0] }} transition={{ duration: 6, repeat: Infinity }} className="relative">
                <div className="absolute inset-0 rounded-[40px] bg-white blur-2xl opacity-60" />
                <div className="relative rounded-[40px] bg-white border-4 border-foreground shadow-pop p-6 w-72">
                  <div className="text-center text-xs font-extrabold opacity-70">🍌 BANANA VAULT</div>
                  <motion.img src={logo.url} alt="vault" className="mx-auto mt-2 h-32 w-32 rounded-full ring-banana" animate={{ y: [0,-10,0] }} transition={{ duration: 3, repeat: Infinity }} />
                  <div className="mt-3 text-center font-extrabold text-2xl">128.42 MON</div>
                  <div className="text-center text-xs font-bold opacity-70">staked & earning</div>
                  <div className="mt-3 flex justify-around text-2xl">
                    <motion.span animate={{ y: [0,-6,0] }} transition={{ duration: 1.6, repeat: Infinity }}>🪙</motion.span>
                    <motion.span animate={{ y: [0,-6,0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.2 }}>🍌</motion.span>
                    <motion.span animate={{ y: [0,-6,0] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}>🪙</motion.span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* NETWORK WARNING */}
      {connected && wrongNetwork && (
        <section className="mx-auto max-w-7xl px-4 mt-6">
          <div className="rounded-3xl border-4 border-[color:var(--orange-accent)] bg-[color:var(--banana-cream)] p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-cute">
            <div className="font-extrabold text-lg">⚠ Please switch to Monad Mainnet to use the vault.</div>
            <button onClick={fakeSwitch} className="rounded-full bg-foreground text-[color:var(--banana)] px-5 py-2 font-extrabold shadow-cute">Switch Network</button>
          </div>
        </section>
      )}

      {/* WALLET + PROTOCOL */}
      <section className="mx-auto max-w-7xl px-4 mt-10 grid lg:grid-cols-3 gap-5">
        <div className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute">
          <div className="flex items-center gap-3">
            <img src={logo.url} className="h-12 w-12 rounded-full ring-banana" alt="" />
            <div>
              <div className="text-xs font-extrabold opacity-70">CONNECTED WALLET</div>
              <div className="font-extrabold">{connected ? addr : "Not connected"}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Mini label="MON" value={connected ? mon.toFixed(2) : "—"} emoji="🟣" />
            <Mini label="$JAMES" value={connected ? james.toLocaleString() : "—"} emoji="🍌" />
            <Mini label="Tier" value={`${tier.emoji} ${tier.name}`} emoji="🏅" />
            <Mini label="Bonus" value={`+${tier.bonus}%`} emoji="✨" />
          </div>
        </div>
        <div className="lg:col-span-2 rounded-[28px] bg-banana-gradient p-6 shadow-cute border-2 border-white">
          <h3 className="font-extrabold text-2xl">📊 Protocol Dashboard</h3>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Total MON Staked", v: 482_910, s: "" },
              { l: "Rewards Reserved", v: 91_220, s: "" },
              { l: "Distributed", v: 38_400, s: "" },
              { l: "Active Stakes", v: 2_318, s: "" },
              { l: "Vault Balance", v: 612_000, s: "" },
              { l: "Allowance", v: 250_000, s: "" },
              { l: "Coverage", v: 84, s: "%" },
              { l: "Users", v: 7421, s: "" },
            ].map((m) => (
              <div key={m.l} className="rounded-2xl bg-white/90 p-3 text-center shadow-cute">
                <div className="text-[10px] font-extrabold opacity-60">{m.l}</div>
                <div className="text-lg font-extrabold"><Counter to={m.v} suffix={m.s} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="mx-auto max-w-7xl px-4 mt-10">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center">🏅 Tier System</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { n: "Bronze", e: "🍌", b: 0 },
            { n: "Silver", e: "🍌🍌", b: 10 },
            { n: "Gold", e: "🍌🍌🍌", b: 25 },
            { n: "Diamond", e: "👑🍌", b: 50 },
          ].map((t) => (
            <motion.div whileHover={{ y: -6, rotate: -1 }} key={t.n} className={`rounded-[24px] p-5 border-2 border-white shadow-cute text-center ${tier.name===t.n ? "bg-banana-gradient ring-banana" : "bg-white"}`}>
              <div className="text-4xl">{t.e}</div>
              <div className="mt-2 font-extrabold text-xl">{t.n}</div>
              <div className="text-sm font-bold opacity-70">+{t.b}% rewards bonus</div>
              {tier.name===t.n && <div className="mt-2 text-xs font-extrabold">YOUR TIER ✨</div>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* POOLS + STAKE FORM */}
      <section id="pools" className="mx-auto max-w-7xl px-4 mt-12 grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold">🍌 Staking Pools</h2>
          <p className="font-bold text-foreground/70 mt-1">Pick your banana adventure.</p>
          <div className="mt-5 space-y-4">
            {POOLS.map((p) => (
              <motion.button whileHover={{ scale: 1.01 }} key={p.id} onClick={() => setPool(p)}
                className={`w-full text-left rounded-[24px] p-5 border-4 shadow-cute transition ${pool.id===p.id ? "border-foreground" : "border-white"} ${p.color}`}>
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
          <h3 className="font-extrabold text-2xl">🧮 Reward Calculator</h3>
          <label className="mt-4 block text-sm font-extrabold opacity-70">Stake amount (MON)</label>
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-[color:var(--banana-cream)] p-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="flex-1 bg-transparent px-3 py-2 outline-none font-extrabold text-xl" />
            <button onClick={() => setAmount(mon.toString())} className="rounded-full bg-foreground text-[color:var(--banana)] px-3 py-1.5 text-xs font-extrabold">MAX</button>
          </div>
          <div className="mt-4 space-y-2">
            <Row k="Pool" v={`${pool.emoji} ${pool.name} · ${pool.days}d · ${pool.apy}%`} />
            <Row k="Estimated Reward" v={`${base.toFixed(4)} MON`} />
            <Row k={`Tier Bonus (${tier.name})`} v={`+${bonus.toFixed(4)} MON`} />
            <div className="h-px bg-[color:var(--banana)]/40 my-2" />
            <Row k="Final Reward" v={`${finalReward.toFixed(4)} MON`} highlight />
          </div>
          <button onClick={stake} className="mt-5 w-full rounded-2xl bg-banana-gradient py-4 font-extrabold text-lg shadow-cute border-2 border-white hover:scale-[1.02] transition">
            🍌 Stake Now
          </button>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-extrabold">
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Vault Coverage: 84% 🟢</div>
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Allowance: OK 🟢</div>
            <div className="rounded-xl bg-[color:var(--banana-cream)] py-2">Emergency: Off 🟢</div>
          </div>
        </div>
      </section>

      {/* ACTIVE STAKES */}
      <section className="mx-auto max-w-7xl px-4 mt-12">
        <h2 className="text-3xl md:text-4xl font-extrabold">🎫 Your Banana Certificates</h2>
        {stakes.length === 0 ? (
          <div className="mt-6 rounded-[28px] border-4 border-dashed border-[color:var(--banana)] bg-white p-10 text-center font-extrabold text-foreground/60">
            No stakes yet. Mint your first banana certificate above! 🍌
          </div>
        ) : (
          <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stakes.map((s) => {
              const reward = (s.amount * s.pool.apy * s.pool.days) / 365 / 100 * (1 + tier.bonus / 100);
              const unlock = s.start + s.pool.days * 86400_000;
              const remaining = Math.max(0, unlock - Date.now());
              const d = Math.floor(remaining / 86400_000);
              const h = Math.floor((remaining % 86400_000) / 3600_000);
              return (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={s.id}
                  className="rounded-[24px] bg-banana-gradient p-1 shadow-pop">
                  <div className="rounded-[20px] bg-white p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-3xl">{s.pool.emoji}</div>
                      <span className="rounded-full bg-[color:var(--banana-cream)] px-2 py-0.5 text-[10px] font-extrabold">{tier.emoji} {tier.name}</span>
                    </div>
                    <div className="mt-2 font-extrabold text-xl">{s.pool.name}</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <Cell k="Amount" v={`${s.amount} MON`} />
                      <Cell k="Duration" v={`${s.pool.days}d`} />
                      <Cell k="Reward" v={`${reward.toFixed(3)} MON`} />
                      <Cell k="Unlock" v={remaining ? `${d}d ${h}h` : "Ready ✅"} />
                    </div>
                    <button onClick={() => claim(s)} className="mt-4 w-full rounded-xl bg-foreground text-[color:var(--banana)] py-2.5 font-extrabold shadow-cute hover:scale-[1.02] transition">
                      {remaining ? "⚠ Early Claim" : "🎉 Claim Rewards"}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* BURN MODAL */}
      {burnOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm px-4">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="max-w-md w-full rounded-[28px] bg-white p-6 border-4 border-[color:var(--orange-accent)] shadow-pop">
            <div className="text-center text-5xl">🔥🍌</div>
            <h3 className="mt-3 text-2xl font-extrabold text-center">⚠ Banana Burn Warning</h3>
            <p className="mt-2 text-sm font-semibold text-foreground/80 text-center">
              Early claim burns $JAMES bananas as a penalty. This is permanent and cannot be reversed.
            </p>
            <div className="mt-4 rounded-2xl bg-[color:var(--banana-cream)] p-4 space-y-2 text-sm">
              <Row k="Required Burn" v="25,000 $JAMES" />
              <Row k="Current Balance" v={`${james.toLocaleString()} $JAMES`} />
              <Row k="Penalty" v="20% of reward" />
              <Row k="Burn Address" v="0x000…dEaD" />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setBurnOpen(null)} className="flex-1 rounded-2xl bg-[color:var(--banana-cream)] py-3 font-extrabold">Cancel</button>
              <button onClick={confirmBurn} className="flex-1 rounded-2xl bg-[color:var(--orange-accent)] text-white py-3 font-extrabold shadow-cute">🔥 Confirm Burn</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

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
function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-[color:var(--banana-cream)] p-2">
      <div className="text-[10px] font-extrabold opacity-60">{k}</div>
      <div className="font-extrabold">{v}</div>
    </div>
  );
}