"use client";

import { useEffect, useMemo, useState } from "react";
import { FiTrendingUp, FiTrendingDown, FiActivity, FiClock, FiBarChart2 } from "react-icons/fi";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { sectorData, watchlists } from "@/lib/marketData";

// All key symbols we want on the dashboard
const EQUITY_SYMBOLS = [
  "AAPL", "MSFT", "NVDA", "TSLA", "AMD", "META",
];

const INDEX_SYMBOLS: string[] = [];
const DASHBOARD_SYMBOLS = [...INDEX_SYMBOLS, ...EQUITY_SYMBOLS];

// Static fallback from marketData — always available even if API fails
const STATIC_STOCKS = watchlists.stocks;

function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const h = ist.getHours(), m = ist.getMinutes();
  const t = h * 60 + m;
  if (day === 0 || day === 6) return false;
  return t >= 555 && t < 930;
}

function useMarketClock() {
  const [open, setOpen] = useState(isMarketOpen);
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      setOpen(isMarketOpen());
      setTime(new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata",
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { open, time };
}

type StockRow = { symbol: string; price: number; changePct: number; volume: number; isLive: boolean };

export function DashboardHome({
  balance,
  onSelectSymbol,
}: {
  balance: number;
  onSelectSymbol?: (symbol: string) => void;
}) {
  const quotes = useLiveQuotes(DASHBOARD_SYMBOLS, 15000);
  const { open, time } = useMarketClock();

  // Build enriched stock list — prefer live data, fall back to static immediately
  const allStocks = useMemo<StockRow[]>(() => {
    return EQUITY_SYMBOLS.map((sym) => {
      const live = quotes[sym];
      const staticStock = STATIC_STOCKS.find((s) => s.symbol === sym);

      // Live data available and loaded
      if (live && !live.isLoading && live.price > 0) {
        return {
          symbol: sym,
          price: live.price,
          changePct: live.changePct,
          volume: live.volume,
          isLive: true,
        };
      }
      // Fall back to static data
      return {
        symbol: sym,
        price: staticStock?.price ?? 0,
        changePct: staticStock?.change ?? 0,
        volume: 0,
        isLive: false,
      };
    });
  }, [quotes]);

  // Top gainers — sorted by change%, always show top 5 even if all are positive or all negative
  const gainers = useMemo(
    () => [...allStocks].sort((a, b) => b.changePct - a.changePct).slice(0, 5),
    [allStocks],
  );

  // Top losers — bottom 5
  const losers = useMemo(
    () => [...allStocks].sort((a, b) => a.changePct - b.changePct).slice(0, 5),
    [allStocks],
  );

  // Most active — sort by volume (live), fall back to static order
  const mostActive = useMemo(
    () => [...allStocks].sort((a, b) => b.volume - a.volume).slice(0, 5),
    [allStocks],
  );

  // Compute live sector changes from live quotes
  const liveSectors = useMemo(() => {
    return sectorData.map((sec) => {
      const secStocks = sec.stocks
        .map((sym) => quotes[sym])
        .filter((q) => q && !q.isLoading && q.price > 0);
      if (secStocks.length === 0) return sec; // use static
      const avgChange = secStocks.reduce((s, q) => s + q!.changePct, 0) / secStocks.length;
      return { ...sec, change: avgChange };
    });
  }, [quotes]);

  // Day P&L estimation
  const anyLiveLoaded = allStocks.some((s) => s.isLive);
  const dayPnl = anyLiveLoaded
    ? allStocks.filter((s) => s.isLive).reduce((acc, s) => acc + s.changePct * 0.5, 0)
    : 0;
  const dayPnlPct = balance > 0 ? (dayPnl / balance) * 100 : 0;

  const aaplQ = quotes["AAPL"];
  const nvdaQ = quotes["NVDA"];

  return (
    <div className="space-y-5">
      {/* Market status bar */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${open ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-400"} animate-pulse`} />
          <span className={`text-sm font-bold ${open ? "text-emerald-300" : "text-red-300"}`}>
            Market {open ? "OPEN" : "CLOSED"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <FiClock size={11} />
          <span>{time} IST</span>
        </div>
        <span className="text-xs text-slate-500">US Equities · {anyLiveLoaded ? "Live ●" : "Static"}</span>
      </div>

      {/* Key symbols */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {[
          { symbol: "AAPL", label: "APPLE", fallback: 300 },
          { symbol: "MSFT", label: "MICROSOFT", fallback: 520 },
          { symbol: "NVDA", label: "NVIDIA", fallback: 180 },
          { symbol: "TSLA", label: "TESLA", fallback: 430 },
          { symbol: "AMD", label: "AMD", fallback: 160 },
          { symbol: "META", label: "META", fallback: 640 },
        ].map(({ symbol, label, fallback }) => {
          const q = quotes[symbol];
          const price = (q && !q.isLoading && q.price > 0) ? q.price : fallback;
          const pct = (q && !q.isLoading) ? q.changePct : 0;
          const isUp = pct >= 0;
          return (
            <button key={symbol} type="button" onClick={() => onSelectSymbol?.(symbol)}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-emerald-300/30">
              <p className="text-xs text-slate-500">{label}</p>
              {q?.isLoading ? (
                <div className="mt-2 h-5 w-20 animate-pulse rounded bg-white/10" />
              ) : (
                <>
                  <p className="mt-1 text-base font-bold text-white">
                    {price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`mt-0.5 text-xs font-bold ${isUp ? "text-emerald-300" : "text-red-300"}`}>
                    {isUp ? "+" : ""}{pct.toFixed(2)}%
                  </p>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Portfolio summary */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.88))] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Portfolio Summary</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Wallet Balance</p>
            <p className="mt-1 text-lg font-bold text-white">₹{balance.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Day P&L (est.)</p>
            <p className={`mt-1 text-lg font-bold ${dayPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {dayPnl >= 0 ? "+" : ""}₹{Math.abs(dayPnl).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">AAPL</p>
            <p className={`mt-1 text-lg font-bold ${(aaplQ?.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {aaplQ?.isLoading ? "—" : `${(aaplQ?.changePct ?? 0) >= 0 ? "+" : ""}${(aaplQ?.changePct ?? 0).toFixed(2)}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">NVDA</p>
            <p className="mt-1 text-lg font-bold text-amber-300">
              {nvdaQ?.isLoading ? "—" : (nvdaQ?.price ?? 180).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Top Gainers & Losers — always shows data (live or static) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gainers */}
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-300">
            <FiTrendingUp /> Top Gainers
            {!anyLiveLoaded && <span className="ml-auto text-[10px] font-normal text-slate-500">static</span>}
          </p>
          <div className="space-y-2">
            {gainers.map((s) => (
              <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
                className="flex w-full items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-left hover:bg-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{s.symbol}</p>
                  <p className="text-xs text-slate-500">
                    ₹{s.price.toLocaleString("en-IN")}
                    {s.isLive && <span className="ml-1 text-emerald-600">●</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.changePct >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-red-300">
            <FiTrendingDown /> Top Losers
            {!anyLiveLoaded && <span className="ml-auto text-[10px] font-normal text-slate-500">static</span>}
          </p>
          <div className="space-y-2">
            {losers.map((s) => (
              <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
                className="flex w-full items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-left hover:bg-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{s.symbol}</p>
                  <p className="text-xs text-slate-500">
                    ₹{s.price.toLocaleString("en-IN")}
                    {s.isLive && <span className="ml-1 text-emerald-600">●</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.changePct >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Most Active */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <FiActivity /> Most Active (Volume)
        </p>
        <div className="space-y-2">
          {mostActive.map((s) => (
            <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
              className="flex w-full items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 text-left hover:bg-white/5">
              <p className="text-sm font-bold text-white">{s.symbol}</p>
              <div className="text-right">
                <p className={`text-sm font-bold ${s.changePct >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </p>
                {s.volume > 0 ? (
                  <p className="text-xs text-slate-500">
                    Vol: {s.volume > 1e7 ? (s.volume / 1e7).toFixed(1) + "Cr" : s.volume > 1e5 ? (s.volume / 1e5).toFixed(1) + "L" : s.volume.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-slate-600">Loading vol...</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sector Performance */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
          <FiBarChart2 /> Sector Performance
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {liveSectors.map((sec) => (
            <div key={sec.name}
              className={`rounded-2xl border p-3 text-center ${sec.change >= 0 ? "border-emerald-400/20 bg-emerald-400/10" : "border-red-400/20 bg-red-400/10"}`}>
              <p className="text-xs font-bold text-white">{sec.name}</p>
              <p className={`mt-1 text-sm font-bold ${sec.change >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {sec.change >= 0 ? "+" : ""}{sec.change.toFixed(2)}%
              </p>
              <p className="mt-1 text-[10px] text-slate-500">{sec.marketCap}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Heat Map */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 text-sm font-bold text-white">Sector Heat Map</p>
        <div className="flex flex-wrap gap-2">
          {liveSectors.map((sec) => {
            const intensity = Math.min(1, Math.abs(sec.change) / 3);
            const bg = sec.change >= 0
              ? `rgba(52,211,153,${0.1 + intensity * 0.5})`
              : `rgba(248,113,113,${0.1 + intensity * 0.5})`;
            return (
              <div key={sec.name}
                style={{ background: bg, width: `${80 + intensity * 60}px` }}
                className="flex h-14 flex-col items-center justify-center rounded-xl border border-white/10 transition-all duration-500">
                <p className="text-xs font-bold text-white">{sec.name}</p>
                <p className={`text-xs font-bold ${sec.change >= 0 ? "text-emerald-200" : "text-red-200"}`}>
                  {sec.change >= 0 ? "+" : ""}{sec.change.toFixed(2)}%
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
