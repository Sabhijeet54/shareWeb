"use client";

import { IconType } from "react-icons";
import { FiBriefcase, FiCreditCard, FiUser, FiZap } from "react-icons/fi";

export type TabKey = "watchlist" | "orders" | "funds" | "profile";

const tabs: Array<{ key: TabKey; label: string; icon: IconType }> = [
  { key: "watchlist", label: "Watchlist", icon: FiZap },
  { key: "orders", label: "Orders", icon: FiBriefcase },
  { key: "funds", label: "Funds", icon: FiCreditCard },
  { key: "profile", label: "Profile", icon: FiUser },
];

export function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#091018]/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-semibold transition ${
                active
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              }`}
            >
              <Icon size={19} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
