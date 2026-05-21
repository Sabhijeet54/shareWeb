"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FiCheckCircle } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<TradeOrder[]>([]);

  useEffect(() => {
    if (!user) return;

    // No orderBy — avoids composite index requirement. Sort client-side.
    const ordersQuery = query(
      collection(db, "trades"),
      where("userId", "==", user.uid),
    );
    return onSnapshot(ordersQuery, (snapshot) => {
      const all = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as TradeOrder[];
      all.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
      setOrders(all);
    });
  }, [user]);

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-label)]">
          Paper orders
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Executed Trades
        </h2>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-[var(--background)]/80 p-4 text-sm text-[var(--text-secondary)]">
          No fake trades yet. Open Watchlist and use Buy or Sell.
        </p>
      ) : (
        orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[var(--text-primary)]">{order.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{order.symbol}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  order.side === "BUY"
                    ? "bg-emerald-400/15 text-[var(--accent-label)]"
                    : "bg-red-400/15 text-[var(--error-label)]"
                }`}
              >
                {order.side}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[var(--background)]/80 p-3 text-sm">
              <p className="text-[var(--text-muted)]">
                Lots
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.lots ?? "-"}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Qty
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.quantity}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Lot size
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.lotSize ?? 1}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Price
                <span className="block font-bold text-[var(--text-primary)]">
                  Rs. {order.price.toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Wallet
                <span className="block font-bold text-[var(--text-primary)]">
                  Rs. {order.amount.toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Product
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.product ?? "PAPER"}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Type
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.orderType ?? "MARKET"}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Validity
                <span className="block font-bold text-[var(--text-primary)]">
                  {order.validity ?? "DAY"}
                </span>
              </p>
              <p className="text-[var(--text-muted)]">
                Charges
                <span className="block font-bold text-[var(--text-primary)]">
                  Rs. {(order.charges ?? 0).toLocaleString("en-IN")}
                </span>
              </p>
            </div>

            {(order.target || order.stopLoss) && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--background)]/80 p-3 text-sm">
                <p className="text-[var(--text-muted)]">
                  Target
                  <span className="block font-bold text-[var(--accent-label)]">
                    {order.target
                      ? `Rs. ${order.target.toLocaleString("en-IN")}`
                      : "Not set"}
                  </span>
                </p>
                <p className="text-[var(--text-muted)]">
                  Stop loss
                  <span className="block font-bold text-[var(--error-label)]">
                    {order.stopLoss
                      ? `Rs. ${order.stopLoss.toLocaleString("en-IN")}`
                      : "Not set"}
                  </span>
                </p>
              </div>
            )}

            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--accent-label)]">
              <FiCheckCircle /> {order.status} in paper mode
            </p>
          </article>
        ))
      )}
    </section>
  );
}
