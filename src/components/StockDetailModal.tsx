"use client";

import { useEffect, useRef, useState } from "react";
import { FiX, FiTrendingUp, FiTrendingDown, FiBarChart2 } from "react-icons/fi";
import {
  createChart, ColorType, CrosshairMode,
  type IChartApi, type ISeriesApi, type CandlestickData, type Time,
} from "lightweight-charts";
import {
  addDoc, collection, doc, increment,
  runTransaction, serverTimestamp, getDocs, query, where,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { getContractMeta } from "@/lib/marketData";
import { useLiveSingleQuote } from "@/lib/useLiveQuotes";
import { useChartData } from "@/lib/useChartData";
import type { Instrument, TradeOrder } from "@/types/app";

type Props = {
  instrument: Instrument;
  balance: number;
  onClose: () => void;
};

type TF = { label: string; value: string; range: string };
const CHART_TFS: TF[] = [
  { label: "5m", value: "5m", range: "1d" },
  { label: "15m", value: "15m", range: "5d" },
  { label: "1hr", value: "60m", range: "1mo" },
  { label: "1D", value: "1d", range: "6mo" },
];

/** Returns net qty held for a symbol (BUY qty - SELL qty) */
async function getHeldQty(userId: string, symbol: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, "trades"),
      where("userId", "==", userId),
      where("symbol", "==", symbol),
    ),
  );
  let net = 0;
  snap.forEach((d) => {
    const t = d.data() as TradeOrder;
    if (t.side === "BUY") net += t.quantity;
    else net -= t.quantity;
  });
  return Math.max(0, net);
}

