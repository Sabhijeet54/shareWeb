"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FiDownload, FiCalendar } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";

type Period = "today" | "week" | "month" | "year" | "all";

function periodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week": { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
    case "month": return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year": return new Date(now.getFullYear(), 0, 1);
    default: return new Date(0);
  }
}

export function ReportsPage() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeOrder[]>([]);
  const [period, setPeriod] = useState<Period>("month");

  useEffect(() => {
    if (!user) return;
    // No orderBy — sort client-side
    const q = query(collection(db, "trades"), where("userId", "==", user.uid));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TradeOrder[];
      all.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setTrades(all);
    });
  }, [user]);

  const filtered = useMemo(() => {
    const start = periodStart(period);
    return trades.filter((t) => {
      if (!t.createdAt) return period === "all";
      const d = t.createdAt.toDate?.() ?? new Date(0);
      return d >= start;
    });
  }, [trades, period]);

  const buys = filtered.filter((t) => t.side === "BUY");
  const sells = filtered.filter((t) => t.side === "SELL");
  const totalBuy = buys.reduce((s, t) => s + t.amount, 0);
  const totalSell = sells.reduce((s, t) => s + t.amount, 0);
  const netPnl = totalSell - totalBuy;
  const charges = filtered.reduce((s, t) => s + (t.charges ?? 0), 0);

  // STCG / LTCG (simplified)
  const stcg = Math.max(0, netPnl) * 0.15;
  const ltcg = 0;

  function downloadCSV() {
    const rows = [
      ["Date", "Symbol", "Side", "Qty", "Price", "Amount", "Charges", "Product", "Order Type"],
      ...filtered.map((t) => [
        t.createdAt?.toDate?.()?.toLocaleDateString("en-IN") ?? "-",
        t.symbol, t.side, t.quantity, t.price, t.amount, t.charges ?? 0,
        t.productType ?? "-", t.orderType ?? "-",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade_report_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {(["today", "week", "month", "year", "all"] as Period[]).map((p) => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`h-9 rounded-xl px-4 text-xs font-bold capitalize ${period === p ? "bg-emerald-400 text-slate-950" : "bg-[var(--background)]/80 text-[var(--text-secondary)]"}`}>
            {p}
          </button>
        ))}
      </div>

      {/* P&L Summary */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-label)]">P&L Report</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Total Trades</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{filtered.length}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Buy Amount</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">₹{totalBuy.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Sell Amount</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">₹{totalSell.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Net P&L</p>
            <p className={`text-xl font-bold ${netPnl >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
              {netPnl >= 0 ? "+" : ""}₹{netPnl.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Tax P&L */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">Tax P&L (Estimated)</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">Total Charges</p>
            <p className="font-bold text-[var(--error-label)]">₹{charges.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">STCG Tax (15%)</p>
            <p className="font-bold text-[var(--warn-label)]">₹{stcg.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">LTCG Tax (10%)</p>
            <p className="font-bold text-[var(--warn-label)]">₹{ltcg.toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-[var(--background)]/80 p-3">
            <p className="text-xs text-[var(--text-muted)]">Net after Tax</p>
            <p className={`font-bold ${netPnl - stcg >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
              ₹{(netPnl - stcg).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Download */}
      <button type="button" onClick={downloadCSV}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 text-sm font-bold text-[var(--text-primary)]">
        <FiDownload /> Download CSV Report
      </button>

      {/* Trade History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <FiCalendar /> Trade History ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-2xl bg-[var(--background)]/80 p-4 text-sm text-[var(--text-secondary)]">No trades in this period.</p>
        ) : (
          filtered.map((t) => (
            <article key={t.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{t.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {t.createdAt?.toDate?.()?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "—"}
                    {" · "}{t.orderType ?? "MARKET"} · {t.productType ?? "MIS"}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${t.side === "BUY" ? "bg-emerald-400/15 text-[var(--accent-label)]" : "bg-red-400/15 text-[var(--error-label)]"}`}>
                  {t.side}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <p className="text-[var(--text-muted)]">Qty <span className="block font-bold text-[var(--text-primary)]">{t.quantity}</span></p>
                <p className="text-[var(--text-muted)]">Price <span className="block font-bold text-[var(--text-primary)]">₹{t.price.toLocaleString("en-IN")}</span></p>
                <p className="text-[var(--text-muted)]">Amount <span className="block font-bold text-[var(--text-primary)]">₹{t.amount.toLocaleString("en-IN")}</span></p>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
