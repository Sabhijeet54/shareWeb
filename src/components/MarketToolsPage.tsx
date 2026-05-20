"use client";

import { useState } from "react";
import { FiActivity, FiGrid } from "react-icons/fi";

type ToolTab = "heatmap" | "depth" | "circuit" | "bulk" | "fii" | "vix";

const heatMapData = [
  { symbol: "RELIANCE", sector: "Energy", change: 1.33, mcap: 1992 },
  { symbol: "TCS", sector: "IT", change: -1.04, mcap: 1455 },
  { symbol: "HDFCBANK", sector: "Banking", change: 1.16, mcap: 1248 },
  { symbol: "INFY", sector: "IT", change: -0.79, mcap: 772 },
  { symbol: "ICICIBANK", sector: "Banking", change: 1.83, mcap: 876 },
  { symbol: "BHARTIARTL", sector: "Telecom", change: 1.70, mcap: 1028 },
  { symbol: "SBIN", sector: "Banking", change: 3.44, mcap: 775 },
  { symbol: "LT", sector: "Infra", change: -0.66, mcap: 506 },
  { symbol: "TATAMOTORS", sector: "Auto", change: 4.36, mcap: 378 },
  { symbol: "ITC", sector: "FMCG", change: -0.51, mcap: 585 },
  { symbol: "ADANIENT", sector: "Infra", change: 3.95, mcap: 374 },
  { symbol: "WIPRO", sector: "IT", change: -3.83, mcap: 241 },
  { symbol: "M&M", sector: "Auto", change: 2.46, mcap: 352 },
  { symbol: "SUNPHARMA", sector: "Pharma", change: -2.09, mcap: 438 },
  { symbol: "COALINDIA", sector: "Metal", change: 3.0, mcap: 301 },
  { symbol: "NTPC", sector: "Energy", change: 1.42, mcap: 348 },
  { symbol: "TECHM", sector: "IT", change: -3.22, mcap: 154 },
  { symbol: "BAJFINANCE", sector: "Finance", change: 1.82, mcap: 445 },
];

const marketDepthData = {
  symbol: "RELIANCE",
  bids: [
    { price: 2941.50, qty: 1240, orders: 8 },
    { price: 2941.00, qty: 2860, orders: 14 },
    { price: 2940.50, qty: 4120, orders: 22 },
    { price: 2940.00, qty: 6840, orders: 35 },
    { price: 2939.50, qty: 3420, orders: 18 },
  ],
  asks: [
    { price: 2942.00, qty: 980, orders: 6 },
    { price: 2942.50, qty: 2140, orders: 11 },
    { price: 2943.00, qty: 3680, orders: 19 },
    { price: 2943.50, qty: 5240, orders: 28 },
    { price: 2944.00, qty: 2890, orders: 15 },
  ],
};


const circuitStocks = [
  { symbol: "YESBANK", type: "Upper", limit: "20%", price: 24.80, change: 20.0 },
  { symbol: "SUZLON", type: "Upper", limit: "5%", price: 58.40, change: 5.0 },
  { symbol: "IRFC", type: "Upper", limit: "5%", price: 182.60, change: 4.98 },
  { symbol: "PCJEWELLER", type: "Lower", limit: "5%", price: 92.40, change: -5.0 },
  { symbol: "RPOWER", type: "Lower", limit: "5%", price: 32.80, change: -4.98 },
];

const bulkDeals = [
  { date: "2025-05-20", symbol: "TATAMOTORS", client: "Goldman Sachs", type: "BUY", qty: "42,00,000", price: 1018 },
  { date: "2025-05-20", symbol: "ADANIENT", client: "Morgan Stanley", type: "BUY", qty: "18,50,000", price: 3240 },
  { date: "2025-05-19", symbol: "SBIN", client: "JP Morgan", type: "BUY", qty: "1,20,00,000", price: 852 },
  { date: "2025-05-19", symbol: "WIPRO", client: "Citadel", type: "SELL", qty: "28,00,000", price: 468 },
];

