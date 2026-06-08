import { Link } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/logobanana.jpg.asset.json";

const links = [
  { href: "/#about", label: "About" },
  { href: "/#studio", label: "Studio" },
  { href: "/#tv", label: "Banana TV" },
  { href: "/#roadmap", label: "Roadmap" },
  { href: "/#community", label: "Community" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 px-3 pt-3">
      <div className="mx-auto max-w-7xl rounded-3xl border-2 border-[color:var(--banana)]/40 bg-white/85 backdrop-blur-md shadow-cute">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img src={logo.url} alt="James Banana" className="h-10 w-10 rounded-full ring-banana group-hover:animate-wobble" />
            <span className="font-display text-xl font-extrabold tracking-tight">
              James <span className="text-[color:var(--orange-accent)]">Banana</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="px-3 py-2 rounded-full text-sm font-bold text-foreground/80 hover:bg-[color:var(--banana-light)] hover:text-foreground transition">
                {l.label}
              </a>
            ))}
            <Link to="/staking" className="ml-2 px-4 py-2 rounded-full bg-banana-gradient text-foreground font-extrabold shadow-cute border-2 border-white hover:scale-105 transition">
              🍌 Staking
            </Link>
            <appkit-button balance="hide" size="sm" />
          </nav>
          <button onClick={() => setOpen(!open)} className="md:hidden rounded-full bg-[color:var(--banana)] p-2 shadow-cute" aria-label="menu">
            <span className="block h-0.5 w-5 bg-foreground mb-1"></span>
            <span className="block h-0.5 w-5 bg-foreground mb-1"></span>
            <span className="block h-0.5 w-5 bg-foreground"></span>
          </button>
        </div>
        {open && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="px-3 py-2 rounded-2xl bg-[color:var(--banana-cream)] font-bold">{l.label}</a>
            ))}
            <Link to="/staking" onClick={() => setOpen(false)} className="px-3 py-2 rounded-2xl bg-banana-gradient font-extrabold text-center">🍌 Staking</Link>
          </div>
        )}
      </div>
    </header>
  );
}