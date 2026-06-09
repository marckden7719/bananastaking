import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import logo from "@/assets/logobanana.jpg?url";
import banner from "@/assets/bannerbanana.jpeg?url";
import asset1 from "@/assets/assets1.jpg?url";
import asset2 from "@/assets/assets2.jpeg?url";
import video from "@/assets/videobanana.mp4?url";
import { FloatingBananas } from "@/components/site/FloatingBananas";
import { Counter } from "@/components/site/Counter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JAMES BANANA | AI Meme Video Generator On Monad" },
      { name: "description", content: "James Banana — the mysterious cat trapped in a banana peel. Create AI meme videos, watch Banana TV, and stake $JAMES on Monad." },
      { property: "og:title", content: "JAMES BANANA | AI Meme Video Generator On Monad" },
      { property: "og:description", content: "Create hilarious AI-generated meme videos with James Banana and stake on Monad." },
      { property: "og:image", content: logo },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return <section id={id} className={`relative mx-auto max-w-7xl px-4 py-16 md:py-24 ${className}`}>{children}</section>;
}

function Index() {
  return (
    <>
      {/* HERO */}
      <Section className="!pt-10">
        <div className="relative overflow-hidden rounded-[36px] border-4 border-white shadow-pop">
          <img src={banner} alt="Banana Meme — New King Meme — $JAMES THE BANANA" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--banana)]/70 via-[color:var(--banana-cream)]/40 to-[color:var(--leaf)]/30" />
          <FloatingBananas count={18} />
          <div className="relative grid md:grid-cols-2 gap-8 p-6 md:p-14">
            <div>
              <motion.span initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-sm font-extrabold shadow-cute">
                🚀 Live on Monad Mainnet · $JAMES
              </motion.span>
              <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mt-4 font-display text-5xl md:text-7xl font-extrabold leading-[0.95] drop-shadow-[0_3px_0_rgba(255,255,255,0.6)]">
                JAMES <br /> <span className="text-[color:var(--orange-accent)]">BANANA</span>
              </motion.h1>
              <p className="mt-4 text-xl md:text-2xl font-extrabold text-foreground/90">
                The First AI Meme Video Generator On Monad
              </p>
              <p className="mt-3 max-w-xl text-base md:text-lg font-semibold text-foreground/80">
                Create hilarious AI-powered meme videos in seconds and unleash chaos across the internet. 🍌💥
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#studio" className="rounded-full bg-foreground text-[color:var(--banana)] px-6 py-3 font-extrabold shadow-cute hover:scale-105 transition">🍌 Create Meme</a>
                <a href="#tv" className="rounded-full bg-white px-6 py-3 font-extrabold shadow-cute border-2 border-[color:var(--banana)] hover:scale-105 transition">🎬 Watch Videos</a>
                <a href="https://x.com/jamescatbanana" target="_blank" rel="noreferrer" className="rounded-full bg-[color:var(--leaf)] text-white px-6 py-3 font-extrabold shadow-cute hover:scale-105 transition">🚀 Join Community</a>
              </div>
            </div>
            <div className="relative flex items-center justify-center min-h-[280px]">
              <motion.div className="absolute h-64 w-64 md:h-80 md:w-80 rounded-full bg-banana-gradient blur-2xl opacity-60" animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }} />
              <motion.img
                src={logo}
                alt="James Banana mascot"
                className="relative h-64 w-64 md:h-80 md:w-80 rounded-full ring-banana shadow-pop border-4 border-white"
                animate={{ y: [0, -20, 0], rotate: [-4, 4, -4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="absolute top-2 right-2 text-4xl animate-sparkle">✨</span>
              <span className="absolute bottom-2 left-2 text-4xl animate-sparkle" style={{ animationDelay: "0.5s" }}>🍌</span>
              <span className="absolute top-1/2 -right-2 text-3xl animate-float">😂</span>
            </div>
          </div>
        </div>
      </Section>

      {/* ABOUT */}
      <Section id="about">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="relative">
            <img src={asset1} alt="Banana Cat character design notes" className="rounded-[28px] border-4 border-white shadow-pop rotate-[-3deg]" />
            <div className="absolute -bottom-4 -right-4 rounded-2xl bg-[color:var(--leaf)] text-white px-4 py-2 font-extrabold shadow-cute rotate-3">PROJECT B</div>
          </div>
          <div>
            <span className="inline-block rounded-full bg-[color:var(--banana-cream)] px-3 py-1 text-xs font-extrabold">📖 The legend</span>
            <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">Who is James Banana?</h2>
            <div className="mt-5 space-y-4 text-lg font-semibold text-foreground/85">
              <p>James Banana is a mysterious cat trapped inside a banana peel. <strong>Nobody knows where he came from.</strong></p>
              <p>Some say he escaped an abandoned AI experiment. Others believe he was born from pure internet chaos.</p>
              <p>Today he spends his days creating absurd meme videos and spreading laughter throughout the Monad ecosystem. 🍌⚡</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Creativity","Humor","Community","Internet Culture","Meme Innovation"].map(t => (
                <span key={t} className="rounded-full bg-white border-2 border-[color:var(--banana)] px-3 py-1 text-sm font-extrabold shadow-cute">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* WHY */}
      <Section>
        <h2 className="text-center text-4xl md:text-5xl font-extrabold">Why James Banana?</h2>
        <p className="text-center mt-2 text-foreground/70 font-bold">Collect 'em all. 🍌</p>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { e: "🤖", t: "AI Meme Generator", d: "Turn any image into pure chaos with one click." },
            { e: "🎬", t: "Viral Video Creation", d: "Captions, voices, vibes — auto-edited for max laughs." },
            { e: "💛", t: "Community Powered", d: "Built by memers, for memers. 100% banana energy." },
            { e: "⚡", t: "Monad Speed", d: "Blazing-fast txs so your memes ship instantly." },
            { e: "🎨", t: "Creator Friendly", d: "Earn rewards every time the timeline laughs." },
            { e: "🌐", t: "Internet Native", d: "If it's online, James Banana is already there." },
          ].map((c, i) => (
            <motion.div key={c.t} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              whileHover={{ y: -6, rotate: -1 }}
              className="rounded-[28px] bg-white border-2 border-[color:var(--banana)] p-6 shadow-cute relative overflow-hidden">
              <div className="absolute -top-6 -right-6 text-7xl opacity-20">{c.e}</div>
              <div className="text-4xl">{c.e}</div>
              <h3 className="mt-3 text-xl font-extrabold">{c.t}</h3>
              <p className="mt-1 font-semibold text-foreground/70">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* STUDIO */}
      <Section id="studio">
        <div className="rounded-[36px] bg-banana-gradient p-1 shadow-pop">
          <div className="rounded-[32px] bg-[color:var(--banana-cream)] p-8 md:p-12 relative overflow-hidden">
            <FloatingBananas count={8} />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-block rounded-full bg-foreground text-[color:var(--banana)] px-3 py-1 text-xs font-extrabold">🎨 BANANA STUDIO</span>
                <h2 className="mt-3 text-4xl md:text-5xl font-extrabold">Turn any meme into a viral video</h2>
                <p className="mt-3 text-lg font-semibold text-foreground/80 max-w-lg">Drag, drop, and let James Banana do the rest. AI captions, AI voices, AI chaos.</p>
                <ol className="mt-6 space-y-3">
                  {["Upload Image","Generate Animation","Add Meme Voice","Add Captions","Export Video","Share To Social Media"].map((s,i)=>(
                    <li key={s} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-cute font-extrabold">
                      <span className="grid place-items-center h-8 w-8 rounded-full bg-banana-gradient text-foreground">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <StudioMockup />
            </div>
          </div>
        </div>
      </Section>

      {/* BANANA TV */}
      <Section id="tv">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold">📺 Banana TV</h2>
          <p className="mt-2 font-bold text-foreground/70">Featured nonsense from the James Banana cinematic universe.</p>
        </div>
        <div className="mt-10 relative mx-auto max-w-3xl">
          <div className="relative rounded-[32px] border-4 border-[color:var(--banana)] bg-[color:var(--banana-cream)] p-3 shadow-pop">
            <video src={video} autoPlay loop muted playsInline className="w-full rounded-[20px]" />
            <span className="absolute -top-6 -left-6 text-5xl animate-float">🤣</span>
            <span className="absolute -top-8 right-10 text-4xl animate-float" style={{ animationDelay: "0.6s" }}>😂</span>
            <span className="absolute -bottom-6 -right-6 text-5xl animate-float" style={{ animationDelay: "1.2s" }}>🔥</span>
            <span className="absolute -bottom-7 left-10 text-4xl animate-float" style={{ animationDelay: "0.3s" }}>🚀</span>
            <span className="absolute top-1/2 -right-8 text-4xl animate-sparkle">🍌</span>
          </div>
        </div>
      </Section>

      {/* GALLERY */}
      <Section>
        <h2 className="text-4xl md:text-5xl font-extrabold text-center">🖼 Banana Archives</h2>
        <div className="mt-10 columns-1 sm:columns-2 lg:columns-3 gap-5 [column-fill:_balance]">
          {[asset1, banner, asset2, logo].map((src,i)=>(
            <motion.div key={i} whileHover={{ scale: 1.03, rotate: i % 2 ? 1 : -1 }} className="mb-5 break-inside-avoid rounded-[24px] overflow-hidden border-4 border-white shadow-cute bg-white">
              <img src={src} alt={`Banana archive ${i+1}`} loading="lazy" className="w-full h-auto block" />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ROADMAP */}
      <Section id="roadmap">
        <h2 className="text-4xl md:text-5xl font-extrabold text-center">🗺 The Banana Roadmap</h2>
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { p: "Phase 1", e: "🍌", t: "Genesis", items: ["Launch James Banana","Community Building","Website Launch"] },
            { p: "Phase 2", e: "🎨", t: "Studio Era", items: ["AI Meme Generator Beta","Banana Studio","Creator Tools"] },
            { p: "Phase 3", e: "⚡", t: "Monad Expansion", items: ["Ecosystem Push","Community Events","Creator Rewards"] },
            { p: "Phase 4", e: "👑", t: "World Domination", items: ["Global Meme Reign","Mobile App","Advanced AI"] },
          ].map((ph,i)=>(
            <motion.div key={ph.p} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i*0.08 }}
              className={`rounded-[28px] p-6 shadow-cute border-2 border-white ${i%2===0 ? "bg-banana-gradient" : "bg-white"} relative`}>
              <div className="text-5xl">{ph.e}</div>
              <div className="mt-2 text-xs font-extrabold opacity-70">{ph.p}</div>
              <h3 className="text-2xl font-extrabold">{ph.t}</h3>
              <ul className="mt-3 space-y-1.5 font-semibold text-foreground/85">
                {ph.items.map(it => <li key={it} className="flex gap-2"><span>✅</span>{it}</li>)}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* COMMUNITY */}
      <Section id="community">
        <div className="rounded-[36px] bg-white border-2 border-[color:var(--banana)] p-8 md:p-12 shadow-pop relative overflow-hidden">
          <div className="absolute -left-10 -top-10 text-[180px] opacity-10 select-none">🍌</div>
          <h2 className="text-center text-4xl md:text-5xl font-extrabold">The Banana Army</h2>
          <p className="text-center mt-2 font-bold text-foreground/70">Numbers go up. Memes go viral. 🚀</p>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { n: 42000, s: "+", l: "Followers", e: "🐦" },
              { n: 18750, s: "+", l: "Videos Generated", e: "🎬" },
              { n: 9120, s: "", l: "Community Members", e: "💛" },
              { n: 3200000, s: "+", l: "Meme Views", e: "👀" },
            ].map(c => (
              <div key={c.l} className="rounded-3xl bg-banana-gradient p-5 text-center shadow-cute border-2 border-white">
                <div className="text-3xl">{c.e}</div>
                <div className="mt-2 text-3xl md:text-4xl font-extrabold"><Counter to={c.n} suffix={c.s} /></div>
                <div className="text-sm font-extrabold opacity-80">{c.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="https://x.com/jamescatbanana" target="_blank" rel="noreferrer" onClick={() => toast.success("🍌 See you on X!")} className="rounded-full bg-foreground text-[color:var(--banana)] px-6 py-3 font-extrabold shadow-cute hover:scale-105 transition">Follow @jamescatbanana</a>
            <Link to="/staking" className="rounded-full bg-banana-gradient px-6 py-3 font-extrabold shadow-cute border-2 border-white hover:scale-105 transition">🍌 Enter the Vault</Link>
          </div>
        </div>
      </Section>
    </>
  );
}

function StudioMockup() {
  return (
    <div className="rounded-[28px] bg-foreground/95 p-4 shadow-pop border-4 border-white">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-yellow-300" />
        <span className="h-3 w-3 rounded-full bg-green-400" />
        <span className="ml-3 text-xs font-extrabold text-white/70">banana-studio.app</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 rounded-2xl bg-[color:var(--banana-cream)] p-3">
          <div className="aspect-video rounded-xl bg-banana-gradient grid place-items-center relative overflow-hidden">
            <span className="text-7xl animate-wobble">🍌</span>
            <span className="absolute top-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold">PREVIEW</span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white overflow-hidden"><div className="h-full w-2/3 bg-banana-gradient" /></div>
          <div className="mt-2 text-[11px] font-extrabold text-foreground/70">Rendering meme magic... 66%</div>
        </div>
        <div className="rounded-2xl bg-white p-3 space-y-2">
          {["Upload","Animate","Voice","Caption","Export"].map((s,i)=>(
            <div key={s} className={`rounded-xl px-2 py-1.5 text-xs font-extrabold ${i<3 ? "bg-banana-gradient" : "bg-[color:var(--banana-cream)]"}`}>{i<3 ? "✅ " : "○ "}{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
