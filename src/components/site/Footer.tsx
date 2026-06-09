import logo from "@/assets/logobanana.jpg?url";

export function Footer() {
  return (
    <footer className="mt-20 px-3 pb-6">
      <div className="mx-auto max-w-7xl rounded-3xl bg-banana-gradient p-8 shadow-cute border-2 border-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 text-[160px] opacity-20 select-none">🍌</div>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="James Banana" className="h-14 w-14 rounded-full ring-banana" />
            <div>
              <div className="font-display text-2xl font-extrabold">James Banana</div>
              <div className="text-sm font-bold opacity-80">$JAMES · Monad Mainnet</div>
            </div>
          </div>
          <div className="flex items-center gap-3 font-bold">
            <a href="https://x.com/jamescatbanana" target="_blank" rel="noreferrer" className="rounded-full bg-white px-4 py-2 shadow-cute hover:scale-105 transition">🐦 @jamescatbanana</a>
            <a href="/staking" className="rounded-full bg-foreground text-[color:var(--banana)] px-4 py-2 shadow-cute hover:scale-105 transition">🍌 Vault</a>
          </div>
        </div>
        <div className="relative mt-6 text-center text-xs font-bold opacity-70">
          © {new Date().getFullYear()} James Banana. Forgotten fruit. Eternal meme.
        </div>
      </div>
    </footer>
  );
}