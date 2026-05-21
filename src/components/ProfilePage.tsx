"use client";

import { FiLogOut, FiUser } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";

export function ProfilePage({ balance }: { balance: number }) {
  const { user, profile, logout } = useAuth();

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-[var(--accent-label)]">
            <FiUser size={24} />
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--text-primary)]">
              {profile?.name ?? "Trading User"}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{user?.email}</p>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-[var(--background)]/80 p-4">
          <p className="text-sm text-[var(--text-secondary)]">Wallet balance</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            Rs. {balance.toLocaleString("en-IN")}
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Bank Details</h2>
        <div className="mt-4 space-y-3 text-sm">
          <p className="flex justify-between gap-4 text-[var(--text-secondary)]">
            Bank <span className="text-right text-[var(--text-primary)]">{profile?.bankName ?? "Not added"}</span>
          </p>
          <p className="flex justify-between gap-4 text-[var(--text-secondary)]">
            Account <span className="text-right text-[var(--text-primary)]">{profile?.accountNumber ?? "Not added"}</span>
          </p>
          <p className="flex justify-between gap-4 text-[var(--text-secondary)]">
            IFSC <span className="text-right text-[var(--text-primary)]">{profile?.ifsc ?? "Not added"}</span>
          </p>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Terms and Conditions</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
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
