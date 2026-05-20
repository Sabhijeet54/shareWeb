"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { FINNHUB_SYMBOL_MAP } from "@/lib/symbolMap";

type HoldingRow = {
  symbol: string;
  title: string;
  avgBuyPrice: number;
  quantity: number;
  investedAmount: number;
};

function useHoldings(userId: string) {
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  useEffect(() => {
    if (!userId) return;
    // No orderBy — avoids composite index. Sort client-side.
    const q = query(collection(db, "trades"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TradeOrder[];
      all.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setTrades(all);
    });
  }, [userId]);

  const map: Record<string, HoldingRow> = {};
  for (const t of trades) {
    // Include CNC product type OR CASH product (stocks bought for delivery)
    const isCNC = t.productType === "CNC" || t.product === "CASH";
    if (!isCNC) continue;
    const key = t.symbol;
    if (!map[key]) map[key] = { symbol: t.symbol, title: t.title, avgBuyPrice: 0, quantity: 0, investedAmount: 0 };
    if (t.side === "BUY") {
      const prev = map[key];
      const newQty = prev.quantity + t.quantity;
      prev.avgBuyPrice = newQty > 0 ? (prev.avgBuyPrice * prev.quantity + t.price * t.quantity) / newQty : t.price;
      prev.quantity = newQty;
      prev.investedAmount += t.amount;
    } else {
      map[key].quantity -= t.quantity;
      map[key].investedAmount -= t.amount;
    }
  }
  return Object.values(map).filter((h) => h.quantity > 0);
}

// XIRR approximation using Newton's method
function xirr(cashflows: Array<{ amount: number; date: Date }>): number {
  if (cashflows.length < 2) return 0;
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0, dnpv = 0;
    const t0 = cashflows[0].date.getTime();
    for (const cf of cashflows) {
      const t = (cf.date.getTime() - t0) / (365.25 * 24 * 3600 * 1000);
      npv += cf.amount / Math.pow(1 + rate, t);
      dnpv += (-t * cf.amount) / Math.pow(1 + rate, t + 1);
    }
    const delta = npv / dnpv;
    rate -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return isFinite(rate) ? rate * 100 : 0;
}

export function HoldingsPage() {
  const { user } = useAuth();
  const holdings = useHoldings(user?.uid ?? "");

  const holdingSymbols = holdings.map((h) => h.symbol).filter((s) => s in FINNHUB_SYMBOL_MAP);
  const quotes = useLiveQuotes(holdingSymbols, 20000);

  const enriched = holdings.map((h) => {
    const q = quotes[h.symbol];
    const cmp = q?.price ?? h.avgBuyPrice;
    const currentValue = cmp * h.quantity;
    const absoluteReturn = currentValue - h.investedAmount;
    const pctReturn = h.investedAmount > 0 ? (absoluteReturn / h.investedAmount) * 100 : 0;
    // Approximate XIRR — assume bought 6 months ago
    const buyDate = new Date(Date.now() - 180 * 24 * 3600 * 1000);
    const xirrValue = xirr([
      { amount: -h.investedAmount, date: buyDate },
      { amount: currentValue, date: new Date() },
    ]);
    return { ...h, cmp, currentValue, absoluteReturn, pctReturn, xirrValue, isLoading: q?.isLoading ?? false };
  });

  const totalInvested = enriched.reduce((a, h) => a + h.investedAmount, 0);
  const totalCurrent = enriched.reduce((a, h) => a + h.currentValue, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.88))] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Holdings (CNC)</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">Invested</p>
            <p className="text-xl font-bold text-white">₹{totalInvested.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Current Value</p>
            <p className="text-xl font-bold text-white">₹{totalCurrent.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Return</p>
            <p className={`text-xl font-bold ${totalReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">P&L</p>
            <p className={`text-xl font-bold ${totalCurrent - totalInvested >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {totalCurrent - totalInvested >= 0 ? "+" : ""}₹{(totalCurrent - totalInvested).toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* No holdings */}
      {enriched.length === 0 && (
        <div className="rounded-2xl bg-black/20 p-5 text-sm text-slate-400">
          No holdings yet. Buy stocks with CNC product type to see them here.
        </div>
      )}

      {/* Holdings list */}
      {enriched.map((h) => (
        <article key={h.symbol} className="rounded-2xl border border-white/10 bg-[#08111a] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-white">{h.title}</p>
              <p className="text-xs text-slate-500">{h.symbol}</p>
            </div>
            <div className="text-right">
              {h.isLoading ? (
                <div className="h-5 w-20 animate-pulse rounded bg-white/10" />
              ) : (
                <>
                  <p className="font-bold text-white">₹{h.cmp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                  <p className={`text-xs font-bold ${h.pctReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {h.pctReturn >= 0 ? "+" : ""}{h.pctReturn.toFixed(2)}%
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-3 text-sm sm:grid-cols-4">
            <p className="text-slate-500">Avg Buy <span className="block font-bold text-white">₹{h.avgBuyPrice.toLocaleString("en-IN")}</span></p>
            <p className="text-slate-500">Qty <span className="block font-bold text-white">{h.quantity}</span></p>
            <p className="text-slate-500">Invested <span className="block font-bold text-white">₹{h.investedAmount.toLocaleString("en-IN")}</span></p>
            <p className="text-slate-500">Current <span className="block font-bold text-white">₹{h.currentValue.toLocaleString("en-IN")}</span></p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className={`rounded-xl px-3 py-2 text-sm ${h.absoluteReturn >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
              <p className="text-xs text-slate-500">Absolute P&L</p>
              <p className={`font-bold ${h.absoluteReturn >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {h.absoluteReturn >= 0 ? "+" : ""}₹{h.absoluteReturn.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-2 text-sm">
              <p className="text-xs text-slate-500">XIRR (approx)</p>
              <p className={`font-bold ${h.xirrValue >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {h.xirrValue >= 0 ? "+" : ""}{h.xirrValue.toFixed(1)}% p.a.
              </p>
            </div>
          </div>
        </article>
      ))}

      {/* Corporate Actions note */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
        <p className="font-semibold text-white">Corporate Actions</p>
        <p className="mt-1 text-xs">Bonus, Split, Rights, Dividends — tracked automatically when trades are recorded in CNC mode.</p>
      </div>
    </div>
  );
}
