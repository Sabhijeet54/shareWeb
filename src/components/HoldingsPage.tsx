"use client";

import { useState } from "react";
import { FiPieChart, FiDollarSign } from "react-icons/fi";

type Holding = {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  cmp: number;
  investedValue: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
};

const mockHoldings: Holding[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", quantity: 25, avgPrice: 2680, cmp: 2942.80, investedValue: 67000, currentValue: 73570, pnl: 6570, pnlPercent: 9.81, dayChange: 965, dayChangePercent: 1.33 },
  { symbol: "HDFCBANK", name: "HDFC Bank", quantity: 40, avgPrice: 1480, cmp: 1642.30, investedValue: 59200, currentValue: 65692, pnl: 6492, pnlPercent: 10.97, dayChange: 756, dayChangePercent: 1.16 },
  { symbol: "TCS", name: "Tata Consultancy", quantity: 10, avgPrice: 3680, cmp: 4020.45, investedValue: 36800, currentValue: 40204.50, pnl: 3404.50, pnlPercent: 9.25, dayChange: -423, dayChangePercent: -1.04 },
  { symbol: "INFY", name: "Infosys", quantity: 30, avgPrice: 1520, cmp: 1862.50, investedValue: 45600, currentValue: 55875, pnl: 10275, pnlPercent: 22.53, dayChange: -444, dayChangePercent: -0.79 },
  { symbol: "ICICIBANK", name: "ICICI Bank", quantity: 50, avgPrice: 980, cmp: 1248.60, investedValue: 49000, currentValue: 62430, pnl: 13430, pnlPercent: 27.41, dayChange: 1120, dayChangePercent: 1.83 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", quantity: 20, avgPrice: 1420, cmp: 1720.40, investedValue: 28400, currentValue: 34408, pnl: 6008, pnlPercent: 21.15, dayChange: 576, dayChangePercent: 1.70 },
  { symbol: "ITC", name: "ITC Limited", quantity: 100, avgPrice: 388, cmp: 468.90, investedValue: 38800, currentValue: 46890, pnl: 8090, pnlPercent: 20.85, dayChange: -240, dayChangePercent: -0.51 },
  { symbol: "SBIN", name: "State Bank of India", quantity: 60, avgPrice: 720, cmp: 868.40, investedValue: 43200, currentValue: 52104, pnl: 8904, pnlPercent: 20.61, dayChange: 1734, dayChangePercent: 3.44 },
];

const dividendHistory = [
  { symbol: "RELIANCE", amount: 9, date: "2025-03-15", shares: 25 },
  { symbol: "TCS", amount: 75, date: "2025-02-10", shares: 10 },
  { symbol: "ITC", amount: 6.50, date: "2025-01-20", shares: 100 },
  { symbol: "HDFCBANK", amount: 19, date: "2024-12-05", shares: 40 },
  { symbol: "INFY", amount: 18, date: "2024-11-15", shares: 30 },
];

const corporateActions = [
  { symbol: "RELIANCE", action: "Bonus 1:1", date: "2024-10-28", status: "Completed" },
  { symbol: "TCS", action: "Buyback Rs. 4150", date: "2025-01-10", status: "Completed" },
  { symbol: "ITC", action: "Demerger - ITC Hotels", date: "2025-04-01", status: "Completed" },
];


export function HoldingsPage({ onNavigate }: { onNavigate?: (tab: string, symbol?: string) => void }) {
  const [tab, setTab] = useState<"holdings" | "dividends" | "corporate">("holdings");

  const totalInvested = mockHoldings.reduce((s, h) => s + h.investedValue, 0);
  const totalCurrent = mockHoldings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnl = totalCurrent - totalInvested;
  const totalPnlPercent = (totalPnl / totalInvested) * 100;
  const dayPnl = mockHoldings.reduce((s, h) => s + h.dayChange, 0);

  // XIRR approximation (simplified)
  const holdingYears = 1.5; // average holding period
  const xirr = Math.pow(totalCurrent / totalInvested, 1 / holdingYears) - 1;

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <div className="rounded-[1.5rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Invested</p>
            <p className="text-lg font-bold text-white">Rs. {totalInvested.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Value</p>
            <p className="text-lg font-bold text-white">Rs. {Math.round(totalCurrent).toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total P&L</p>
            <p className={`text-lg font-bold ${totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              +Rs. {Math.round(totalPnl).toLocaleString("en-IN")} ({totalPnlPercent.toFixed(2)}%)
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Day P&L</p>
            <p className={`text-lg font-bold ${dayPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {dayPnl >= 0 ? "+" : ""}Rs. {dayPnl.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-slate-400">
          <span>XIRR: <span className="font-bold text-emerald-300">{(xirr * 100).toFixed(1)}%</span></span>
          <span>Stocks: <span className="font-bold text-white">{mockHoldings.length}</span></span>
        </div>
      </div>


      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("holdings")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === "holdings" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          Holdings ({mockHoldings.length})
        </button>
        <button onClick={() => setTab("dividends")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === "dividends" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          <FiDollarSign className="inline" size={12} /> Dividends
        </button>
        <button onClick={() => setTab("corporate")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === "corporate" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          Corporate Actions
        </button>
      </div>

      {/* Holdings List */}
      {tab === "holdings" && (
        <div className="space-y-2">
          {mockHoldings.map((h) => (
            <button key={h.symbol} onClick={() => onNavigate?.("chart", h.symbol)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-black/30 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{h.symbol}</p>
                  <p className="text-xs text-slate-500">{h.name}</p>
                  <p className="mt-1 text-xs text-slate-400">Qty: {h.quantity} | Avg: Rs. {h.avgPrice}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">Rs. {h.cmp.toLocaleString("en-IN")}</p>
                  <p className={`text-sm font-bold ${h.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {h.pnl >= 0 ? "+" : ""}Rs. {h.pnl.toLocaleString("en-IN")}
                  </p>
                  <p className={`text-xs ${h.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ({h.pnlPercent >= 0 ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                <span>Invested: Rs. {h.investedValue.toLocaleString("en-IN")}</span>
                <span>Current: Rs. {Math.round(h.currentValue).toLocaleString("en-IN")}</span>
                <span className={h.dayChange >= 0 ? "text-emerald-400" : "text-red-400"}>
                  Today: {h.dayChange >= 0 ? "+" : ""}{h.dayChangePercent.toFixed(2)}%
                </span>
              </div>
            </button>
          ))}
        </div>
      )}


      {/* Dividends */}
      {tab === "dividends" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Total Dividend Received: <span className="font-bold text-emerald-300">Rs. {dividendHistory.reduce((s, d) => s + d.amount * d.shares, 0).toLocaleString("en-IN")}</span></p>
          {dividendHistory.map((d, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
              <div>
                <p className="text-sm font-bold text-white">{d.symbol}</p>
                <p className="text-xs text-slate-500">{d.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-300">Rs. {(d.amount * d.shares).toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-500">Rs. {d.amount}/share x {d.shares}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Corporate Actions */}
      {tab === "corporate" && (
        <div className="space-y-2">
          {corporateActions.map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-black/20 p-3">
              <div>
                <p className="text-sm font-bold text-white">{a.symbol}</p>
                <p className="text-xs text-slate-400">{a.action}</p>
                <p className="text-xs text-slate-500">{a.date}</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
