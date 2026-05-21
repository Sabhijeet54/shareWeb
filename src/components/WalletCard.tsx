"use client";

import { FiArrowUpRight, FiShield } from "react-icons/fi";

export function WalletCard({ balance }: { balance: number }) {
  return (
    <section className="rounded-[1.5rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-900 to-slate-900 p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-100/80">
            Wallet balance
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white truncate">
            ₹{balance.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
          <FiShield size={22} />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3 text-sm">
        <span className="text-emerald-100/60">Manual deposits enabled</span>
        <span className="flex items-center gap-1 font-semibold text-emerald-300">
          Funds <FiArrowUpRight />
        </span>
      </div>
    </section>
  );
}
