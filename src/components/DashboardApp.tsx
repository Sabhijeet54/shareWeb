"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FiLogOut, FiTrendingUp, FiHome, FiZap, FiBarChart2, FiBriefcase,
  FiPieChart, FiPackage, FiCreditCard, FiUser, FiGrid, FiFileText,
  FiLayers, FiBook, FiSliders, FiActivity, FiSun, FiMoon, FiGlobe,
} from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { BottomNav, type TabKey } from "@/components/BottomNav";
import { BrokerageCalculator } from "@/components/BrokerageCalculator";
import { ChartPanel } from "@/components/ChartPanel";
import { DashboardHome } from "@/components/DashboardHome";
import { FundsPage } from "@/components/FundsPage";
import { HoldingsPage } from "@/components/HoldingsPage";
import { MarketOverview } from "@/components/MarketOverview";
import { OptionsChain } from "@/components/OptionsChain";
import { OrdersPage } from "@/components/OrdersPage";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { PositionsPage } from "@/components/PositionsPage";
import { ProfilePage } from "@/components/ProfilePage";
import { ReportsPage } from "@/components/ReportsPage";
import { ScreenerPage } from "@/components/ScreenerPage";
import { StrategyBuilder } from "@/components/StrategyBuilder";
import { TradingJournal } from "@/components/TradingJournal";
import { WalletCard } from "@/components/WalletCard";
import { GlobalMarkets } from "@/components/GlobalMarkets";
import { NewsSection } from "@/components/NewsSection";
import { CompanyProfile } from "@/components/CompanyProfile";
import { equitySymbols } from "@/lib/marketData";

type NavItem = { key: TabKey; label: string; icon: React.ReactNode; group?: string };

const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Dashboard", icon: <FiHome size={15} />, group: "Market" },
  { key: "watchlist", label: "Watchlist", icon: <FiZap size={15} />, group: "Market" },
  { key: "chart", label: "Charts", icon: <FiBarChart2 size={15} />, group: "Market" },
  { key: "options", label: "F&O Chain", icon: <FiLayers size={15} />, group: "Market" },
  { key: "screener", label: "Screener", icon: <FiGrid size={15} />, group: "Market" },
  { key: "globalMarkets", label: "Global Markets", icon: <FiGlobe size={15} />, group: "Market" },
  { key: "news", label: "News", icon: <FiFileText size={15} />, group: "Market" },
  { key: "companyProfile", label: "Company", icon: <FiActivity size={15} />, group: "Market" },
  { key: "portfolio", label: "Portfolio", icon: <FiPieChart size={15} />, group: "Portfolio" },
  { key: "positions", label: "Positions", icon: <FiActivity size={15} />, group: "Portfolio" },
  { key: "holdings", label: "Holdings", icon: <FiPackage size={15} />, group: "Portfolio" },
  { key: "orders", label: "Orders", icon: <FiBriefcase size={15} />, group: "Portfolio" },
  { key: "reports", label: "Reports", icon: <FiFileText size={15} />, group: "Portfolio" },
  { key: "strategy", label: "Strategy", icon: <FiZap size={15} />, group: "Tools" },
  { key: "brokerage", label: "Brokerage", icon: <FiSliders size={15} />, group: "Tools" },
  { key: "journal", label: "Journal", icon: <FiBook size={15} />, group: "Tools" },
  { key: "funds", label: "Funds", icon: <FiCreditCard size={15} />, group: "Account" },
  { key: "profile", label: "Profile", icon: <FiUser size={15} />, group: "Account" },
];

const GROUPS = ["Market", "Portfolio", "Tools", "Account"];