export function StockDetailModal({ instrument, balance, onClose }: Props) {
  const { user } = useAuth();
  const meta = getContractMeta(instrument);

  // Live price
  const quote = useLiveSingleQuote(instrument.symbol, 10000);
  const livePrice = (quote && !quote.isLoading && quote.price > 0)
    ? quote.price
    : instrument.price;
  const liveChangePct = (quote && !quote.isLoading) ? quote.changePct : instrument.change;

  // Chart
  const [tf, setTf] = useState<TF>(CHART_TFS[0]);
  const { bars, isLoading: chartLoading } = useChartData(instrument.symbol, tf.value, tf.range);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Held qty (net open position for this symbol)
  const [heldQty, setHeldQty] = useState<number>(0);
  const [heldLoading, setHeldLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setHeldLoading(true);
    getHeldQty(user.uid, instrument.symbol)
      .then(setHeldQty)
      .finally(() => setHeldLoading(false));
  }, [user?.uid, instrument.symbol]);

  // Chart init
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#070b10" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: 220,
    });
    chartRef.current = chart;
    const series = chart.addCandlestickSeries({
      upColor: "#34d399", downColor: "#f87171",
      borderUpColor: "#34d399", borderDownColor: "#f87171",
      wickUpColor: "#34d399", wickDownColor: "#f87171",
    });
    seriesRef.current = series;
    const resize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || bars.length === 0) return;
    seriesRef.current.setData(
      bars.map((b) => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })) as CandlestickData[],
    );
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  // Trade state
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL">("MARKET");
  const [productType, setProductType] = useState<"MIS" | "CNC" | "NRML">("MIS");
  const [lots, setLots] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const lotCount = Math.max(1, Number(lots) || 1);
  const qty = lotCount * meta.lotSize;
  const execPrice = orderType !== "MARKET" && Number(limitPrice) > 0
    ? Number(limitPrice)
    : livePrice;
  const notionalValue = qty * execPrice;
  const walletImpact = Math.round(notionalValue * meta.marginRate);
  const charges = Math.round(Math.min(20, notionalValue * 0.0003) + notionalValue * 0.0007);
  const buyDebit = walletImpact + charges;
  const sellCredit = Math.max(0, walletImpact - charges);

  // Max lots for BUY based on wallet
  const maxBuyLots = meta.lotSize > 1
    ? Math.floor(balance / Math.max(1, (walletImpact / lotCount) + (charges / lotCount)))
    : Math.floor(balance / Math.max(1, buyDebit));

  // Validation
  const priceNotReady = livePrice === 0;
  const insufficientFunds = side === "BUY" && balance < buyDebit;
  // SELL: cannot sell more than what you hold
  const noHolding = side === "SELL" && !heldLoading && heldQty === 0;
  const sellExceedsHolding = side === "SELL" && !heldLoading && heldQty > 0 && qty > heldQty;
  const cannotExecute = priceNotReady || insufficientFunds || noHolding || sellExceedsHolding || busy;

  function getButtonLabel() {
    if (busy) return "Placing order...";
    if (priceNotReady) return "Loading price...";
    if (insufficientFunds) return "Insufficient funds";
    if (noHolding) return "No holding to sell";
    if (sellExceedsHolding) return `Max sell: ${heldQty} shares`;
    if (side === "BUY") return `BUY · ₹${buyDebit.toLocaleString("en-IN")}`;
    return `SELL · ₹${sellCredit.toLocaleString("en-IN")}`;
  }

  async function executeTrade() {
    if (!user?.email || cannotExecute) return;
    setBusy(true);
    setMessage("");
    try {
      // Re-check held qty at execution time to prevent race conditions
      if (side === "SELL") {
        const freshHeld = await getHeldQty(user.uid, instrument.symbol);
        if (freshHeld === 0) throw new Error("No open position to sell for this symbol");
        if (qty > freshHeld) throw new Error(`You only hold ${freshHeld} shares. Cannot sell ${qty}`);
      }

      await runTransaction(db, async (txn) => {
        const userRef = doc(db, "users", user.uid);
        const snap = await txn.get(userRef);
        const bal = Number(snap.data()?.walletBalance ?? 0);
        const impact = side === "BUY" ? buyDebit : sellCredit;
        if (side === "BUY" && bal < impact) throw new Error("Insufficient wallet balance");
        txn.update(userRef, {
          walletBalance: increment(side === "BUY" ? -impact : impact),
          updatedAt: serverTimestamp(),
        });
      });

      await addDoc(collection(db, "trades"), {
        side,
        symbol: instrument.symbol,
        title: instrument.title,
        lots: lotCount,
        lotSize: meta.lotSize,
        quantity: qty,
        price: execPrice,
        amount: side === "BUY" ? buyDebit : sellCredit,
        notionalValue,
        charges,
        orderType,
        productType,
        validity: "DAY",
        target: Number(target) || null,
        stopLoss: Number(stopLoss) || null,
        product: meta.product,
        status: "executed",
        mode: "paper",
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      // Refresh held qty after trade
      const updatedHeld = await getHeldQty(user.uid, instrument.symbol);
      setHeldQty(updatedHeld);

      setMessage(
        side === "BUY"
          ? `✅ BUY executed — ₹${buyDebit.toLocaleString("en-IN")} debited`
          : `✅ SELL executed — ₹${sellCredit.toLocaleString("en-IN")} credited`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? `❌ ${e.message}` : "❌ Trade failed");
    } finally {
      setBusy(false);
    }
  }

  const isUp = liveChangePct >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] border border-[var(--card-border)] bg-[var(--card-bg)] pb-8 shadow-2xl sm:rounded-[2rem]">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-[var(--divider)]" />

        {/* Header */}
        <div className="flex items-start justify-between gap-2 px-5 pt-5">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{instrument.title}</h2>
            <p className="text-xs text-[var(--text-muted)]">{instrument.subtitle} · {meta.product}</p>
            {/* Show held qty badge */}
            {!heldLoading && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${heldQty > 0 ? "bg-emerald-400/15 text-[var(--accent-label)]" : "bg-[var(--hover-bg)] text-[var(--text-muted)]"}`}>
                {heldQty > 0 ? `Holding: ${heldQty} shares` : "Not holding"}
              </span>
            )}
          </div>
          <div className="flex-1 text-right">
            {quote?.isLoading ? (
              <div className="h-7 w-24 animate-pulse rounded-xl bg-[var(--shimmer-bg)] ml-auto" />
            ) : (
              <>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className={`text-sm font-bold ${isUp ? "text-[var(--accent-label)]" : "text-[var(--error-label)]"}`}>
                  {isUp ? "+" : ""}{liveChangePct.toFixed(2)}%
                  {quote && !quote.isLoading && (
                    <span className="ml-1 opacity-60 text-xs">
                      ({isUp ? "+" : ""}₹{quote.change.toFixed(2)})
                    </span>
                  )}
                </p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--hover-bg)] p-2 text-[var(--text-secondary)] hover:bg-[var(--shimmer-bg)]">
            <FiX />
          </button>
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-4 gap-2 px-5">
          {[
            { label: "Open", value: `₹${(quote?.open || instrument.open || livePrice).toLocaleString("en-IN")}` },
            { label: "High", value: `₹${(quote?.high || instrument.high).toLocaleString("en-IN")}` },
            { label: "Low", value: `₹${(quote?.low || instrument.low).toLocaleString("en-IN")}` },
            {
              label: "Volume",
              value: quote?.volume
                ? quote.volume > 1e7 ? (quote.volume / 1e7).toFixed(1) + "Cr"
                : quote.volume > 1e5 ? (quote.volume / 1e5).toFixed(1) + "L"
                : quote.volume.toLocaleString()
                : instrument.volume,
            },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-[var(--background)]/80 p-2 text-center">
              <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
              <p className="text-xs font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Mini chart */}
        <div className="mt-4 px-5">
          <div className="mb-2 flex items-center gap-2">
            <FiBarChart2 size={13} className="text-[var(--accent-label)]" />
            <span className="text-xs font-semibold text-[var(--accent-label)]">LIVE CHART</span>
            <div className="ml-auto flex gap-1">
              {CHART_TFS.map((t) => (
                <button key={t.label} type="button" onClick={() => setTf(t)}
                  className={`h-7 rounded-lg px-2 text-[11px] font-bold transition ${tf.label === t.label ? "bg-emerald-400 text-slate-950" : "bg-[var(--hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {chartLoading && bars.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-2xl bg-[var(--background)]/80">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            </div>
          ) : bars.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center rounded-2xl bg-[var(--background)]/80 text-sm text-[var(--text-muted)]">
              Chart data unavailable for this instrument
            </div>
          ) : (
            <div ref={chartContainerRef} className="w-full overflow-hidden rounded-2xl" />
          )}
        </div>

        {/* Trade Ticket */}
        <div className="mt-5 px-5 space-y-3">
          {/* BUY / SELL toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--background)]/80 p-1">
            <button type="button" onClick={() => { setSide("BUY"); setMessage(""); }}
              className={`h-11 rounded-xl text-sm font-bold transition ${side === "BUY" ? "bg-emerald-400 text-slate-950" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
              BUY
            </button>
            <button type="button" onClick={() => { setSide("SELL"); setMessage(""); }}
              className={`h-11 rounded-xl text-sm font-bold transition ${side === "SELL" ? "bg-red-400 text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
              SELL
              {heldQty > 0 && <span className="ml-1 text-[10px] opacity-70">({heldQty})</span>}
            </button>
          </div>

          {/* SELL warning when no holding */}
          {side === "SELL" && !heldLoading && heldQty === 0 && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm">
              <p className="font-bold text-[var(--error-label)]">No position to sell</p>
              <p className="mt-0.5 text-xs text-[var(--red)]">
                You have 0 shares of {instrument.symbol}. Buy first, then sell to close your position.
              </p>
            </div>
          )}

          {/* SELL qty warning */}
          {side === "SELL" && heldQty > 0 && qty > heldQty && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-[var(--warn-label)]">
              ⚠️ You hold only {heldQty} shares. Reduce qty.
            </div>
          )}

          {/* Order type + Product type */}
          <div className="flex flex-wrap gap-2">
            {(["MARKET", "LIMIT", "SL"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setOrderType(t)}
                className={`h-8 rounded-xl px-3 text-xs font-bold ${orderType === t ? "bg-[var(--accent-dim)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                {t}
              </button>
            ))}
            <div className="ml-auto flex gap-1.5">
              {(["MIS", "CNC", "NRML"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setProductType(p)}
                  className={`h-8 rounded-xl px-2 text-xs font-bold ${productType === p ? "bg-indigo-500 text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Qty / Lots + Price */}
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl bg-[var(--background)]/80 p-3">
              <span className="text-xs text-[var(--text-muted)]">{meta.lotSize > 1 ? "Lots" : "Qty"}</span>
              <input
                type="number"
                min="1"
                max={side === "SELL" ? Math.max(1, Math.ceil(heldQty / meta.lotSize)) : undefined}
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-[var(--text-primary)] outline-none"
              />
              <p className="text-[10px] text-[var(--text-muted)]">
                = {qty} {meta.lotSize > 1 ? "shares" : "qty"}
                {side === "BUY" && ` · max ${maxBuyLots}`}
                {side === "SELL" && heldQty > 0 && ` · hold ${heldQty}`}
              </p>
            </label>
            {orderType !== "MARKET" ? (
              <label className="rounded-2xl bg-[var(--background)]/80 p-3">
                <span className="text-xs text-[var(--text-muted)]">Price</span>
                <input
                  type="number"
                  min="0"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={livePrice.toFixed(2)}
                  className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </label>
            ) : (
              <div className="rounded-2xl bg-[var(--background)]/80 p-3">
                <p className="text-xs text-[var(--text-muted)]">At Market</p>
                <p className="mt-1 text-lg font-bold text-[var(--accent-label)]">
                  ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-[var(--text-muted)]">Live price</p>
              </div>
            )}
          </div>

          {/* Target / SL */}
          <div className="grid grid-cols-2 gap-3">
            <label className="rounded-2xl bg-[var(--background)]/80 p-3">
              <span className="text-xs text-[var(--text-muted)]">Target (optional)</span>
              <input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)}
                placeholder="—" className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            </label>
            <label className="rounded-2xl bg-[var(--background)]/80 p-3">
              <span className="text-xs text-[var(--text-muted)]">Stop Loss (optional)</span>
              <input type="number" min="0" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                placeholder="—" className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" />
            </label>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[var(--background)]/80 p-3 text-xs">
            <div>
              <p className="text-[var(--text-muted)]">Qty</p>
              <p className="font-bold text-[var(--text-primary)]">{qty.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">{side === "BUY" ? "Buy Value" : "Sell Value"}</p>
              <p className="font-bold text-[var(--text-primary)]">₹{walletImpact.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Charges</p>
              <p className="font-bold text-[var(--text-primary)]">₹{charges.toLocaleString("en-IN")}</p>
            </div>
          </div>

          {/* Wallet row */}
          <div className="flex items-center justify-between rounded-xl bg-[var(--background)]/80 px-3 py-2 text-sm">
            <span className="text-[var(--text-secondary)]">Wallet</span>
            <span className="font-bold text-[var(--text-primary)]">₹{balance.toLocaleString("en-IN")}</span>
            {side === "BUY" && insufficientFunds && (
              <span className="text-xs font-bold text-[var(--red)]">Need ₹{(buyDebit - balance).toLocaleString("en-IN")} more</span>
            )}
          </div>

          {/* Message */}
          {message && (
            <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${message.startsWith("✅") ? "bg-emerald-400/10 text-[var(--accent-label)]" : "bg-red-400/10 text-[var(--error-label)]"}`}>
              {message}
            </p>
          )}

          {/* Execute button */}
          <button
            type="button"
            disabled={cannotExecute}
            onClick={executeTrade}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
              side === "BUY" ? "bg-emerald-400 text-slate-950" : "bg-red-400 text-white"
            }`}
          >
            {side === "BUY" ? <FiTrendingUp size={18} /> : <FiTrendingDown size={18} />}
            {getButtonLabel()}
          </button>
        </div>
      </div>
    </div>
  );
}
