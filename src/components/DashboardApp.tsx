"use client";

import { useState } from "react";
import { FiLogOut, FiTrendingUp } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { AdminPanel } from "@/components/AdminPanel";
import { BottomNav, type TabKey } from "@/components/BottomNav";
import { FundsPage } from "@/components/FundsPage";
import { MarketOverview } from "@/components/MarketOverview";
import { OrdersPage } from "@/components/OrdersPage";
import { ProfilePage } from "@/components/ProfilePage";
import { WalletCard } from "@/components/WalletCard";

export function DashboardApp() {
  const { profile, logout, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("watchlist");
  const balance = profile?.walletBalance ?? 0;

  return (
    <main className="min-h-screen bg-[#070b10] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-28 pt-5 md:px-6 md:pb-10">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <FiTrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                TradeLite
              </p>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Market Dashboard
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="hidden h-11 items-center gap-2 rounded-2xl border border-white/10 px-4 text-sm font-semibold text-slate-300 md:flex"
          >
            <FiLogOut /> Logout
          </button>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-5">
            <WalletCard balance={balance} />
            {isAdmin ? <AdminPanel /> : null}
          </aside>

          <section className="space-y-5">
            <div className="hidden grid-cols-4 gap-2 md:grid">
              {(["watchlist", "orders", "funds", "profile"] as TabKey[]).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`h-12 rounded-2xl text-sm font-bold capitalize transition ${
                      activeTab === tab
                        ? "bg-emerald-400 text-slate-950"
                        : "border border-white/10 bg-white/[0.04] text-slate-400"
                    }`}
                  >
                    {tab}
                  </button>
                ),
              )}
            </div>

            {activeTab === "watchlist" ? (
              <MarketOverview balance={balance} />
            ) : null}
            {activeTab === "orders" ? <OrdersPage /> : null}
            {activeTab === "funds" ? <FundsPage balance={balance} /> : null}
            {activeTab === "profile" ? <ProfilePage balance={balance} /> : null}
          </section>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </main>
  );
}
