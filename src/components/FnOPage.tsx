"use client";

import { useEffect, useState } from "react";
import { FiActivity, FiTarget } from "react-icons/fi";
import { fetchOptionChain, calculateGreeks } from "@/lib/api";
import type { OptionData } from "@/lib/api";

type FnOTab = "chain" | "futures" | "strategy" | "calculator";

const lotSizes: Record<string, number> = {
  NIFTY: 25, BANKNIFTY: 15, FINNIFTY: 25, MIDCPNIFTY: 50,
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, SBIN: 1500, INFY: 300,
};

const futuresData = [
  { symbol: "NIFTY", spot: 24850, current: 24920, next: 24980, far: 25050, lot: 25, expiry: "29-May-2025" },
  { symbol: "BANKNIFTY", spot: 53480, current: 53620, next: 53780, far: 53920, lot: 15, expiry: "29-May-2025" },
  { symbol: "FINNIFTY", spot: 23840, current: 23910, next: 23990, far: 24060, lot: 25, expiry: "27-May-2025" },
  { symbol: "RELIANCE", spot: 2942, current: 2958, next: 2974, far: 2992, lot: 250, expiry: "29-May-2025" },
  { symbol: "TCS", spot: 4020, current: 4038, next: 4056, far: 4078, lot: 150, expiry: "29-May-2025" },
  { symbol: "SBIN", spot: 868, current: 872, next: 876, far: 882, lot: 1500, expiry: "29-May-2025" },
];


const strategies = [
  { name: "Long Straddle", desc: "Buy ATM CE + Buy ATM PE", maxLoss: "Premium paid", maxProfit: "Unlimited", when: "High volatility expected" },
  { name: "Short Straddle", desc: "Sell ATM CE + Sell ATM PE", maxLoss: "Unlimited", maxProfit: "Premium received", when: "Low volatility expected" },
  { name: "Bull Call Spread", desc: "Buy lower CE + Sell higher CE", maxLoss: "Net premium", maxProfit: "Difference in strikes - premium", when: "Moderately bullish" },
  { name: "Bear Put Spread", desc: "Buy higher PE + Sell lower PE", maxLoss: "Net premium", maxProfit: "Difference in strikes - premium", when: "Moderately bearish" },
  { name: "Iron Condor", desc: "Sell OTM CE + Sell OTM PE + hedge both", maxLoss: "Width - premium", maxProfit: "Net premium", when: "Range-bound market" },
  { name: "Long Strangle", desc: "Buy OTM CE + Buy OTM PE", maxLoss: "Total premium", maxProfit: "Unlimited", when: "Big move expected" },
];

