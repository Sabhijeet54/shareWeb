"use client";

import { FormEvent, useState } from "react";
import { FiTrendingDown, FiTrendingUp } from "react-icons/fi";
import {
  addDoc,
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getStaticStockList } from "@/lib/api";

type OrderType = "MARKET" | "LIMIT" | "SL" | "SL-M" | "AMO" | "GTT";
type ProductType = "MIS" | "CNC" | "NRML";
type ValidityType = "DAY" | "IOC" | "GTC";


export function OrderPlacement({ symbol: initSymbol, balance }: { symbol?: string; balance: number }) {
  const { user } = useAuth();
  const stocks = getStaticStockList();
  const [symbol, setSymbol] = useState(initSymbol || "RELIANCE");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [productType, setProductType] = useState<ProductType>("MIS");
  const [validity, setValidity] = useState<ValidityType>("DAY");
  const [quantity, setQuantity] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [target, setTarget] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [gttCondition, setGttCondition] = useState<"above" | "below">("above");
  const [gttPrice, setGttPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const stock = stocks.find((s) => s.symbol === symbol) || stocks[0];
  const qty = Math.max(1, Number(quantity) || 1);
  const execPrice = orderType === "LIMIT" || orderType === "SL" ? (Number(limitPrice) || stock.price) : stock.price;
  const orderValue = qty * execPrice;
  const marginRequired = productType === "MIS" ? orderValue * 0.2 : productType === "NRML" ? orderValue * 0.15 : orderValue;
  const brokerage = Math.min(20, orderValue * 0.0003);
  const stt = productType === "CNC" ? orderValue * 0.001 : orderValue * 0.00025;
  const totalCharges = Math.round(brokerage + stt + orderValue * 0.0002);


  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (!user?.email) return;
    setBusy(true);
    setMessage("");

    try {
      const impact = side === "BUY" ? marginRequired + totalCharges : marginRequired;

      if (side === "BUY") {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", user.uid);
          const snapshot = await transaction.get(userRef);
          const currentBalance = Number(snapshot.data()?.walletBalance ?? 0);
          if (currentBalance < impact) throw new Error("Insufficient margin");
          transaction.update(userRef, { walletBalance: increment(-impact), updatedAt: serverTimestamp() });
        });
      } else {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, "users", user.uid);
          transaction.update(userRef, { walletBalance: increment(marginRequired - totalCharges), updatedAt: serverTimestamp() });
        });
      }

      await addDoc(collection(db, "trades"), {
        side,
        symbol,
        title: stock.name,
        quantity: qty,
        price: execPrice,
        amount: impact,
        orderType,
        productType,
        validity,
        triggerPrice: Number(triggerPrice) || null,
        target: Number(target) || null,
        stopLoss: Number(stopLoss) || null,
        gttCondition: orderType === "GTT" ? gttCondition : null,
        gttPrice: orderType === "GTT" ? Number(gttPrice) : null,
        charges: totalCharges,
        status: orderType === "AMO" ? "pending_amo" : orderType === "GTT" ? "pending_gtt" : "executed",
        mode: "paper",
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      const statusMsg = orderType === "AMO" ? "AMO placed. Will execute at market open." :
        orderType === "GTT" ? "GTT order set. Will trigger when condition meets." :
        `${side} order executed at Rs. ${execPrice.toLocaleString("en-IN")}`;
      setMessage(statusMsg);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }


  return (
    <form onSubmit={placeOrder} className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Place Order</h2>
        <p className="text-xs text-slate-400">Balance: <span className="font-bold text-white">Rs. {balance.toLocaleString("en-IN")}</span></p>
      </div>

      {/* Buy/Sell Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setSide("BUY")}
          className={`h-11 rounded-xl font-bold text-sm ${side === "BUY" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          BUY
        </button>
        <button type="button" onClick={() => setSide("SELL")}
          className={`h-11 rounded-xl font-bold text-sm ${side === "SELL" ? "bg-red-400 text-white" : "bg-black/30 text-slate-400"}`}>
          SELL
        </button>
      </div>

      {/* Stock Selector */}
      <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
        className="h-11 w-full rounded-xl bg-black/30 px-4 text-sm text-white border border-white/10">
        {stocks.map((s) => <option key={s.symbol} value={s.symbol} className="bg-slate-900">{s.symbol} - Rs. {s.price}</option>)}
      </select>

      {/* Order Type */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Order Type</label>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
          {(["MARKET", "LIMIT", "SL", "SL-M", "AMO", "GTT"] as OrderType[]).map((t) => (
            <button key={t} type="button" onClick={() => setOrderType(t)}
              className={`rounded-lg py-2 text-xs font-bold ${orderType === t ? "bg-blue-500 text-white" : "bg-black/30 text-slate-400"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Product Type */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Product</label>
        <div className="grid grid-cols-3 gap-2">
          {(["MIS", "CNC", "NRML"] as ProductType[]).map((t) => (
            <button key={t} type="button" onClick={() => setProductType(t)}
              className={`rounded-lg py-2 text-xs font-bold ${productType === t ? "bg-purple-500 text-white" : "bg-black/30 text-slate-400"}`}>
              {t} <span className="block text-[10px] opacity-70">{t === "MIS" ? "Intraday" : t === "CNC" ? "Delivery" : "F&O"}</span>
            </button>
          ))}
        </div>
      </div>


      {/* Quantity & Price Inputs */}
      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-xl bg-black/20 p-3">
          <span className="text-xs text-slate-500">Quantity</span>
          <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
        </label>
        {(orderType === "LIMIT" || orderType === "SL") && (
          <label className="rounded-xl bg-black/20 p-3">
            <span className="text-xs text-slate-500">Limit Price</span>
            <input type="number" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={String(stock.price)}
              className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600" />
          </label>
        )}
        {(orderType === "SL" || orderType === "SL-M") && (
          <label className="rounded-xl bg-black/20 p-3">
            <span className="text-xs text-slate-500">Trigger Price</span>
            <input type="number" value={triggerPrice} onChange={(e) => setTriggerPrice(e.target.value)}
              className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
          </label>
        )}
      </div>

      {/* GTT Conditions */}
      {orderType === "GTT" && (
        <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-300">GTT - Good Till Triggered</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setGttCondition("above")}
              className={`rounded-lg py-2 text-xs font-bold ${gttCondition === "above" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
              Price goes ABOVE
            </button>
            <button type="button" onClick={() => setGttCondition("below")}
              className={`rounded-lg py-2 text-xs font-bold ${gttCondition === "below" ? "bg-red-400 text-white" : "bg-black/30 text-slate-400"}`}>
              Price goes BELOW
            </button>
          </div>
          <input type="number" value={gttPrice} onChange={(e) => setGttPrice(e.target.value)}
            placeholder="Trigger price..."
            className="h-10 w-full rounded-lg bg-black/30 px-3 text-sm text-white outline-none" />
        </div>
      )}

      {/* Target & Stop Loss */}
      <div className="grid grid-cols-2 gap-3">
        <label className="rounded-xl bg-black/20 p-3">
          <span className="text-xs text-slate-500">Target (optional)</span>
          <input type="number" value={target} onChange={(e) => setTarget(e.target.value)}
            className="mt-1 h-9 w-full bg-transparent text-sm font-bold text-white outline-none" placeholder="0" />
        </label>
        <label className="rounded-xl bg-black/20 p-3">
          <span className="text-xs text-slate-500">Stop Loss (optional)</span>
          <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            className="mt-1 h-9 w-full bg-transparent text-sm font-bold text-white outline-none" placeholder="0" />
        </label>
      </div>


      {/* Validity */}
      <div>
        <label className="text-xs text-slate-500 mb-1 block">Validity</label>
        <div className="grid grid-cols-3 gap-2">
          {(["DAY", "IOC", "GTC"] as ValidityType[]).map((v) => (
            <button key={v} type="button" onClick={() => setValidity(v)}
              className={`rounded-lg py-2 text-xs font-bold ${validity === v ? "bg-cyan-500 text-white" : "bg-black/30 text-slate-400"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div className="rounded-xl bg-black/20 p-3 space-y-2 text-sm">
        <div className="flex justify-between text-slate-400">
          <span>Order Value</span>
          <span className="font-bold text-white">Rs. {orderValue.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Margin Required</span>
          <span className="font-bold text-white">Rs. {Math.round(marginRequired).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Est. Charges (Brokerage + STT + Others)</span>
          <span className="font-bold text-white">Rs. {totalCharges.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-slate-400 border-t border-white/10 pt-2">
          <span className="font-bold">Total {side === "BUY" ? "Debit" : "Credit"}</span>
          <span className="font-bold text-white">Rs. {side === "BUY" ? (Math.round(marginRequired) + totalCharges).toLocaleString("en-IN") : (Math.round(marginRequired) - totalCharges).toLocaleString("en-IN")}</span>
        </div>
      </div>

      {message && <p className={`text-sm ${message.includes("fail") || message.includes("Insufficient") ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}

      {/* Submit */}
      <button type="submit" disabled={busy}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold disabled:opacity-60 ${
          side === "BUY" ? "bg-emerald-400 text-slate-950" : "bg-red-400 text-white"
        }`}>
        {side === "BUY" ? <FiTrendingUp /> : <FiTrendingDown />}
        {busy ? "Processing..." : `${side} ${symbol}`}
      </button>
    </form>
  );
}
