import { WagmiProvider } from "wagmi";
import { useEffect, type ReactNode } from "react";
import { wagmiConfig, initAppKit } from "@/lib/web3/config";

export function Web3Provider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAppKit();
  }, []);
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}