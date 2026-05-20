"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FiTrendingUp, FiTrendingDown, FiPieChart, FiActivity } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { YAHOO_SYMBOL_MAP } from "@/lib/symbolMap";
import { watchlists } from "@/lib/marketData";

const SECTOR_MAP: Record<string, string> = {
  RELIANCE: "Oil & Gas", TCS: "IT", HDFCBANK: "Banking", INFY: "IT",
  ICICIBANK: "Banking", SBIN: "Banking", LT: "Infra", TATAMOTORS: "Auto",
  WIPRO: "IT", AXISBANK: "Banking", MARUTI: "Auto", SUNPHARMA: "Pharma",
};

export function PortfolioDashboard({ balance }: { balance: number }) {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeOrder[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "trades"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TradeOrder[];
      all.sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
      setTrades(all);
    });
  }, [user]);

  // Compute open positions
  const positions = useMemo(() => {
    const map: Record<string, { symbol: string; title: string; qty: number; avgPrice: number; buyAmount: number; sector: string; product: string }> = {};
    for (const t of trades) {
      const key = t.symbol;
      if (!map[key]) map[key] = { symbol: t.symbol, title: t.title, qty: 0, avgPrice: 0, buyAmount: 0, sector: SECTOR_MAP[t.symbol] ?? "Other", product: t.productType ?? "MIS" };
      const pos = map[key];
      if (t.side === "BUY") {
        const prev = pos.avgPrice * pos.qty;
        pos.qty += t.quantity;
        pos.avgPrice = pos.qty > 0 ? (prev + t.price * t.quantity) / pos.qty : t.price;
        pos.buyAmount += t.amount;
      } else {
        pos.qty = Math.max(0, pos.qty - t.quantity);
        pos.buyAmount = Math.max(0, pos.buyAmount - t.amount);
      }
    }
    return Object.values(map).filter((p) => p.qty > 0);
  }, [trades]);

  // Compute closed trades P&L (realised)
  const realisedPnl = useMemo(() => {
    const buyMap: Record<string, { qty: number; avgPrice: number }> = {};
    let realised = 0;
    for (const t of trades) {
      if (!buyMap[t.symbol]) buyMap[t.symbol] = { qty: 0, avgPrice: 0 };
      const bm = buyMap[t.symbol];
      if (t.side === "BUY") {
        const prev = bm.avgPrice * bm.qty;
        bm.qty += t.quantity;
        bm.avgPrice = bm.qty > 0 ? (prev + t.price * t.quantity) / bm.qty : t.price;
      } else {
        realised += (t.price - bm.avgPrice) * Math.min(t.quantity, bm.qty);
        bm.qty = Math.max(0, bm.qty - t.quantity);
      }
    }
    return realised;
  }, [trades]);

  const openSymbols = positions.map((p) => p.symbol).filter((s) => s in YAHOO_SYMBOL_MAP);
  const quotes = useLiveQuotes(openSymbols, 10000);

  const enriched = positions.map((pos) => {
    const q = quotes[pos.symbol];
    const cmp = q?.price && q.price > 0 ? q.price : pos.avgPrice;
    const currentValue = cmp * pos.qty;
    const unrealisedPnl = (cmp - pos.avgPrice) * pos.qty;
    const pctReturn = pos.avgPrice > 0 ? (unrealisedPnl / (pos.avgPrice * pos.qty)) * 100 : 0;
    const dayPnl = (q?.change ?? 0) * pos.qty;
    return { ...pos, cmp, currentValue, unrealisedPnl, pctReturn, dayPnl, isLoading: q?.isLoading ?? false };
  });

  const totalInvested = enriched.reduce((s, p) => s + p.avgPrice * p.qty, 0);
  const totalCurrent = enriched.reduce((s, p) => s + p.currentValue, 0);
  const totalUnrealised = enriched.reduce((s, p) => s + p.unrealisedPnl, 0);
  const totalDayPnl = enriched.reduce((s, p) => s + p.dayPnl, 0);

  // Sector allocation
  const sectorAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    enriched.forEach((p) => {
      map[p.sector] = (map[p.sector] ?? 0) + p.currentValue;
    });
    return Object.entries(map).map(([sector, value]) => ({
      sector, value,
      pct: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
    })).sort((a, b) => b.value - a.value);
  }, [enriched, totalCurrent]);

  // Portfolio allocation by symbol
  const symbolAlloc = enriched
    .map((p) => ({ symbol: p.symbol, value: p.currentValue, pct: totalCurrent > 0 ? (p.currentValue / totalCurrent) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ["text-emerald-300", "text-blue-300", "text-violet-300", "text-amber-300", "text-red-300", "text-pink-300", "text-cyan-300"];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Wallet", value: `₹${balance.toLocaleString("en-IN")}`, color: "text-white" },
          { label: "Invested (open)", value: `₹${totalInvested.toFixed(0)}`, color: "text-white" },
          { label: "Unrealised P&L", value: `${totalUnrealised >= 0 ? "+" : ""}₹${totalUnrealised.toFixed(2)}`, color: totalUnrealised >= 0 ? "text-emerald-300" : "text-red-300" },
          { label: "Realised P&L", value: `${realisedPnl >= 0 ? "+" : ""}₹${realisedPnl.toFixed(2)}`, color: realisedPnl >= 0 ? "text-emerald-300" : "text-red-300" },
          { label: "Day P&L", value: `${totalDayPnl >= 0 ? "+" : ""}₹${totalDayPnl.toFixed(2)}`, color: totalDayPnl >= 0 ? "text-emerald-300" : "text-red-300" },
          { label: "Current Value", value: `₹${totalCurrent.toFixed(0)}`, color: "text-white" },
          { label: "Open Positions", value: String(enriched.length), color: "text-white" },
          { label: "Total Trades", value: String(trades.length), color: "text-white" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className={`mt-1 text-lg font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Open Positions with live P&L */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
          <FiActivity /> Open Positions
        </p>
        {enriched.length === 0 ? (
          <p className="text-sm text-slate-400">No open positions yet.</p>
        ) : (
          <div className="space-y-3">
            {enriched.map((pos) => (
              <div key={pos.symbol} className="rounded-2xl border border-white/10 bg-[#08111a] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{pos.title}</p>
                    <p className="text-xs text-slate-500">{pos.product} · {pos.sector}</p>
                  </div>
                  <div className="text-right">
                    {pos.isLoading ? (
                      <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
                    ) : (
                      <>
                        <p className="font-bold text-white">₹{pos.cmp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                        <p className={`text-xs font-bold ${pos.pctReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                          {pos.pctReturn >= 0 ? "+" : ""}{pos.pctReturn.toFixed(2)}%
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-xl bg-black/20 p-2">
                    <p className="text-slate-500">Avg</p>
                    <p className="font-bold text-white">₹{pos.avgPrice.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl bg-black/20 p-2">
                    <p className="text-slate-500">Qty</p>
                    <p className="font-bold text-white">{pos.qty}</p>
                  </div>
                  <div className={`rounded-xl p-2 ${pos.unrealisedPnl >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
                    <p className="text-slate-500">Unrealised</p>
                    <p className={`font-bold ${pos.unrealisedPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {pos.unrealisedPnl >= 0 ? "+" : ""}₹{pos.unrealisedPnl.toFixed(2)}
                    </p>
                  </div>
                  <div className={`rounded-xl p-2 ${pos.dayPnl >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
                    <p className="text-slate-500">Day P&L</p>
                    <p className={`font-bold ${pos.dayPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {pos.dayPnl >= 0 ? "+" : ""}₹{pos.dayPnl.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sector Allocation */}
      {sectorAlloc.length > 0 && (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <FiPieChart /> Sector Allocation
          </p>
          <div className="space-y-3">
            {sectorAlloc.map((s, i) => (
              <div key={s.sector}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={`font-bold ${COLORS[i % COLORS.length]}`}>{s.sector}</span>
                  <span className="text-slate-400">{s.pct.toFixed(1)}% · ₹{s.value.toFixed(0)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-emerald-400 transition-all duration-700"
                    style={{ width: `${s.pct}%`, opacity: 0.5 + (i * 0.1) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Allocation by symbol */}
      {symbolAlloc.length > 0 && (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="mb-4 text-sm font-bold text-white">Portfolio Allocation</p>
          <div className="space-y-2">
            {symbolAlloc.map((s, i) => (
              <div key={s.symbol} className="flex items-center gap-3">
                <span className={`w-20 text-xs font-bold ${COLORS[i % COLORS.length]}`}>{s.symbol}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, backgroundColor: ["#34d399","#60a5fa","#a78bfa","#fbbf24","#f87171","#f472b6","#22d3ee"][i % 7] }} />
                </div>
                <span className="w-12 text-right text-xs text-slate-400">{s.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