export function FnOPage() {
  const [activeTab, setActiveTab] = useState<FnOTab>("chain");
  const [chainSymbol, setChainSymbol] = useState("NIFTY");
  const [optionChain, setOptionChain] = useState<OptionData[]>([]);
  const [calcSpot, setCalcSpot] = useState("24850");
  const [calcStrike, setCalcStrike] = useState("24800");
  const [calcDays, setCalcDays] = useState("7");
  const [calcIV, setCalcIV] = useState("15");
  const [calcType, setCalcType] = useState<"CE" | "PE">("CE");

  useEffect(() => {
    fetchOptionChain(chainSymbol).then(setOptionChain);
  }, [chainSymbol]);

  const greeks = calculateGreeks(
    Number(calcSpot), Number(calcStrike), Number(calcDays), Number(calcIV), 0.065, calcType === "CE"
  );

  // PCR calculation
  const totalCEOI = optionChain.reduce((sum, o) => sum + (o.ce?.oi || 0), 0);
  const totalPEOI = optionChain.reduce((sum, o) => sum + (o.pe?.oi || 0), 0);
  const pcr = totalCEOI > 0 ? (totalPEOI / totalCEOI).toFixed(2) : "0";

  // Max Pain
  const maxPainStrike = optionChain.length > 0
    ? optionChain.reduce((max, o) => (o.ce?.oi || 0) + (o.pe?.oi || 0) > (max.ce?.oi || 0) + (max.pe?.oi || 0) ? o : max, optionChain[0]).strikePrice
    : 0;


  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {([["chain", "Option Chain"], ["futures", "Futures"], ["strategy", "Strategy Builder"], ["calculator", "Greeks Calc"]] as [FnOTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${activeTab === key ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Option Chain */}
      {activeTab === "chain" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <select value={chainSymbol} onChange={(e) => setChainSymbol(e.target.value)}
              className="h-10 rounded-xl bg-black/30 px-3 text-sm text-white border border-white/10">
              {Object.keys(lotSizes).map((s) => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>
            <div className="flex gap-4 text-xs">
              <span className="text-slate-400">PCR: <span className="font-bold text-white">{pcr}</span></span>
              <span className="text-slate-400">Max Pain: <span className="font-bold text-amber-300">{maxPainStrike}</span></span>
              <span className="text-slate-400">Lot: <span className="font-bold text-white">{lotSizes[chainSymbol] || 25}</span></span>
            </div>
          </div>

          {/* Chain Table */}
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/30">
                  <th colSpan={5} className="px-2 py-2 text-center text-emerald-300">CALLS (CE)</th>
                  <th className="px-2 py-2 text-center text-white border-x border-white/10">Strike</th>
                  <th colSpan={5} className="px-2 py-2 text-center text-red-300">PUTS (PE)</th>
                </tr>
                <tr className="border-b border-white/10 bg-black/20 text-slate-500">
                  <th className="px-2 py-1">OI</th><th className="px-2 py-1">Chg</th><th className="px-2 py-1">Vol</th><th className="px-2 py-1">IV</th><th className="px-2 py-1">LTP</th>
                  <th className="px-2 py-1 border-x border-white/10"></th>
                  <th className="px-2 py-1">LTP</th><th className="px-2 py-1">IV</th><th className="px-2 py-1">Vol</th><th className="px-2 py-1">Chg</th><th className="px-2 py-1">OI</th>
                </tr>
              </thead>
              <tbody>
                {optionChain.map((row) => {
                  const isATM = Math.abs(row.strikePrice - Number(calcSpot || 24850)) < 100;
                  return (
                    <tr key={row.strikePrice} className={`border-b border-white/5 ${isATM ? "bg-emerald-400/5" : ""}`}>
                      <td className="px-2 py-1.5 text-slate-300">{row.ce ? (row.ce.oi / 1000).toFixed(0) + "K" : "-"}</td>
                      <td className={`px-2 py-1.5 ${(row.ce?.oiChange || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{row.ce ? (row.ce.oiChange / 1000).toFixed(0) + "K" : "-"}</td>
                      <td className="px-2 py-1.5 text-slate-300">{row.ce ? (row.ce.volume / 1000).toFixed(0) + "K" : "-"}</td>
                      <td className="px-2 py-1.5 text-slate-400">{row.ce?.iv.toFixed(1) || "-"}</td>
                      <td className="px-2 py-1.5 font-bold text-emerald-300">{row.ce?.ltp.toFixed(1) || "-"}</td>
                      <td className="px-2 py-1.5 text-center font-bold text-white border-x border-white/10">{row.strikePrice}</td>
                      <td className="px-2 py-1.5 font-bold text-red-300">{row.pe?.ltp.toFixed(1) || "-"}</td>
                      <td className="px-2 py-1.5 text-slate-400">{row.pe?.iv.toFixed(1) || "-"}</td>
                      <td className="px-2 py-1.5 text-slate-300">{row.pe ? (row.pe.volume / 1000).toFixed(0) + "K" : "-"}</td>
                      <td className={`px-2 py-1.5 ${(row.pe?.oiChange || 0) >= 0 ? "text-emerald-300" : "text-red-300"}`}>{row.pe ? (row.pe.oiChange / 1000).toFixed(0) + "K" : "-"}</td>
                      <td className="px-2 py-1.5 text-slate-300">{row.pe ? (row.pe.oi / 1000).toFixed(0) + "K" : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Futures */}
      {activeTab === "futures" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Futures Contracts</h3>
          <div className="space-y-2">
            {futuresData.map((f) => (
              <div key={f.symbol} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-white">{f.symbol}</p>
                    <p className="text-xs text-slate-500">Lot Size: {f.lot} | Expiry: {f.expiry}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Spot</p>
                    <p className="font-bold text-white">Rs. {f.spot.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-black/30 p-2">
                    <p className="text-[10px] text-slate-500">Current Month</p>
                    <p className="text-sm font-bold text-white">{f.current}</p>
                    <p className="text-[10px] text-emerald-300">Basis: +{f.current - f.spot}</p>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2">
                    <p className="text-[10px] text-slate-500">Next Month</p>
                    <p className="text-sm font-bold text-white">{f.next}</p>
                    <p className="text-[10px] text-emerald-300">Basis: +{f.next - f.spot}</p>
                  </div>
                  <div className="rounded-lg bg-black/30 p-2">
                    <p className="text-[10px] text-slate-500">Far Month</p>
                    <p className="text-sm font-bold text-white">{f.far}</p>
                    <p className="text-[10px] text-emerald-300">Basis: +{f.far - f.spot}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Builder */}
      {activeTab === "strategy" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><FiTarget className="text-purple-300" /> Strategy Builder</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {strategies.map((s) => (
              <div key={s.name} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="font-bold text-white">{s.name}</p>
                <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-slate-500">Max Profit: <span className="text-emerald-300">{s.maxProfit}</span></p>
                  <p className="text-slate-500">Max Loss: <span className="text-red-300">{s.maxLoss}</span></p>
                  <p className="text-slate-500">When: <span className="text-blue-300">{s.when}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Greeks Calculator */}
      {activeTab === "calculator" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><FiActivity className="text-cyan-300" /> Option Premium & Greeks Calculator</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Spot Price</span>
              <input type="number" value={calcSpot} onChange={(e) => setCalcSpot(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Strike Price</span>
              <input type="number" value={calcStrike} onChange={(e) => setCalcStrike(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Days to Expiry</span>
              <input type="number" value={calcDays} onChange={(e) => setCalcDays(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <label className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">IV (%)</span>
              <input type="number" value={calcIV} onChange={(e) => setCalcIV(e.target.value)}
                className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none" />
            </label>
            <div className="rounded-xl bg-black/20 p-3">
              <span className="text-xs text-slate-500">Type</span>
              <div className="mt-1 flex gap-2">
                <button onClick={() => setCalcType("CE")} className={`rounded-lg px-3 py-1 text-xs font-bold ${calcType === "CE" ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>CE</button>
                <button onClick={() => setCalcType("PE")} className={`rounded-lg px-3 py-1 text-xs font-bold ${calcType === "PE" ? "bg-red-400 text-white" : "bg-black/30 text-slate-400"}`}>PE</button>
              </div>
            </div>
          </div>

          {/* Greeks Output */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-emerald-400/10 border border-emerald-400/20 p-4 text-center">
              <p className="text-xs text-slate-400">Delta</p>
              <p className="text-xl font-bold text-emerald-300">{greeks.delta}</p>
            </div>
            <div className="rounded-xl bg-blue-400/10 border border-blue-400/20 p-4 text-center">
              <p className="text-xs text-slate-400">Gamma</p>
              <p className="text-xl font-bold text-blue-300">{greeks.gamma}</p>
            </div>
            <div className="rounded-xl bg-red-400/10 border border-red-400/20 p-4 text-center">
              <p className="text-xs text-slate-400">Theta</p>
              <p className="text-xl font-bold text-red-300">{greeks.theta}</p>
            </div>
            <div className="rounded-xl bg-purple-400/10 border border-purple-400/20 p-4 text-center">
              <p className="text-xs text-slate-400">Vega</p>
              <p className="text-xl font-bold text-purple-300">{greeks.vega}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
