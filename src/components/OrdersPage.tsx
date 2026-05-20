"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { FiCheckCircle } from "react-icons/fi";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import type { TradeOrder } from "@/types/app";

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<TradeOrder[]>([]);

  useEffect(() => {
    if (!user) return;

    const ordersQuery = query(
      collection(db, "trades"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    return onSnapshot(ordersQuery, (snapshot) => {
      setOrders(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as TradeOrder[],
      );
    });
  }, [user]);

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Paper orders
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Executed Trades
        </h2>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-black/20 p-4 text-sm text-slate-400">
          No fake trades yet. Open Watchlist and use Buy or Sell.
        </p>
      ) : (
        orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-white/10 bg-[#08111a] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{order.title}</p>
                <p className="mt-1 text-xs text-slate-500">{order.symbol}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  order.side === "BUY"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-red-400/15 text-red-300"
                }`}
              >
                {order.side}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-3 text-sm">
              <p className="text-slate-500">
                Lots
                <span className="block font-bold text-white">
                  {order.lots ?? "-"}
                </span>
              </p>
              <p className="text-slate-500">
                Qty
                <span className="block font-bold text-white">
                  {order.quantity}
                </span>
              </p>
              <p className="text-slate-500">
                Lot size
                <span className="block font-bold text-white">
                  {order.lotSize ?? 1}
                </span>
              </p>
              <p className="text-slate-500">
                Price
                <span className="block font-bold text-white">
                  Rs. {order.price.toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-slate-500">
                Wallet
                <span className="block font-bold text-white">
                  Rs. {order.amount.toLocaleString("en-IN")}
                </span>
              </p>
              <p className="text-slate-500">
                Product
                <span className="block font-bold text-white">
                  {order.product ?? "PAPER"}
                </span>
              </p>
              <p className="text-slate-500">
                Type
                <span className="block font-bold text-white">
                  {order.orderType ?? "MARKET"}
                </span>
              </p>
              <p className="text-slate-500">
                Validity
                <span className="block font-bold text-white">
                  {order.validity ?? "DAY"}
                </span>
              </p>
              <p className="text-slate-500">
                Charges
                <span className="block font-bold text-white">
                  Rs. {(order.charges ?? 0).toLocaleString("en-IN")}
                </span>
              </p>
            </div>

            {(order.target || order.stopLoss) && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-3 text-sm">
                <p className="text-slate-500">
                  Target
                  <span className="block font-bold text-emerald-300">
                    {order.target
                      ? `Rs. ${order.target.toLocaleString("en-IN")}`
                      : "Not set"}
                  </span>
                </p>
                <p className="text-slate-500">
                  Stop loss
                  <span className="block font-bold text-red-300">
                    {order.stopLoss
                      ? `Rs. ${order.stopLoss.toLocaleString("en-IN")}`
                      : "Not set"}
                  </span>
                </p>
              </div>
            )}

            <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <FiCheckCircle /> {order.status} in paper mode
            </p>
          </article>
        ))
      )}
    </section>
  );
}
