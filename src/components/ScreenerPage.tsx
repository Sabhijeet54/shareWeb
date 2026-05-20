"use client";

import { useMemo, useState } from "react";
import { FiFilter, FiSave, FiSearch } from "react-icons/fi";
import { getStaticStockList } from "@/lib/api";

type ScreenFilter = {
  pe: [number, number];
  marketCap: [number, number];
  changePercent: [number, number];
  price: [number, number];
};

const preBuiltScreens = [
  { name: "Momentum Stocks", desc: "Stocks up > 3% today", filter: { changePercent: [3, 100] } },
  { name: "Undervalued", desc: "PE < 15 & Market Cap > 500 Cr", filter: { pe: [0, 15], marketCap: [500, 999999] } },
  { name: "High Volume", desc: "Volume > 10L shares", filter: {} },
  { name: "52W High Breakout", desc: "Near 52 week high (within 5%)", filter: {} },
  { name: "Large Cap Value", desc: "Market Cap > 50000 Cr, PE < 25", filter: { pe: [0, 25], marketCap: [50000, 999999] } },
  { name: "High Dividend", desc: "Dividend yield > 3%", filter: {} },
];

const allStocks = [
  ...getStaticStockList(),
  { symbol: "WIPRO", name: "Wipro", price: 462.30, change: -18.40, changePercent: -3.83, high: 484, low: 458, open: 480, prevClose: 480.70, volume: 14200000, marketCap: 241000, pe: 22.8, eps: 20.3, week52High: 542, week52Low: 380, avgVolume: 11000000, dayRange: "458-484", yearRange: "380-542" },
  { symbol: "COALINDIA", name: "Coal India", price: 488.75, change: 14.20, changePercent: 3.0, high: 492, low: 472, open: 476, prevClose: 474.55, volume: 12500000, marketCap: 301000, pe: 8.8, eps: 55.5, week52High: 528, week52Low: 388, avgVolume: 10000000, dayRange: "472-492", yearRange: "388-528" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 3280.15, change: 124.60, changePercent: 3.95, high: 3310, low: 3148, open: 3160, prevClose: 3155.55, volume: 8400000, marketCap: 374000, pe: 72.4, eps: 45.3, week52High: 3480, week52Low: 2142, avgVolume: 6500000, dayRange: "3148-3310", yearRange: "2142-3480" },
  { symbol: "M&M", name: "Mahindra & Mahindra", price: 2840, change: 68.20, changePercent: 2.46, high: 2860, low: 2768, open: 2780, prevClose: 2771.80, volume: 5800000, marketCap: 352000, pe: 32.4, eps: 87.7, week52High: 2960, week52Low: 1820, avgVolume: 4800000, dayRange: "2768-2860", yearRange: "1820-2960" },
];


export function ScreenerPage({ onNavigate }: { onNavigate?: (tab: string, symbol?: string) => void }) {
  const [peRange, setPeRange] = useState<[number, number]>([0, 100]);
  const [mcapRange, setMcapRange] = useState<[number, number]>([0, 2000000]);
  const [changeRange, setChangeRange] = useState<[number, number]>([-10, 10]);
  const [showFilters, setShowFilters] = useState(false);
  const [sector, setSector] = useState("all");
  const [savedScreens, setSavedScreens] = useState<string[]>([]);
  const [screenName, setScreenName] = useState("");

  const filtered = useMemo(() => {
    return allStocks.filter((s) => {
      if (s.pe < peRange[0] || s.pe > peRange[1]) return false;
      if (s.marketCap < mcapRange[0] || s.marketCap > mcapRange[1]) return false;
      if (s.changePercent < changeRange[0] || s.changePercent > changeRange[1]) return false;
      return true;
    });
  }, [peRange, mcapRange, changeRange]);

  function applyPrebuilt(screen: typeof preBuiltScreens[0]) {
    const f = screen.filter as Partial<ScreenFilter>;
    if (f.pe) setPeRange(f.pe);
    if (f.marketCap) setMcapRange(f.marketCap);
    if (f.changePercent) setChangeRange(f.changePercent);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2"><FiSearch className="text-blue-300" /> Stock Screener</h2>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-300">
          <FiFilter size={14} /> Filters
        </button>
      </div>

      {/* Pre-built Screens */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {preBuiltScreens.map((screen) => (
          <button key={screen.name} onClick={() => applyPrebuilt(screen)}
            className="rounded-xl border border-white/10 bg-black/20 p-3 text-left hover:bg-black/40 transition">
            <p className="text-xs font-bold text-white">{screen.name}</p>
            <p className="text-[10px] text-slate-500 mt-1">{screen.desc}</p>
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs text-slate-500">PE Ratio: {peRange[0]} - {peRange[1]}</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={peRange[0]} onChange={(e) => setPeRange([Number(e.target.value), peRange[1]])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
                <input type="number" value={peRange[1]} onChange={(e) => setPeRange([peRange[0], Number(e.target.value)])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Market Cap (Cr): {mcapRange[0]} - {mcapRange[1]}</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={mcapRange[0]} onChange={(e) => setMcapRange([Number(e.target.value), mcapRange[1]])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
                <input type="number" value={mcapRange[1]} onChange={(e) => setMcapRange([mcapRange[0], Number(e.target.value)])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Day Change%: {changeRange[0]} - {changeRange[1]}</label>
              <div className="flex gap-2 mt-1">
                <input type="number" value={changeRange[0]} onChange={(e) => setChangeRange([Number(e.target.value), changeRange[1]])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
                <input type="number" value={changeRange[1]} onChange={(e) => setChangeRange([changeRange[0], Number(e.target.value)])}
                  className="h-8 w-full rounded bg-black/40 px-2 text-xs text-white outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Results */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="bg-black/30 px-4 py-2 text-xs text-slate-400">{filtered.length} stocks found</div>
        <div className="divide-y divide-white/5">
          {filtered.map((s) => (
            <button key={s.symbol} onClick={() => onNavigate?.("chart", s.symbol)}
              className="flex w-full items-center justify-between px-4 py-3 hover:bg-white/5 transition">
              <div className="text-left">
                <p className="text-sm font-bold text-white">{s.symbol}</p>
                <p className="text-xs text-slate-500">{s.name}</p>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs text-slate-500">PE</p>
                  <p className="text-xs font-bold text-white">{s.pe.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">MCap</p>
                  <p className="text-xs font-bold text-white">{(s.marketCap / 1000).toFixed(0)}K Cr</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Rs. {s.price.toLocaleString("en-IN")}</p>
                  <p className={`text-xs font-bold ${s.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {s.changePercent >= 0 ? "+" : ""}{s.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
