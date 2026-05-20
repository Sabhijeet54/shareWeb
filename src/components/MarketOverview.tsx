"use client";

import { FormEvent, useMemo, useState } from "react";
import { FiSearch, FiTrendingDown, FiTrendingUp } from "react-icons/fi";
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

type WatchlistKey =
  | "indices"
  | "indexFut"
  | "indexOpt"
  | "stocks"
  | "stockFut"
  | "stockOpt"
  | "commodities"
  | "crypto";

type Instrument = {
  symbol: string;
  title: string;
  subtitle: string;
  price: number;
  change: number;
  volume: string;
  high: number;
  low: number;
  oi?: string;
};

type ContractMeta = {
  lotSize: number;
  product: "CASH" | "FUT" | "OPT" | "INDEX" | "COMMODITY" | "CRYPTO";
  marginRate: number;
  tradableLabel: string;
};

const watchTabs: Array<{ key: WatchlistKey; label: string }> = [
  { key: "indices", label: "Indices" },
  { key: "indexFut", label: "Index Fut" },
  { key: "indexOpt", label: "Index Opt" },
  { key: "stocks", label: "Stocks" },
  { key: "stockFut", label: "Stock Fut" },
  { key: "stockOpt", label: "Stock Opt" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
];

const watchlists: Record<WatchlistKey, Instrument[]> = {
  indices: [
    { symbol: "NIFTY", title: "NIFTY 50", subtitle: "Index", price: 22480, change: 0.62, volume: "18.4Cr", high: 22540, low: 22380 },
    { symbol: "SENSEX", title: "SENSEX", subtitle: "Index", price: 74020, change: 0.54, volume: "9.1Cr", high: 74280, low: 73720 },
    { symbol: "BANKNIFTY", title: "BANKNIFTY", subtitle: "Index", price: 48260, change: -0.28, volume: "7.8Cr", high: 48520, low: 48010 },
    { symbol: "FINNIFTY", title: "FINNIFTY", subtitle: "Index", price: 21440, change: 0.31, volume: "4.2Cr", high: 21520, low: 21360 },
    { symbol: "MIDCPNIFTY", title: "MIDCPNIFTY", subtitle: "Index", price: 10880, change: 0.74, volume: "2.9Cr", high: 10935, low: 10810 },
    { symbol: "INDIAVIX", title: "INDIA VIX", subtitle: "Volatility", price: 14.8, change: -1.86, volume: "Live", high: 15.3, low: 14.5 },
  ],
  indexFut: [
    { symbol: "NIFTY FUT", title: "NIFTY FUT", subtitle: "Current month", price: 22540, change: 0.46, volume: "2.4L", high: 22610, low: 22420, oi: "1.28Cr" },
    { symbol: "BANKNIFTY FUT", title: "BANKNIFTY FUT", subtitle: "Current month", price: 48410, change: -0.18, volume: "1.1L", high: 48640, low: 48180, oi: "42.6L" },
    { symbol: "FINNIFTY FUT", title: "FINNIFTY FUT", subtitle: "Current month", price: 21510, change: 0.22, volume: "86K", high: 21580, low: 21410, oi: "18.3L" },
    { symbol: "MIDCPNIFTY FUT", title: "MIDCPNIFTY FUT", subtitle: "Current month", price: 10935, change: 0.51, volume: "44K", high: 10980, low: 10870, oi: "9.7L" },
  ],
  indexOpt: [
    { symbol: "NIFTY 22500 CE", title: "NIFTY 22500 CE", subtitle: "Call option", price: 142, change: 8.4, volume: "14.2L", high: 168, low: 96, oi: "82.1L" },
    { symbol: "NIFTY 22500 PE", title: "NIFTY 22500 PE", subtitle: "Put option", price: 128, change: -6.1, volume: "12.8L", high: 174, low: 110, oi: "76.3L" },
    { symbol: "BANKNIFTY 48500 CE", title: "BANKNIFTY 48500 CE", subtitle: "Call option", price: 312, change: 4.8, volume: "5.7L", high: 382, low: 240, oi: "34.2L" },
    { symbol: "BANKNIFTY 48000 PE", title: "BANKNIFTY 48000 PE", subtitle: "Put option", price: 286, change: -3.4, volume: "4.9L", high: 350, low: 250, oi: "29.4L" },
    { symbol: "FINNIFTY 21500 CE", title: "FINNIFTY 21500 CE", subtitle: "Call option", price: 88, change: 6.9, volume: "2.1L", high: 108, low: 62, oi: "13.8L" },
    { symbol: "MIDCPNIFTY 10900 PE", title: "MIDCPNIFTY 10900 PE", subtitle: "Put option", price: 74, change: -2.7, volume: "1.8L", high: 94, low: 58, oi: "10.5L" },
  ],
  stocks: [
    { symbol: "RELIANCE", title: "RELIANCE", subtitle: "NSE equity", price: 2860, change: 1.24, volume: "62.4L", high: 2894, low: 2820 },
    { symbol: "TCS", title: "TCS", subtitle: "NSE equity", price: 3920, change: -0.42, volume: "18.1L", high: 3976, low: 3898 },
    { symbol: "HDFCBANK", title: "HDFC BANK", subtitle: "NSE equity", price: 1518, change: 0.66, volume: "1.4Cr", high: 1536, low: 1502 },
    { symbol: "INFY", title: "INFOSYS", subtitle: "NSE equity", price: 1435, change: -0.18, volume: "74.2L", high: 1452, low: 1424 },
    { symbol: "ICICIBANK", title: "ICICI BANK", subtitle: "NSE equity", price: 1098, change: 0.91, volume: "98.7L", high: 1110, low: 1086 },
    { symbol: "SBIN", title: "SBI", subtitle: "NSE equity", price: 822, change: 1.76, volume: "2.2Cr", high: 832, low: 806 },
    { symbol: "LT", title: "L&T", subtitle: "NSE equity", price: 3520, change: -0.64, volume: "22.8L", high: 3566, low: 3492 },
    { symbol: "TATAMOTORS", title: "TATA MOTORS", subtitle: "NSE equity", price: 985, change: 2.12, volume: "1.8Cr", high: 1002, low: 962 },
  ],
  stockFut: [
    { symbol: "RELIANCE FUT", title: "RELIANCE FUT", subtitle: "Current month", price: 2875, change: 1.1, volume: "1.2L", high: 2910, low: 2842, oi: "21.7L" },
    { symbol: "TCS FUT", title: "TCS FUT", subtitle: "Current month", price: 3942, change: -0.36, volume: "48K", high: 3990, low: 3912, oi: "7.8L" },
    { symbol: "HDFCBANK FUT", title: "HDFCBANK FUT", subtitle: "Current month", price: 1527, change: 0.72, volume: "1.9L", high: 1540, low: 1510, oi: "35.4L" },
    { symbol: "SBIN FUT", title: "SBIN FUT", subtitle: "Current month", price: 828, change: 1.54, volume: "2.4L", high: 838, low: 812, oi: "42.1L" },
  ],
  stockOpt: [
    { symbol: "RELIANCE 2900 CE", title: "RELIANCE 2900 CE", subtitle: "Call option", price: 44, change: 12.2, volume: "3.2L", high: 58, low: 28, oi: "18.4L" },
    { symbol: "RELIANCE 2800 PE", title: "RELIANCE 2800 PE", subtitle: "Put option", price: 36, change: -8.1, volume: "2.6L", high: 54, low: 30, oi: "16.9L" },
    { symbol: "TCS 4000 CE", title: "TCS 4000 CE", subtitle: "Call option", price: 58, change: -3.8, volume: "92K", high: 76, low: 50, oi: "5.8L" },
    { symbol: "SBIN 820 CE", title: "SBIN 820 CE", subtitle: "Call option", price: 18, change: 15.4, volume: "4.1L", high: 24, low: 11, oi: "22.7L" },
    { symbol: "HDFCBANK 1500 PE", title: "HDFCBANK 1500 PE", subtitle: "Put option", price: 24, change: -6.4, volume: "2.2L", high: 38, low: 20, oi: "14.8L" },
  ],
  commodities: [
    { symbol: "GOLD", title: "GOLD", subtitle: "Commodity", price: 72850, change: 0.44, volume: "38K", high: 73180, low: 72420 },
    { symbol: "SILVER", title: "SILVER", subtitle: "Commodity", price: 91200, change: 0.82, volume: "54K", high: 91850, low: 90480 },
    { symbol: "CRUDEOIL", title: "CRUDE OIL", subtitle: "Commodity", price: 6840, change: -1.12, volume: "1.2L", high: 6920, low: 6780 },
    { symbol: "NATURALGAS", title: "NATURAL GAS", subtitle: "Commodity", price: 238, change: 1.9, volume: "88K", high: 244, low: 232 },
  ],
  crypto: [
    { symbol: "BTCUSDT", title: "BTC", subtitle: "Crypto", price: 68420, change: 1.18, volume: "$28.4B", high: 69220, low: 67440 },
    { symbol: "ETHUSDT", title: "ETH", subtitle: "Crypto", price: 3540, change: 0.74, volume: "$11.2B", high: 3588, low: 3482 },
    { symbol: "SOLUSDT", title: "SOL", subtitle: "Crypto", price: 162, change: 2.84, volume: "$2.6B", high: 166, low: 156 },
    { symbol: "XRPUSDT", title: "XRP", subtitle: "Crypto", price: 0.61, change: -0.92, volume: "$1.1B", high: 0.64, low: 0.6 },
  ],
};

const allInstruments = Object.values(watchlists).flat();

function getContractMeta(instrument: Instrument): ContractMeta {
  const symbol = instrument.symbol;
  const isOption = instrument.subtitle.toLowerCase().includes("option");
  const isFuture = instrument.subtitle.toLowerCase().includes("current month");

  if (symbol.includes("BANKNIFTY")) {
    return {
      lotSize: 30,
      product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX",
      marginRate: isFuture ? 0.15 : 1,
      tradableLabel: "30 qty / lot",
    };
  }

  if (symbol.includes("FINNIFTY")) {
    return {
      lotSize: 60,
      product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX",
      marginRate: isFuture ? 0.15 : 1,
      tradableLabel: "60 qty / lot",
    };
  }

  if (symbol.includes("MIDCPNIFTY")) {
    return {
      lotSize: 120,
      product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX",
      marginRate: isFuture ? 0.15 : 1,
      tradableLabel: "120 qty / lot",
    };
  }

  if (symbol.includes("SENSEX")) {
    return {
      lotSize: 20,
      product: "INDEX",
      marginRate: 1,
      tradableLabel: "20 qty / lot",
    };
  }

  if (symbol.includes("NIFTY")) {
    return {
      lotSize: 65,
      product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX",
      marginRate: isFuture ? 0.15 : 1,
      tradableLabel: "65 qty / lot",
    };
  }

  if (isFuture || isOption) {
    const stockLots: Record<string, number> = {
      RELIANCE: 500,
      TCS: 175,
      HDFCBANK: 550,
      SBIN: 1500,
    };
    const lotSize =
      Object.entries(stockLots).find(([key]) => symbol.includes(key))?.[1] ??
      500;

    return {
      lotSize,
      product: isOption ? "OPT" : "FUT",
      marginRate: isFuture ? 0.18 : 1,
      tradableLabel: `${lotSize} qty / lot`,
    };
  }

  if (instrument.subtitle === "Commodity") {
    return {
      lotSize: 1,
      product: "COMMODITY",
      marginRate: 1,
      tradableLabel: "1 unit",
    };
  }

  if (instrument.subtitle === "Crypto") {
    return {
      lotSize: 1,
      product: "CRYPTO",
      marginRate: 1,
      tradableLabel: "1 unit",
    };
  }

  return {
    lotSize: 1,
    product: "CASH",
    marginRate: 1,
    tradableLabel: "1 share",
  };
}

function MarketDataPanel({ instrument }: { instrument: Instrument }) {
  const isUp = instrument.change >= 0;
  const meta = getContractMeta(instrument);
  const spread = Math.max(0.05, instrument.price * 0.0008);
  const bid = instrument.price - spread;
  const ask = instrument.price + spread;
  const range = Math.max(1, instrument.high - instrument.low);
  const position = Math.min(
    100,
    Math.max(0, ((instrument.price - instrument.low) / range) * 100),
  );
  const stats = [
    { label: "Bid", value: `Rs. ${bid.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` },
    { label: "Ask", value: `Rs. ${ask.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` },
    { label: "Day high", value: `Rs. ${instrument.high.toLocaleString("en-IN")}` },
    { label: "Day low", value: `Rs. ${instrument.low.toLocaleString("en-IN")}` },
    { label: "Volume", value: instrument.volume },
    { label: "OI", value: instrument.oi ?? "N/A" },
    { label: "Lot size", value: meta.tradableLabel },
    { label: "Product", value: meta.product },
  ];

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            Market data
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {instrument.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{instrument.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            Rs. {instrument.price.toLocaleString("en-IN")}
          </p>
          <p
            className={
              isUp
                ? "text-sm font-bold text-emerald-300"
                : "text-sm font-bold text-red-300"
            }
          >
            {isUp ? "+" : ""}
            {instrument.change.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-black/25 p-4">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>Low Rs. {instrument.low.toLocaleString("en-IN")}</span>
          <span>High Rs. {instrument.high.toLocaleString("en-IN")}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div
            className="h-2 rounded-full bg-emerald-400"
            style={{ width: `${position}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-black/25 p-4">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-sm font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Demo market data for paper trading. No external chart/API dependency, so
        this screen stays stable.
      </p>
    </section>
  );
}

function TradeTicket({
  instrument,
  balance,
}: {
  instrument: Instrument;
  balance: number;
}) {
  const { user } = useAuth();
  const [lots, setLots] = useState("1");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [productType, setProductType] = useState<"INTRADAY" | "DELIVERY">(
    "INTRADAY",
  );
  const [validity, setValidity] = useState<"DAY" | "IOC">("DAY");
  const [target, setTarget] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = getContractMeta(instrument);
  const lotCount = Math.max(1, Number(lots) || 1);
  const qty = lotCount * meta.lotSize;
  const executionPrice =
    orderType === "LIMIT" && Number(limitPrice) > 0
      ? Number(limitPrice)
      : instrument.price;
  const notionalValue = Math.round(qty * executionPrice);
  const walletImpact = Math.round(notionalValue * meta.marginRate);
  const brokerage = Math.min(20, Math.max(0, notionalValue * 0.0003));
  const taxes = notionalValue * 0.0007;
  const estimatedCharges = Math.round(brokerage + taxes);
  const buyDebit = walletImpact + estimatedCharges;
  const sellCredit = Math.max(0, walletImpact - estimatedCharges);
  const valueLabel =
    meta.product === "FUT" ? "Margin required" : "Order value";
  const targetValue = Number(target);
  const stopLossValue = Number(stopLoss);
  const targetPnL =
    targetValue > 0 ? Math.round((targetValue - executionPrice) * qty) : 0;
  const stopLossPnL =
    stopLossValue > 0 ? Math.round((stopLossValue - executionPrice) * qty) : 0;

  async function placeTrade(side: "BUY" | "SELL") {
    if (!user?.email) return;
    setBusy(true);
    setMessage("");

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.uid);
        const snapshot = await transaction.get(userRef);
        const currentBalance = Number(snapshot.data()?.walletBalance ?? 0);

        const impact = side === "BUY" ? buyDebit : sellCredit;

        if (side === "BUY" && currentBalance < impact) {
          throw new Error("Insufficient wallet balance");
        }

        transaction.update(userRef, {
          walletBalance: increment(side === "BUY" ? -impact : impact),
          updatedAt: serverTimestamp(),
        });
      });

      const impact = side === "BUY" ? buyDebit : sellCredit;

      await addDoc(collection(db, "trades"), {
        side,
        symbol: instrument.symbol,
        title: instrument.title,
        lots: lotCount,
        lotSize: meta.lotSize,
        quantity: qty,
        price: executionPrice,
        amount: impact,
        notionalValue,
        charges: estimatedCharges,
        orderType,
        productType,
        validity,
        target: targetValue || null,
        stopLoss: stopLossValue || null,
        product: meta.product,
        status: "executed",
        mode: "paper",
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      setMessage(
        side === "BUY"
          ? `Fake buy executed. Rs. ${impact.toLocaleString("en-IN")} deducted.`
          : `Fake sell executed. Rs. ${impact.toLocaleString("en-IN")} added.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Trade failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Trade Ticket</h2>
          <p className="mt-1 text-xs text-slate-500">
            Demo buy/sell, wallet only
          </p>
        </div>
        <p className="text-right text-xs text-slate-400">
          Wallet
          <span className="block text-base font-bold text-white">
            Rs. {balance.toLocaleString("en-IN")}
          </span>
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-black/20 p-1">
        {(["MARKET", "LIMIT"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setOrderType(type)}
            className={`h-10 rounded-xl text-xs font-bold ${
              orderType === type
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-400"
            }`}
          >
            {type}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setProductType(productType === "INTRADAY" ? "DELIVERY" : "INTRADAY")
          }
          className="h-10 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
        >
          {productType}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_120px] gap-3">
        <div className="rounded-2xl bg-black/25 p-4">
          <p className="text-xs text-slate-500">Selected</p>
          <p className="mt-1 font-bold text-white">{instrument.title}</p>
          <p className="mt-1 text-sm text-emerald-300">
            Rs. {instrument.price.toLocaleString("en-IN")}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {meta.product} · {meta.tradableLabel}
          </p>
        </div>
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">
            {meta.lotSize > 1 ? "Lots" : "Qty"}
          </span>
          <input
            type="number"
            min="1"
            value={lots}
            onChange={(event) => setLots(event.target.value)}
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {orderType === "LIMIT" ? (
          <label className="rounded-2xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Limit price</span>
            <input
              type="number"
              min="0"
              value={limitPrice}
              onChange={(event) => setLimitPrice(event.target.value)}
              placeholder={String(instrument.price)}
              className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600"
            />
          </label>
        ) : (
          <div className="rounded-2xl bg-black/25 p-3">
            <p className="text-xs text-slate-500">Execution</p>
            <p className="mt-1 text-lg font-bold text-white">Market</p>
          </div>
        )}
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Validity</span>
          <select
            value={validity}
            onChange={(event) => setValidity(event.target.value as "DAY" | "IOC")}
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none"
          >
            <option className="bg-slate-950" value="DAY">
              DAY
            </option>
            <option className="bg-slate-950" value="IOC">
              IOC
            </option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Target</span>
          <input
            type="number"
            min="0"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="Optional"
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600"
          />
        </label>
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Stop loss</span>
          <input
            type="number"
            min="0"
            value={stopLoss}
            onChange={(event) => setStopLoss(event.target.value)}
            placeholder="Optional"
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600"
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">
          Quantity
          <span className="block font-bold text-white">
            {qty.toLocaleString("en-IN")}
          </span>
        </p>
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">
          {valueLabel}
          <span className="block font-bold text-white">
            Rs. {walletImpact.toLocaleString("en-IN")}
          </span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">
          Est. charges
          <span className="block font-bold text-white">
            Rs. {estimatedCharges.toLocaleString("en-IN")}
          </span>
        </p>
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">
          Buy debit
          <span className="block font-bold text-white">
            Rs. {buyDebit.toLocaleString("en-IN")}
          </span>
        </p>
      </div>

      {(targetValue > 0 || stopLossValue > 0) && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm">
          <p className="font-semibold text-white">Bracket preview</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <p className="text-slate-500">
              Target P&L
              <span
                className={`block font-bold ${
                  targetPnL >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                Rs. {targetPnL.toLocaleString("en-IN")}
              </span>
            </p>
            <p className="text-slate-500">
              SL P&L
              <span
                className={`block font-bold ${
                  stopLossPnL >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                Rs. {stopLossPnL.toLocaleString("en-IN")}
              </span>
            </p>
          </div>
        </div>
      )}

      {meta.product === "FUT" ? (
        <p className="mt-3 text-xs text-slate-500">
          Futures show approx paper margin. Notional value: Rs.{" "}
          {notionalValue.toLocaleString("en-IN")}
        </p>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => placeTrade("BUY")}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 disabled:opacity-60"
        >
          <FiTrendingUp /> Buy
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => placeTrade("SELL")}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-400 text-sm font-bold text-white disabled:opacity-60"
        >
          <FiTrendingDown /> Sell
        </button>
      </div>
    </section>
  );
}

export function MarketOverview({ balance }: { balance: number }) {
  const [activeTab, setActiveTab] = useState<WatchlistKey>("indices");
  const [selected, setSelected] = useState<Instrument>(watchlists.indices[0]);
  const [searchValue, setSearchValue] = useState("");

  const suggestions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return [];

    return allInstruments
      .filter(
        (item) =>
          item.symbol.toLowerCase().includes(query) ||
          item.title.toLowerCase().includes(query),
      )
      .slice(0, 6);
  }, [searchValue]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (suggestions[0]) setSelected(suggestions[0]);
  }

  function chooseTab(tab: WatchlistKey) {
    setActiveTab(tab);
    setSelected(watchlists[tab][0]);
    setSearchValue("");
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
            <FiTrendingUp /> Watchlist
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Paper Trading Market
          </h2>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {watchTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => chooseTab(tab.key)}
              className={`h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition ${
                activeTab === tab.key
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-black/25 text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative mt-3">
          <div className="flex items-center gap-3 rounded-2xl bg-black/30 px-4">
            <FiSearch className="shrink-0 text-slate-500" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search RELIANCE, NIFTY CE, GOLD..."
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
            />
          </div>
          {suggestions.length ? (
            <div className="absolute left-0 right-0 top-14 z-20 rounded-2xl border border-white/10 bg-[#0d141d] p-2 shadow-2xl">
              {suggestions.map((item) => (
                <button
                  key={`${item.symbol}-${item.subtitle}`}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setSearchValue("");
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-white/5"
                >
                  <span>
                    <span className="block text-sm font-bold text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    Rs. {item.price.toLocaleString("en-IN")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </form>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {watchlists[activeTab].map((item) => {
            const active = item.symbol === selected.symbol;

            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => setSelected(item)}
                className={`min-h-20 rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-emerald-300/60 bg-emerald-300/10"
                    : "border-white/10 bg-black/20 hover:border-white/20"
                }`}
              >
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  Rs. {item.price.toLocaleString("en-IN")}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <MarketDataPanel instrument={selected} />
      <TradeTicket instrument={selected} balance={balance} />
    </section>
  );
}
