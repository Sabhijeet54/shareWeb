"use client";

import type { IconType } from "react-icons";
import {
  FiHome, FiZap, FiBarChart2, FiBriefcase, FiPieChart,
  FiCreditCard, FiUser, FiMoreHorizontal,
} from "react-icons/fi";

export type TabKey =
  | "home"
  | "watchlist"
  | "chart"
  | "orders"
  | "positions"
  | "holdings"
  | "funds"
  | "profile"
  | "options"
  | "screener"
  | "reports"
  | "portfolio"
  | "journal"
  | "strategy"
  | "brokerage"
  | "more";

const primaryTabs: Array<{ key: TabKey; label: string; icon: IconType }> = [
  { key: "home", label: "Home", icon: FiHome },
  { key: "watchlist", label: "Market", icon: FiZap },
  { key: "chart", label: "Chart", icon: FiBarChart2 },
  { key: "portfolio", label: "Portfolio", icon: FiPieChart },
  { key: "orders", label: "Orders", icon: FiBriefcase },
  { key: "funds", label: "Funds", icon: FiCreditCard },
  { key: "more", label: "More", icon: FiMoreHorizontal },
];

export function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#091018]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-7 gap-0.5">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition ${
                active
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