const fiiDiiData = [
  { date: "2025-05-20", fiiBuy: 14280, fiiSell: 10840, fiiNet: 3440, diiBuy: 9820, diiSell: 11240, diiNet: -1420 },
  { date: "2025-05-19", fiiBuy: 12640, fiiSell: 8920, fiiNet: 3720, diiBuy: 8480, diiSell: 9680, diiNet: -1200 },
  { date: "2025-05-18", fiiBuy: 11200, fiiSell: 13480, fiiNet: -2280, diiBuy: 12140, diiSell: 9860, diiNet: 2280 },
  { date: "2025-05-17", fiiBuy: 15840, fiiSell: 11420, fiiNet: 4420, diiBuy: 7640, diiSell: 10280, diiNet: -2640 },
  { date: "2025-05-16", fiiBuy: 9480, fiiSell: 12840, fiiNet: -3360, diiBuy: 14200, diiSell: 10480, diiNet: 3720 },
];

export function MarketToolsPage() {
  const [tab, setTab] = useState<ToolTab>("heatmap");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {([["heatmap", "Heat Map"], ["depth", "Market Depth"], ["circuit", "Circuit"], ["bulk", "Bulk Deals"], ["fii", "FII/DII"], ["vix", "India VIX"]] as [ToolTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${tab === key ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Heat Map */}
      {tab === "heatmap" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><FiGrid className="text-blue-300" /> Sector Heat Map</h3>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
            {heatMapData.map((s) => {
              const intensity = Math.min(1, Math.abs(s.change) / 5);
              const bg = s.change >= 0
                ? `rgba(52,211,153,${0.1 + intensity * 0.4})`
                : `rgba(248,113,113,${0.1 + intensity * 0.4})`;
              return (
                <div key={s.symbol} className="rounded-lg p-2 text-center border border-white/5" style={{ background: bg }}>
                  <p className="text-[10px] font-bold text-white truncate">{s.symbol}</p>
                  <p className={`text-xs font-bold ${s.change >= 0 ? "text-emerald-200" : "text-red-200"}`}>
                    {s.change >= 0 ? "+" : ""}{s.change.toFixed(1)}%
                  </p>
                  <p className="text-[9px] text-slate-400">{s.sector}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Market Depth */}
      {tab === "depth" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Market Depth - {marketDepthData.symbol} (Level 2)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-300 mb-2 text-center">BID (Buyers)</p>
              {marketDepthData.bids.map((bid, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-emerald-400/10 px-3 py-1.5 mb-1 text-xs">
                  <span className="text-white">{bid.orders} orders</span>
                  <span className="text-white">{bid.qty.toLocaleString()}</span>
                  <span className="font-bold text-emerald-300">{bid.price}</span>
                </div>
              ))}
              <div className="mt-2 text-center text-xs text-slate-400">
                Total Bid: {marketDepthData.bids.reduce((s, b) => s + b.qty, 0).toLocaleString()}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-red-300 mb-2 text-center">ASK (Sellers)</p>
              {marketDepthData.asks.map((ask, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-red-400/10 px-3 py-1.5 mb-1 text-xs">
                  <span className="font-bold text-red-300">{ask.price}</span>
                  <span className="text-white">{ask.qty.toLocaleString()}</span>
                  <span className="text-white">{ask.orders} orders</span>
                </div>
              ))}
              <div className="mt-2 text-center text-xs text-slate-400">
                Total Ask: {marketDepthData.asks.reduce((s, a) => s + a.qty, 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Circuit Filter */}
      {tab === "circuit" && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">Circuit Filter Stocks</h3>
          {circuitStocks.map((s, i) => (
            <div key={i} className={`flex items-center justify-between rounded-xl p-3 ${s.type === "Upper" ? "bg-emerald-400/10 border border-emerald-400/20" : "bg-red-400/10 border border-red-400/20"}`}>
              <div>
                <p className="text-sm font-bold text-white">{s.symbol}</p>
                <p className="text-xs text-slate-500">Limit: {s.limit}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Rs. {s.price}</p>
                <p className={`text-xs font-bold ${s.type === "Upper" ? "text-emerald-300" : "text-red-300"}`}>
                  {s.type} Circuit ({s.change >= 0 ? "+" : ""}{s.change}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
