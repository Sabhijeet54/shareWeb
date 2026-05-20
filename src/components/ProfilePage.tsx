"use client";

import { FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

export function ProfilePage({ balance }: { balance: number }) {
  const { user, profile, logout } = useAuth();

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <FiUser size={24} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              {profile?.name ?? "Trading User"}
            </p>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-black/20 p-4">
          <p className="text-sm text-slate-400">Wallet balance</p>
          <p className="mt-1 text-2xl font-bold text-white">
            Rs. {balance.toLocaleString("en-IN")}
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-semibold text-white">Bank Details</h2>
        <div className="mt-4 space-y-3 text-sm">
          <p className="flex justify-between gap-4 text-slate-400">
            Bank <span className="text-right text-white">{profile?.bankName ?? "Not added"}</span>
          </p>
          <p className="flex justify-between gap-4 text-slate-400">
            Account <span className="text-right text-white">{profile?.accountNumber ?? "Not added"}</span>
          </p>
          <p className="flex justify-between gap-4 text-slate-400">
            IFSC <span className="text-right text-white">{profile?.ifsc ?? "Not added"}</span>
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <h2 className="text-lg font-semibold text-white">Terms and Conditions</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Market data is shown for information only. Funds are credited only
          after admin verification. Keep payment UTR accurate. Trading and
          investment decisions are the user&apos;s responsibility.
        </p>
      </section>

      <button
        type="button"
        onClick={logout}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 text-sm font-bold text-red-200"
      >
        <FiLogOut /> Logout
      </button>
    </div>
  );
}
