import { motion } from "framer-motion";

const items = ["🍌","✨","🍌","⭐","🍌","💛","🍌"];

export function FloatingBananas({ count = 14 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 97) % 100;
        const top = (i * 53) % 100;
        const delay = (i % 7) * 0.4;
        const size = 18 + ((i * 13) % 28);
        return (
          <motion.span
            key={i}
            initial={{ y: 0, rotate: 0, opacity: 0 }}
            animate={{ y: [0, -20, 0], rotate: [0, 15, -10, 0], opacity: [0, 1, 1, 0.8] }}
            transition={{ duration: 6 + (i % 4), repeat: Infinity, delay, ease: "easeInOut" }}
            className="absolute select-none"
            style={{ left: `${left}%`, top: `${top}%`, fontSize: size }}
          >
            {items[i % items.length]}
          </motion.span>
        );
      })}
    </div>
  );
}