"use client";

import { useEffect, useState } from "react";
import { FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

type Position = {
  id: string;
  symbol: string;
  title: string;
  side: "BUY" | "SELL";
  quantity: number;
  avgPrice: number;
  cmp: number;
  pnl: number;
  pnlPercent: number;
  productType: string;
  status: "open" | "closed";
};

const mockPositions: Position[] = [
  { id: "1", symbol: "RELIANCE", title: "Reliance Industries", side: "BUY", quantity: 10, avgPrice: 2910, cmp: 2942.80, pnl: 328, pnlPercent: 1.13, productType: "MIS", status: "open" },
  { id: "2", symbol: "BANKNIFTY FUT", title: "Bank Nifty Futures", side: "SELL", quantity: 15, avgPrice: 53620, cmp: 53480, pnl: 2100, pnlPercent: 0.26, productType: "NRML", status: "open" },
  { id: "3", symbol: "NIFTY 24800 CE", title: "Nifty Call Option", side: "BUY", quantity: 50, avgPrice: 180, cmp: 212, pnl: 1600, pnlPercent: 17.78, productType: "MIS", status: "open" },
  { id: "4", symbol: "SBIN", title: "State Bank of India", side: "BUY", quantity: 100, avgPrice: 842, cmp: 868.40, pnl: 2640, pnlPercent: 3.14, productType: "MIS", status: "open" },
  { id: "5", symbol: "TCS", title: "Tata Consultancy", side: "SELL", quantity: 5, avgPrice: 4060, cmp: 4020.45, pnl: 197.75, pnlPercent: 0.97, productType: "MIS", status: "open" },
];

const closedPositions: Position[] = [
  { id: "6", symbol: "HDFCBANK", title: "HDFC Bank", side: "BUY", quantity: 20, avgPrice: 1618, cmp: 1642, pnl: 480, pnlPercent: 1.48, productType: "MIS", status: "closed" },
  { id: "7", symbol: "INFY", title: "Infosys", side: "SELL", quantity: 15, avgPrice: 1878, cmp: 1862.50, pnl: 232.5, pnlPercent: 0.83, productType: "MIS", status: "closed" },
];


export function PositionsPage() {
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [closed, setClosed] = useState<Position[]>(closedPositions);
  const [squareOffId, setSquareOffId] = useState<string | null>(null);

  // Auto square off timer (3:15 PM IST alert)
  const [autoSquareOffAlert, setAutoSquareOffAlert] = useState(false);
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const minutes = ist.getHours() * 60 + ist.getMinutes();
      if (minutes >= 915 && minutes <= 930) setAutoSquareOffAlert(true);
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const totalInvested = positions.reduce((sum, p) => sum + p.avgPrice * p.quantity, 0);

  function squareOff(id: string) {
    const pos = positions.find((p) => p.id === id);
    if (!pos) return;
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setClosed((prev) => [{ ...pos, status: "closed" }, ...prev]);
    setSquareOffId(null);
  }

  function convertToDelivery(id: string) {
    setPositions((prev) =>
      prev.map((p) => p.id === id ? { ...p, productType: "CNC" } : p)
    );
  }


  return (
    <div className="space-y-4">
      {/* Auto Square Off Alert */}
      {autoSquareOffAlert && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-400/10 border border-amber-400/20 p-3 text-sm">
          <FiAlertTriangle className="text-amber-300 shrink-0" />
          <p className="text-amber-200">Auto square-off at 3:15 PM for MIS positions. Convert to delivery if you want to hold.</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-black/20 p-3 text-center">
          <p className="text-xs text-slate-500">Open Positions</p>
          <p className="text-lg font-bold text-white">{positions.length}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-3 text-center">
          <p className="text-xs text-slate-500">Total Invested</p>
          <p className="text-lg font-bold text-white">Rs. {totalInvested.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-black/20 p-3 text-center">
          <p className="text-xs text-slate-500">Day P&L</p>
          <p className={`text-lg font-bold ${totalPnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {totalPnl >= 0 ? "+" : ""}Rs. {totalPnl.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab("open")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === "open" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
          Open ({positions.length})
        </button>
        <button onClick={() => setTab("closed")} className={`rounded-xl px-4 py-2 text-xs font-bold ${tab === "closed" ? "bg-slate-600 text-white" : "bg-black/30 text-slate-400"}`}>
          Closed ({closed.length})
        </button>
      </div>

      {/* Position Cards */}
      <div className="space-y-2">
        {(tab === "open" ? positions : closed).map((pos) => (
          <div key={pos.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${pos.side === "BUY" ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300"}`}>
                    {pos.side}
                  </span>
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-400/20 text-blue-300">{pos.productType}</span>
                </div>
                <p className="mt-1 font-bold text-white">{pos.symbol}</p>
                <p className="text-xs text-slate-500">{pos.title}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${pos.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {pos.pnl >= 0 ? "+" : ""}Rs. {pos.pnl.toLocaleString("en-IN")}
                </p>
                <p className={`text-xs ${pos.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ({pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent.toFixed(2)}%)
                </p>
              </div>
            </div>


            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-slate-500">Qty</p>
                <p className="font-bold text-white">{pos.quantity}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-slate-500">Avg Price</p>
                <p className="font-bold text-white">Rs. {pos.avgPrice.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2">
                <p className="text-slate-500">CMP</p>
                <p className="font-bold text-white">Rs. {pos.cmp.toLocaleString("en-IN")}</p>
              </div>
            </div>

            {/* Actions for open positions */}
            {tab === "open" && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => squareOff(pos.id)}
                  className="flex items-center gap-1 rounded-lg bg-red-400/20 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-400/30">
                  Square Off
                </button>
                {pos.productType === "MIS" && (
                  <button onClick={() => convertToDelivery(pos.id)}
                    className="flex items-center gap-1 rounded-lg bg-blue-400/20 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-400/30">
                    <FiRefreshCw size={12} /> Convert to CNC
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {(tab === "open" ? positions : closed).length === 0 && (
          <p className="rounded-2xl bg-black/20 p-6 text-center text-sm text-slate-500">No {tab} positions</p>
        )}
      </div>
    </div>
  );
}
