"use client";

import { useEffect, useMemo, useState } from "react";
import { FiTrendingUp, FiTrendingDown, FiActivity, FiClock, FiBarChart2, FiGlobe } from "react-icons/fi";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { equityInstruments, equitySymbols, indexSymbols, sectorData } from "@/lib/marketData";

<<<<<<< Updated upstream
// All key symbols we want on the dashboard
const EQUITY_SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "SBIN", "LT", "TATAMOTORS", "WIPRO", "AXISBANK",
  "MARUTI", "SUNPHARMA",
];

const INDEX_SYMBOLS = ["NIFTY", "SENSEX", "BANKNIFTY", "FINNIFTY", "INDIAVIX"];
const DASHBOARD_SYMBOLS = [...INDEX_SYMBOLS, ...EQUITY_SYMBOLS];

// Static fallback from marketData — always available even if API fails
const STATIC_STOCKS = watchlists.stocks;
=======
const DASHBOARD_SYMBOLS = [...indexSymbols, ...equitySymbols];
>>>>>>> Stashed changes

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

type StockRow = { symbol: string; title: string; price: number; changePct: number; volume: number; isLive: boolean };

export function DashboardHome({
  balance,
  onSelectSymbol,
}: {
  balance: number;
  onSelectSymbol?: (symbol: string) => void;
}) {
  const quotes = useLiveQuotes(DASHBOARD_SYMBOLS, 2500);
  const { open, time } = useMarketClock();

  // Build enriched stock list from live quotes only
  const allStocks = useMemo<StockRow[]>(() => {
    return equityInstruments.map((instrument) => {
      const sym = instrument.symbol;
      const live = quotes[sym];

      if (live && !live.isLoading && live.price > 0) {
        return {
          symbol: sym,
          title: live.name || instrument.title,
          price: live.price,
          changePct: live.changePct,
          volume: live.volume,
          isLive: true,
        };
      }
      return {
        symbol: sym,
        title: instrument.title,
        price: 0,
        changePct: 0,
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

<<<<<<< Updated upstream
  const niftyQ = quotes["NIFTY"];
  const vixQ = quotes["INDIAVIX"];
=======
  const firstSummarySymbol = DASHBOARD_SYMBOLS[0] ?? "";
  const secondSummarySymbol = DASHBOARD_SYMBOLS[1] ?? "";
  const firstSummaryQuote = firstSummarySymbol ? quotes[firstSummarySymbol] : undefined;
  const secondSummaryQuote = secondSummarySymbol ? quotes[secondSummarySymbol] : undefined;
>>>>>>> Stashed changes

  return (
    <div className="space-y-5">
      {/* Market status bar */}
      <div className="flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${open ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-400"} animate-pulse`} />
          <span className={`text-sm font-bold ${open ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
            Market {open ? "OPEN" : "CLOSED"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <FiClock size={11} />
          <span>{time} IST</span>
        </div>
<<<<<<< Updated upstream
        <span className="text-xs text-slate-500">NSE · BSE · {anyLiveLoaded ? "Live ●" : "Static"}</span>
      </div>

      {/* Key indices */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { symbol: "NIFTY", label: "NIFTY 50", fallback: 22480 },
          { symbol: "SENSEX", label: "SENSEX", fallback: 74020 },
          { symbol: "BANKNIFTY", label: "BANKNIFTY", fallback: 48260 },
          { symbol: "FINNIFTY", label: "FINNIFTY", fallback: 21440 },
          { symbol: "INDIAVIX", label: "INDIA VIX", fallback: 14.8 },
        ].map(({ symbol, label, fallback }) => {
=======
        <span className="text-xs text-[var(--text-muted)]">NSE / BSE · {anyLiveLoaded ? "Live ●" : "Waiting for feed"}</span>
      </div>

      {/* Index Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indexSymbols.slice(0, 8).map((symbol) => {
>>>>>>> Stashed changes
          const q = quotes[symbol];
          const hasLivePrice = Boolean(q && !q.isLoading && q.price > 0);
          const price = hasLivePrice ? q!.price : 0;
          const change = hasLivePrice ? q!.change : 0;
          const pct = hasLivePrice ? q!.changePct : 0;
          const isUp = pct >= 0;
          return (
            <button key={symbol} type="button" onClick={() => onSelectSymbol?.(symbol)}
              className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-left transition hover:border-emerald-300/30">
              <div className="flex items-center gap-2">
                <FiGlobe size={12} className="text-[var(--text-muted)]" />
                <p className="text-xs font-semibold text-[var(--text-secondary)]">{q?.name || symbol}</p>
              </div>
              {q?.isLoading ? (
                <div className="mt-2 h-5 w-20 animate-pulse rounded bg-[var(--shimmer-bg)]" />
              ) : !hasLivePrice ? (
                <p className="mt-1 text-xs text-[var(--text-muted)]">Loading...</p>
              ) : (
                <>
                  <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">
                    {price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className={`text-xs font-bold ${isUp ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                      {isUp ? "+" : ""}{change.toFixed(2)}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isUp ? "bg-emerald-400/15 text-[var(--accent-label)]" : "bg-red-400/15 text-[var(--error-label)]"}`}>
                      {isUp ? "+" : ""}{pct.toFixed(2)}%
                    </span>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Portfolio summary */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.88))] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-label)]">Portfolio Summary</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Wallet Balance</p>
            <p className="mt-1 text-lg font-bold text-[var(--text-primary)]">₹{balance.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Day P&L (est.)</p>
            <p className={`mt-1 text-lg font-bold ${dayPnl >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
              {dayPnl >= 0 ? "+" : ""}₹{Math.abs(dayPnl).toFixed(2)}
            </p>
          </div>
          <div>
<<<<<<< Updated upstream
            <p className="text-xs text-slate-500">NIFTY 50</p>
            <p className={`mt-1 text-lg font-bold ${(niftyQ?.changePct ?? 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {niftyQ?.isLoading ? "—" : `${(niftyQ?.changePct ?? 0) >= 0 ? "+" : ""}${(niftyQ?.changePct ?? 0).toFixed(2)}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">INDIA VIX</p>
            <p className="mt-1 text-lg font-bold text-amber-300">
              {vixQ?.isLoading ? "—" : (vixQ?.price ?? 14.8).toFixed(2)}
=======
            <p className="text-xs text-[var(--text-muted)]">{firstSummarySymbol || "—"}</p>
            <p className={`mt-1 text-lg font-bold ${(firstSummaryQuote?.changePct ?? 0) >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
              {firstSummaryQuote?.isLoading ? "—" : `${(firstSummaryQuote?.changePct ?? 0) >= 0 ? "+" : ""}${(firstSummaryQuote?.changePct ?? 0).toFixed(2)}%`}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">{secondSummarySymbol || "—"}</p>
            <p className="mt-1 text-lg font-bold text-[var(--warn-label)]">
              {secondSummaryQuote?.isLoading ? "—" : (secondSummaryQuote?.price ?? 0).toFixed(2)}
>>>>>>> Stashed changes
            </p>
          </div>
        </div>
      </div>

      {/* Top Gainers & Losers */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gainers */}
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--accent-label)]">
            <FiTrendingUp /> Top Gainers
            {!anyLiveLoaded && <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">waiting for live</span>}
          </p>
          <div className="space-y-2">
            {gainers.map((s) => (
              <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
                className="flex w-full items-center justify-between rounded-xl bg-[var(--background)]/80 px-3 py-2.5 text-left hover:bg-[var(--hover-bg)]">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{s.symbol}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ₹{s.price.toLocaleString("en-IN")}
                    {s.isLive && <span className="ml-1 text-emerald-600">●</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.changePct >= 0 ? "bg-emerald-400/15 text-[var(--accent-label)]" : "bg-red-400/15 text-[var(--error-label)]"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--error-label)]">
            <FiTrendingDown /> Top Losers
            {!anyLiveLoaded && <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">waiting for live</span>}
          </p>
          <div className="space-y-2">
            {losers.map((s) => (
              <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
                className="flex w-full items-center justify-between rounded-xl bg-[var(--background)]/80 px-3 py-2.5 text-left hover:bg-[var(--hover-bg)]">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{s.symbol}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ₹{s.price.toLocaleString("en-IN")}
                    {s.isLive && <span className="ml-1 text-emerald-600">●</span>}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.changePct >= 0 ? "bg-emerald-400/15 text-[var(--accent-label)]" : "bg-red-400/15 text-[var(--error-label)]"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Most Active */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <FiActivity /> Most Active (Volume)
        </p>
        <div className="space-y-2">
          {mostActive.map((s) => (
            <button key={s.symbol} type="button" onClick={() => onSelectSymbol?.(s.symbol)}
              className="flex w-full items-center justify-between rounded-xl bg-[var(--background)]/80 px-3 py-2.5 text-left hover:bg-[var(--hover-bg)]">
              <p className="text-sm font-bold text-[var(--text-primary)]">{s.symbol}</p>
              <div className="text-right">
                <p className={`text-sm font-bold ${s.changePct >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                  {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(2)}%
                </p>
                {s.volume > 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Vol: {s.volume > 1e7 ? (s.volume / 1e7).toFixed(1) + "Cr" : s.volume > 1e5 ? (s.volume / 1e5).toFixed(1) + "L" : s.volume.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">Loading vol...</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sector Performance */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <FiBarChart2 /> Sector Performance
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {liveSectors.map((sec) => (
            <div key={sec.name}
              className={`rounded-2xl border p-3 text-center ${sec.change >= 0 ? "border-emerald-400/20 bg-emerald-400/10" : "border-red-400/20 bg-red-400/10"}`}>
              <p className="text-xs font-bold text-[var(--text-primary)]">{sec.name}</p>
              <p className={`mt-1 text-sm font-bold ${sec.change >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                {sec.change >= 0 ? "+" : ""}{sec.change.toFixed(2)}%
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{sec.marketCap}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sector Heat Map */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="mb-4 text-sm font-bold text-[var(--text-primary)]">Sector Heat Map</p>
        <div className="flex flex-wrap gap-2">
          {liveSectors.map((sec) => {
            const intensity = Math.min(1, Math.abs(sec.change) / 3);
            const bg = sec.change >= 0
              ? `rgba(52,211,153,${0.1 + intensity * 0.5})`
              : `rgba(248,113,113,${0.1 + intensity * 0.5})`;
            return (
              <div key={sec.name}
                style={{ background: bg, width: `${80 + intensity * 60}px` }}
                className="flex h-14 flex-col items-center justify-center rounded-xl border border-[var(--card-border)] transition-all duration-500">
                <p className="text-xs font-bold text-[var(--text-primary)]">{sec.name}</p>
                <p className={`text-xs font-bold ${sec.change >= 0 ? "text-[var(--accent-label-dim)]" : "text-red-200"}`}>
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
