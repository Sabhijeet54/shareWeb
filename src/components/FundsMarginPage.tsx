"use client";

import { useState } from "react";
import { FiDollarSign, FiCalculator, FiFileText } from "react-icons/fi";

type LedgerEntry = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

const ledgerData: LedgerEntry[] = [
  { date: "2025-05-20", description: "BUY RELIANCE x10", debit: 29428, credit: 0, balance: 218572 },
  { date: "2025-05-20", description: "SELL TCS x5 (Intraday)", debit: 0, credit: 20102, balance: 248000 },
  { date: "2025-05-19", description: "Fund Added (UPI)", debit: 0, credit: 50000, balance: 227898 },
  { date: "2025-05-18", description: "BUY NIFTY 24800 CE x50", debit: 9000, credit: 0, balance: 177898 },
  { date: "2025-05-17", description: "SELL NIFTY 24800 CE x50", debit: 0, credit: 10600, balance: 186898 },
  { date: "2025-05-15", description: "BUY SBIN x100", debit: 84200, credit: 0, balance: 176298 },
  { date: "2025-05-14", description: "Fund Added (Bank Transfer)", debit: 0, credit: 100000, balance: 260498 },
];


export function FundsMarginPage({ balance }: { balance: number }) {
  const [tab, setTab] = useState<"overview" | "calculator" | "ledger">("overview");
  const [calcSymbol, setCalcSymbol] = useState("NIFTY");
  const [calcLots, setCalcLots] = useState("1");
  const [calcProduct, setCalcProduct] = useState<"MIS" | "NRML">("MIS");

  const usedMargin = 85400;
  const collateral = 42000;
  const spanMargin = 48200;
  const exposureMargin = 22400;
  const availableMargin = balance - usedMargin + collateral;

  // Margin calculator
  const marginRates: Record<string, { lot: number; span: number; exposure: number }> = {
    NIFTY: { lot: 25, span: 95000, exposure: 28000 },
    BANKNIFTY: { lot: 15, span: 142000, exposure: 42000 },
    FINNIFTY: { lot: 25, span: 78000, exposure: 22000 },
    RELIANCE: { lot: 250, span: 135000, exposure: 38000 },
    SBIN: { lot: 1500, span: 188000, exposure: 52000 },
    TCS: { lot: 150, span: 112000, exposure: 32000 },
  };

  const calcData = marginRates[calcSymbol] || marginRates.NIFTY;
  const lots = Math.max(1, Number(calcLots) || 1);
  const misMultiplier = calcProduct === "MIS" ? 0.4 : 1;
  const requiredSpan = calcData.span * lots * misMultiplier;
  const requiredExposure = calcData.exposure * lots * misMultiplier;
  const totalRequired = requiredSpan + requiredExposure;
  const canTradeLots = Math.floor(availableMargin / (calcData.span + calcData.exposure));

  return (
    <div className="space-y-4">
      {/* Balance Overview */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Available Cash</p>
            <p className="text-2xl font-bold text-white">Rs. {balance.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Used Margin</p>
            <p className="text-lg font-bold text-amber-300">Rs. {usedMargin.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Available Margin</p>
            <p className="text-lg font-bold text-emerald-300">Rs. {availableMargin.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("overview")} className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold ${tab === "overview" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          <FiDollarSign size={12} /> Overview
        </button>
        <button onClick={() => setTab("calculator")} className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold ${tab === "calculator" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          <FiCalculator size={12} /> Calculator
        </button>
        <button onClick={() => setTab("ledger")} className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold ${tab === "ledger" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          <FiFileText size={12} /> Ledger
        </button>
      </div>


      {tab === "overview" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-slate-500">SPAN Margin</p>
              <p className="text-lg font-bold text-white">Rs. {spanMargin.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-slate-500">Exposure Margin</p>
              <p className="text-lg font-bold text-white">Rs. {exposureMargin.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-slate-500">Collateral (Pledged)</p>
              <p className="text-lg font-bold text-blue-300">Rs. {collateral.toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-black/20 p-4">
              <p className="text-xs text-slate-500">Margin Utilization</p>
              <p className="text-lg font-bold text-white">{((usedMargin / balance) * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Margin Bar */}
          <div className="rounded-xl bg-black/20 p-4">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>Used: Rs. {usedMargin.toLocaleString("en-IN")}</span>
              <span>Total: Rs. {balance.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-amber-400" style={{ width: `${Math.min(100, (usedMargin / balance) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {tab === "calculator" && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="text-sm font-bold text-white">Margin Calculator</h3>
          <div className="grid grid-cols-3 gap-3">
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Symbol</span>
              <select value={calcSymbol} onChange={(e) => setCalcSymbol(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none">
                {Object.keys(marginRates).map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
            </label>
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Lots</span>
              <input type="number" min="1" value={calcLots} onChange={(e) => setCalcLots(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Product</span>
              <div className="mt-1 flex gap-1">
                <button onClick={() => setCalcProduct("MIS")} className={`rounded px-2 py-1 text-xs font-bold ${calcProduct === "MIS" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>MIS</button>
                <button onClick={() => setCalcProduct("NRML")} className={`rounded px-2 py-1 text-xs font-bold ${calcProduct === "NRML" ? "bg-blue-400 text-white" : "bg-black/30 text-slate-400"}`}>NRML</button>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-black/30 p-3 text-center">
              <p className="text-xs text-slate-500">SPAN</p>
              <p className="text-sm font-bold text-white">Rs. {Math.round(requiredSpan).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-black/30 p-3 text-center">
              <p className="text-xs text-slate-500">Exposure</p>
              <p className="text-sm font-bold text-white">Rs. {Math.round(requiredExposure).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-emerald-400/10 p-3 text-center border border-emerald-400/20">
              <p className="text-xs text-slate-400">Total Required</p>
              <p className="text-sm font-bold text-emerald-300">Rs. {Math.round(totalRequired).toLocaleString("en-IN")}</p>
            </div>
            <div className="rounded-xl bg-blue-400/10 p-3 text-center border border-blue-400/20">
              <p className="text-xs text-slate-400">Max Lots Possible</p>
              <p className="text-sm font-bold text-blue-300">{canTradeLots}</p>
            </div>
          </div>
        </div>
      )}


      {tab === "ledger" && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">Fund Ledger</h3>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-slate-500">
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-right">Debit</th>
                  <th className="px-3 py-2 text-right">Credit</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData.map((entry, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="px-3 py-2 text-slate-400">{entry.date}</td>
                    <td className="px-3 py-2 text-white">{entry.description}</td>
                    <td className="px-3 py-2 text-right text-red-300">{entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString("en-IN")}` : "-"}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">{entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString("en-IN")}` : "-"}</td>
                    <td className="px-3 py-2 text-right font-bold text-white">Rs. {entry.balance.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