// "More" drawer for mobile
function MoreDrawer({ onChange, onClose }: { onChange: (t: TabKey) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full rounded-t-[2rem] border border-[var(--card-border)] bg-[var(--dropdown-bg)] p-5 pb-10"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--divider)]" />
        <p className="mb-4 text-sm font-bold text-[var(--text-primary)]">More Features</p>
        <div className="grid grid-cols-3 gap-3">
          {NAV_ITEMS.filter((i) => !["home","watchlist","chart","portfolio","orders","funds"].includes(i.key)).map((item) => (
            <button key={item.key} type="button" onClick={() => { onChange(item.key); onClose(); }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-center">
              <span className="text-[var(--accent-label)]">{item.icon}</span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{item.label}</span>
              {item.group && <span className="text-[10px] text-[var(--text-muted)]">{item.group}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardApp() {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Persist active tab + chart symbol in sessionStorage so refresh stays on same screen
  const [activeTab, setActiveTabRaw] = useState<TabKey>(() => {
    if (typeof window !== "undefined") {
      return (sessionStorage.getItem("sw_tab") as TabKey) || "home";
    }
    return "home";
  });
  const [chartSymbol, setChartSymbol] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("sw_chart") || equitySymbols[0] || "RELIANCE";
    return equitySymbols[0] || "RELIANCE";
  });
  const [profileSymbol, setProfileSymbol] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("sw_profile") || "RELIANCE";
    return "RELIANCE";
  });
  const [prevTab, setPrevTab] = useState<TabKey | null>(null);
  const [showMore, setShowMore] = useState(false);
  const balance = profile?.walletBalance ?? 0;

  const setActiveTab = useCallback((tab: TabKey) => {
    setActiveTabRaw((prev) => {
      setPrevTab(prev);
      return tab;
    });
    if (typeof window !== "undefined") sessionStorage.setItem("sw_tab", tab);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sw_chart", chartSymbol);
      sessionStorage.setItem("sw_profile", profileSymbol);
    }
  }, [chartSymbol, profileSymbol]);

  function openChart(symbol: string) {
    setChartSymbol(symbol);
    setActiveTab("chart");
  }

  function openProfile(symbol: string) {
    setProfileSymbol(symbol);
    setActiveTab("companyProfile");
  }

  function goBack() {
    if (prevTab) {
      setActiveTab(prevTab);
    } else {
      setActiveTab("home");
    }
  }

  function handleTabChange(tab: TabKey) {
    if (tab === "more") {
      setShowMore(true);
    } else {
      setActiveTab(tab);
      setShowMore(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {showMore && <MoreDrawer onChange={(t) => { setActiveTab(t); setShowMore(false); }} onClose={() => setShowMore(false)} />}

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-28 pt-5 md:px-6 md:pb-10">
        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
              <FiTrendingUp size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-label)]">ShareWeb</p>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Indian Markets</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              {theme === "dark" ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <button type="button" onClick={logout}
              className="hidden h-11 items-center gap-2 rounded-2xl border border-[var(--card-border)] px-4 text-sm font-semibold text-[var(--text-secondary)] md:flex">
              <FiLogOut /> Logout
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <WalletCard balance={balance} />


            {/* Desktop nav */}
            <nav className="hidden rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-3 md:block">
              {GROUPS.map((group) => {
                const items = NAV_ITEMS.filter((i) => i.group === group);
                return (
                  <div key={group} className="mb-3">
                    <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{group}</p>
                    {items.map((tab) => (
                      <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                        className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                          activeTab === tab.key
                            ? "bg-emerald-400/15 text-[var(--accent-label)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]"
                        }`}>
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <section className="min-w-0">
            {activeTab === "home" && <DashboardHome balance={balance} onSelectSymbol={openChart} />}
            {activeTab === "watchlist" && <MarketOverview balance={balance} />}
            {activeTab === "chart" && <ChartPanel symbol={chartSymbol} onBack={goBack} />}
            {activeTab === "options" && <OptionsChain />}
            {activeTab === "screener" && <ScreenerPage onSelectSymbol={openChart} />}
            {activeTab === "globalMarkets" && <GlobalMarkets onSelectSymbol={openChart} />}
            {activeTab === "news" && <NewsSection />}
            {activeTab === "companyProfile" && <CompanyProfile symbol={profileSymbol} onSelectSymbol={openChart} />}
            {activeTab === "portfolio" && <PortfolioDashboard balance={balance} />}
            {activeTab === "positions" && <PositionsPage />}
            {activeTab === "holdings" && <HoldingsPage />}
            {activeTab === "orders" && <OrdersPage />}
            {activeTab === "reports" && <ReportsPage />}
            {activeTab === "strategy" && <StrategyBuilder />}
            {activeTab === "brokerage" && <BrokerageCalculator />}
            {activeTab === "journal" && <TradingJournal />}
            {activeTab === "funds" && <FundsPage balance={balance} />}
            {activeTab === "profile" && <ProfilePage balance={balance} />}
          </section>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onChange={handleTabChange} />
    </main>
  );
}
