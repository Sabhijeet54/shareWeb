"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, addDoc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { FiRefreshCw, FiArrowRight } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";
import { useLiveQuotes } from "@/lib/useLiveQuotes";

// Derive open positions from executed trades (BUY = open, SELL = closing)
type DerivedPosition = {
  symbol: string;
  title: string;
  side: "BUY" | "SELL";
  avgPrice: number;
  qty: number;
  lots: number;
  lotSize: number;
  product: string;
  orderId: string;
  userId: string;
  userEmail: string;
  target?: number | null;
  stopLoss?: number | null;
};

function usePositions(userId: string) {
  const [trades, setTrades] = useState<TradeOrder[]>([]);

  useEffect(() => {
    if (!userId) return;
    // No orderBy here — avoids Firestore composite index requirement. Sort client-side.
    const q = query(collection(db, "trades"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as TradeOrder[];
      // sort ascending by createdAt for correct position netting
      all.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return ta - tb;
      });
      setTrades(all);
    });
  }, [userId]);

  // Net positions: group by symbol+product, net qty
  const positionMap: Record<string, DerivedPosition> = {};
  for (const t of trades) {
    const key = `${t.symbol}__${t.productType ?? "MIS"}`;
    if (!positionMap[key]) {
      positionMap[key] = {
        symbol: t.symbol, title: t.title, side: t.side,
        avgPrice: 0, qty: 0, lots: 0,
        lotSize: t.lotSize ?? 1, product: t.productType ?? "MIS",
        orderId: t.id,
        userId: t.userId,
        userEmail: t.userEmail,
        target: null,
        stopLoss: null,
      };
    }
    const pos = positionMap[key];
    if (t.side === "BUY") {
      const prevCost = pos.avgPrice * pos.qty;
      const newQty = pos.qty + t.quantity;
      pos.avgPrice = newQty > 0 ? (prevCost + t.price * t.quantity) / newQty : t.price;
      pos.qty = newQty;
      pos.lots += (t.lots ?? 1);
      pos.target = t.target ?? pos.target;
      pos.stopLoss = t.stopLoss ?? pos.stopLoss;
    } else {
      pos.qty = Math.max(0, pos.qty - t.quantity);
      pos.lots = Math.max(0, pos.lots - (t.lots ?? 1));
      if (pos.qty === 0) {
        pos.target = null;
        pos.stopLoss = null;
      }
    }
    pos.side = t.side;
  }

  const open = Object.values(positionMap).filter((p) => p.qty > 0);
  const closed = Object.values(positionMap).filter((p) => p.qty <= 0 && p.orderId);

  return { open, closed, trades };
}

