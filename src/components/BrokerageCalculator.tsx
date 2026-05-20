"use client";

import { useMemo, useState } from "react";

type Segment = "equity_intraday" | "equity_delivery" | "equity_futures" | "equity_options" | "currency" | "commodity";

const SEGMENT_LABELS: Record<Segment, string> = {
  equity_intraday: "Equity Intraday",
  equity_delivery: "Equity Delivery",
  equity_futures: "Equity Futures",
  equity_options: "Equity Options",
  currency: "Currency F&O",
  commodity: "Commodity",
};

// Zerodha/discount broker rates
const RATES: Record<Segment, {
  brokerage: (turnover: number, premium?: number, qty?: number) => number;
  stt_buy: number; stt_sell: number;
  txn: number; sebi: number; stamp_buy: number;
  gst: number; dp?: number;
}> = {
  equity_intraday: {
    brokerage: (t) => Math.min(20, t * 0.0003),
    stt_buy: 0, stt_sell: 0.00025, txn: 0.0000345, sebi: 0.000001, stamp_buy: 0.00003, gst: 0.18,
  },
  equity_delivery: {
    brokerage: () => 0, // free delivery
    stt_buy: 0.001, stt_sell: 0.001, txn: 0.0000345, sebi: 0.000001, stamp_buy: 0.00015, gst: 0.18, dp: 13.5,
  },
  equity_futures: {
    brokerage: (t) => Math.min(20, t * 0.0003),
    stt_buy: 0, stt_sell: 0.0001, txn: 0.000002, sebi: 0.000001, stamp_buy: 0.00002, gst: 0.18,
  },
  equity_options: {
    brokerage: (_t, premium, qty) => Math.min(20, (premium ?? 0) * (qty ?? 0) * 0.0003),
    stt_buy: 0, stt_sell: 0.0005, txn: 0.00053, sebi: 0.000001, stamp_buy: 0.00003, gst: 0.18,
  },
  currency: {
    brokerage: (t) => Math.min(20, t * 0.0003),
    stt_buy: 0, stt_sell: 0, txn: 0.00000035, sebi: 0.000001, stamp_buy: 0.00001, gst: 0.18,
  },
  commodity: {
    brokerage: (t) => Math.min(20, t * 0.0003),
    stt_buy: 0, stt_sell: 0, txn: 0.0000021, sebi: 0.000001, stamp_buy: 0.00002, gst: 0.18,
  },
};

export function BrokerageCalculator() {
  const [segment, setSegment] = useState<Segment>("equity_intraday");
  const [buyPrice, setBuyPrice] = useState("500");
  const [sellPrice, setSellPrice] = useState("510");
  const [qty, setQty] = useState("100");
  const [premium, setPremium] = useState("150");

  const isOptions = segment === "equity_options";

  const result = useMemo(() => {
    const bp = Number(buyPrice) || 0;
    const sp = Number(sellPrice) || 0;
    const q = Number(qty) || 0;
    const prem = Number(premium) || 0;

    const buyTurnover = isOptions ? prem * q : bp * q;
    const sellTurnover = isOptions ? prem * q : sp * q;
    const totalTurnover = buyTurnover + sellTurnover;

    const r = RATES[segment];
    const brokerage = isOptions
      ? r.brokerage(totalTurnover, prem, q) * 2 // buy + sell
      : r.brokerage(buyTurnover) + r.brokerage(sellTurnover);

    const stt = buyTurnover * r.stt_buy + sellTurnover * r.stt_sell;
    const txnCharge = totalTurnover * r.txn;
    const sebi = totalTurnover * r.sebi;
    const stamp = buyTurnover * r.stamp_buy;
    const dp = r.dp ?? 0;
    const gstBase = brokerage + txnCharge + sebi;
    const gst = gstBase * r.gst;
    const total = brokerage + stt + txnCharge + sebi + stamp + dp + gst;

    const grossPnl = isOptions ? 0 : (sp - bp) * q;
    const netPnl = grossPnl - total;
    const breakeven = bp + total / q;

    return { brokerage, stt, txnCharge, sebi, stamp, dp, gst, total, grossPnl, netPnl, breakeven };
  }, [segment, buyPrice, sellPrice, qty, premium, isOptions]);

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-300">Brokerage Calculator</p>

        {/* Segment */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(SEGMENT_LABELS) as Segment[]).map((s) => (
            <button key={s} type="button" onClick={() => setSegment(s)}
              className={`h-8 rounded-xl px-3 text-xs font-bold ${segment === s ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
              {SEGMENT_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {isOptions ? (
            <label className="rounded-xl bg-black/25 p-3 col-span-2">
              <span className="text-xs text-slate-500">Option Premium (₹)</span>
              <input type="number" value={premium} onChange={(e) => setPremium(e.target.value)}
                className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
            </label>
          ) : (
            <>
              <label className="rounded-xl bg-black/25 p-3">
                <span className="text-xs text-slate-500">Buy Price (₹)</span>
                <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)}
                  className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
              </label>
              <label className="rounded-xl bg-black/25 p-3">
                <span className="text-xs text-slate-500">Sell Price (₹)</span>
                <input type="number" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)}
                  className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
              </label>
            </>
          )}
          <label className="rounded-xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Quantity</span>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
              className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
          </label>
        </div>

        {/* Breakdown */}
        <div className="space-y-2 rounded-2xl border border-white/10 p-4">
          {[
            { label: "Brokerage", value: result.brokerage },
            { label: "STT / CTT", value: result.stt },
            { label: "Transaction Charges", value: result.txnCharge },
            { label: "SEBI Charges", value: result.sebi },
            { label: "Stamp Duty", value: result.stamp },
            ...(result.dp > 0 ? [{ label: "DP Charges (sell)", value: result.dp }] : []),
            { label: "GST (18%)", value: result.gst },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className="text-white">₹{value.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold">
            <span className="text-white">Total Charges</span>
            <span className="text-red-300">₹{result.total.toFixed(2)}</span>
          </div>
        </div>

        {/* P&L */}
        {!isOptions && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-black/25 p-3 text-center">
              <p className="text-xs text-slate-500">Gross P&L</p>
              <p className={`font-bold ${result.grossPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {result.grossPnl >= 0 ? "+" : ""}₹{result.grossPnl.toFixed(2)}
              </p>
            </div>
            <div className={`rounded-xl p-3 text-center ${result.netPnl >= 0 ? "bg-emerald-400/10" : "bg-red-400/10"}`}>
              <p className="text-xs text-slate-500">Net P&L</p>
              <p className={`font-bold ${result.netPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {result.netPnl >= 0 ? "+" : ""}₹{result.netPnl.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 p-3 text-center">
              <p className="text-xs text-slate-500">Breakeven</p>
              <p className="font-bold text-amber-300">₹{result.breakeven.toFixed(2)}</p>
            </div>
          </div>
        )}
        <p className="mt-3 text-[10px] text-slate-600">* Based on Zerodha rates. Actual charges may vary by broker.</p>
      </div>
    </div>
  );
}
