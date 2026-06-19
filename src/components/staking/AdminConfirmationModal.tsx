// ---------------------------------------------------------------------------
// AdminConfirmationModal — reusable confirmation for admin actions
// ---------------------------------------------------------------------------

import { motion } from "framer-motion";
import type { Address } from "viem";

interface AdminConfirmationModalProps {
  action: string;
  description: string;
  contract: Address;
  wallet: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

export function AdminConfirmationModal({
  action,
  description,
  contract,
  wallet,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  danger = true,
}: AdminConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 backdrop-blur-sm px-4">
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full rounded-[28px] bg-white p-6 border-4 border-red-300 shadow-pop"
      >
        <div className="text-center text-5xl">{danger ? "⚠️" : "🔧"}</div>
        <h3 className="mt-3 text-2xl font-extrabold text-center">{action}</h3>
        <p className="mt-2 text-sm font-semibold text-foreground/80 text-center">
          {description}
        </p>

        <div className="mt-4 rounded-2xl bg-[color:var(--banana-cream)] p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">Action</span>
            <span className="font-extrabold text-red-600">{action}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">Contract</span>
            <span className="font-extrabold text-xs font-mono">
              {contract.slice(0, 8)}…{contract.slice(-6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold opacity-70">Wallet</span>
            <span className="font-extrabold text-xs font-mono">
              {wallet.slice(0, 8)}…{wallet.slice(-6)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-[color:var(--banana-cream)] py-3 font-extrabold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-2xl py-3 font-extrabold shadow-cute text-white ${
              danger ? "bg-red-600" : "bg-foreground"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