function useSquareOffAlert() {
  const [showAlert, setShowAlert] = useState(false);
  useEffect(() => {
    const check = () => {
      const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const h = ist.getHours(), m = ist.getMinutes();
      // Alert from 3:00 PM to 3:15 PM
      if (h === 15 && m >= 0 && m < 15) setShowAlert(true);
      else setShowAlert(false);
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);
  return showAlert;
}

export function PositionsPage() {
  const { user } = useAuth();
  const { open, closed } = usePositions(user?.uid ?? "");
  const squareOffAlert = useSquareOffAlert();
  const [closingKeys, setClosingKeys] = useState<Set<string>>(new Set());

  const openSymbols = [...new Set(open.map((p) => p.symbol))];
  const quotes = useLiveQuotes(openSymbols, 3000);

  async function closePosition(pos: DerivedPosition, exitPrice: number, reason: "target" | "stopLoss" | "manual") {
    const key = `${pos.symbol}__${pos.product}`;
    if (closingKeys.has(key)) return;

    setClosingKeys((prev) => new Set(prev).add(key));
    try {
      const qty = Math.max(1, pos.qty);
      const notionalValue = Math.round(qty * exitPrice);
      const charges = Math.round(Math.min(20, notionalValue * 0.0003) + notionalValue * 0.0007);
      const sellCredit = Math.max(0, notionalValue - charges);
      const lots = Math.max(1, Math.round(qty / Math.max(1, pos.lotSize)));

      await runTransaction(db, async (txn) => {
        const userRef = doc(db, "users", pos.userId);
        txn.update(userRef, {
          walletBalance: increment(sellCredit),
          updatedAt: serverTimestamp(),
        });
      });

      await addDoc(collection(db, "trades"), {
        side: "SELL",
        symbol: pos.symbol,
        title: pos.title,
        lots,
        lotSize: pos.lotSize,
        quantity: qty,
        price: exitPrice,
        amount: sellCredit,
        notionalValue,
        charges,
        orderType: "MARKET",
        productType: pos.product,
        validity: "DAY",
        target: null,
        stopLoss: null,
        product: pos.product,
        status: "executed",
        mode: "paper",
        userId: pos.userId,
        userEmail: pos.userEmail,
        createdAt: serverTimestamp(),
        closeReason: reason,
      });
    } catch {
      // ignore and allow next ticks to retry
    } finally {
      setClosingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  useEffect(() => {
    for (const pos of open) {
      const quote = quotes[pos.symbol];
      const cmp = quote?.price ?? 0;
      if (cmp <= 0 || quote?.isLoading) continue;
      if (pos.side !== "BUY") continue;

      const targetHit = typeof pos.target === "number" && pos.target > 0 && cmp >= pos.target;
      const stopLossHit = typeof pos.stopLoss === "number" && pos.stopLoss > 0 && cmp <= pos.stopLoss;

      if (targetHit) {
        void closePosition(pos, cmp, "target");
        continue;
      }
      if (stopLossHit) {
        void closePosition(pos, cmp, "stopLoss");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quotes]);

  const totalPnl = open.reduce((acc, pos) => {
    const cmp = quotes[pos.symbol]?.price ?? pos.avgPrice;
    return acc + (cmp - pos.avgPrice) * pos.qty * (pos.side === "BUY" ? 1 : -1);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Square off alert */}
      {squareOffAlert && (
        <div className="rounded-2xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm font-bold text-[var(--error-label)] animate-pulse">
          ⚠️ Auto Square-Off Alert: MIS positions will be squared off at 3:15 PM IST
        </div>
      )}

      {/* Summary */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-label)]">Open Positions</p>
        <div className="mt-3 flex gap-6">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Positions</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{open.length}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Unrealised P&L</p>
            <p className={`text-2xl font-bold ${totalPnl >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
              {totalPnl >= 0 ? "+" : ""}₹{totalPnl.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Open positions list */}
      {open.length === 0 ? (
        <div className="rounded-2xl bg-[var(--background)]/80 p-4 text-sm text-[var(--text-secondary)]">
          No open positions. Place a trade from Watchlist.
        </div>
      ) : (
        open.map((pos) => {
          const q = quotes[pos.symbol];
          const cmp = q?.price ?? pos.avgPrice;
          const pnl = (cmp - pos.avgPrice) * pos.qty * (pos.side === "BUY" ? 1 : -1);
          const pnlPct = pos.avgPrice > 0 ? (pnl / (pos.avgPrice * pos.qty)) * 100 : 0;

          return (
            <article key={pos.symbol + pos.product} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{pos.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{pos.product} · {pos.side}</p>
                </div>
                <div className="text-right">
                  {q?.isLoading ? (
                    <div className="h-5 w-20 animate-pulse rounded bg-[var(--shimmer-bg)]" />
                  ) : (
                    <>
                      <p className="font-bold text-[var(--text-primary)]">₹{cmp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                      <p className={`text-xs font-bold ${q?.changePct >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                        {q?.changePct >= 0 ? "+" : ""}{q?.changePct?.toFixed(2) ?? "0.00"}%
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[var(--background)]/80 p-3 text-sm">
                <p className="text-[var(--text-muted)]">Avg <span className="block font-bold text-[var(--text-primary)]">₹{pos.avgPrice.toLocaleString("en-IN")}</span></p>
                <p className="text-[var(--text-muted)]">Qty <span className="block font-bold text-[var(--text-primary)]">{pos.qty}</span></p>
                <p className="text-[var(--text-muted)]">Lots <span className="block font-bold text-[var(--text-primary)]">{pos.lots}</span></p>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-xl bg-[var(--background)]/80 px-3 py-2">
                <p className="text-sm text-[var(--text-muted)]">Unrealised P&L</p>
                <p className={`text-sm font-bold ${pnl >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                  {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%)
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${pos.product === "MIS" ? "bg-amber-400/15 text-[var(--warn-label)]" : "bg-indigo-400/15 text-[var(--info-label)]"}`}>
                  {pos.product}
                </span>
                <button
                  type="button"
                  onClick={() => void closePosition(pos, cmp, "manual")}
                  disabled={closingKeys.has(`${pos.symbol}__${pos.product}`)}
                  className="flex items-center gap-1 rounded-full bg-red-400/10 px-3 py-1 text-xs font-bold text-[var(--error-label)] hover:bg-red-400/20 disabled:opacity-50"
                >
                  <FiRefreshCw size={11} /> {closingKeys.has(`${pos.symbol}__${pos.product}`) ? "Closing..." : "Square Off"}
                </button>
                {pos.product === "MIS" && (
                  <button type="button" className="flex items-center gap-1 rounded-full bg-indigo-400/10 px-3 py-1 text-xs font-bold text-[var(--info-label)] hover:bg-indigo-400/20">
                    <FiArrowRight size={11} /> Convert → CNC
                  </button>
                )}
              </div>
            </article>
          );
        })
      )}

      {/* Closed positions */}
      {closed.length > 0 && (
        <>
          <p className="text-sm font-bold text-[var(--text-secondary)]">Closed Positions</p>
          {closed.map((pos) => (
            <article key={pos.symbol + "_closed"} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)]/60 p-4 opacity-60">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-[var(--text-primary)]">{pos.title}</p>
                <span className="rounded-full bg-[var(--card-border)] px-2 py-1 text-xs text-[var(--text-secondary)]">Closed</span>
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
