"use client";

import { useMemo, useState } from "react";
import { FiFilter, FiStar } from "react-icons/fi";
import { watchlists } from "@/lib/marketData";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { FINNHUB_SYMBOL_MAP } from "@/lib/symbolMap";

const equities = watchlists.stocks;
const sectors = ["All", "IT", "Banking", "Pharma", "Auto", "Oil & Gas", "Infra"];

const PREBUILT = [
  { label: "Momentum",    description: "High % gainers today",   filter: (i: { change: number }) => i.change > 1 },
  { label: "Undervalued", description: "Low PE stocks",          filter: (i: { pe: number | null }) => i.pe !== null && i.pe < 20 },
  { label: "High Volume", description: "Heavy trading activity", filter: () => true },
  { label: "Top Gainers", description: "Best performers today",  filter: (i: { change: number }) => i.change > 0 },
];

export function ScreenerPage({ onSelectSymbol }: { onSelectSymbol?: (s: string) => void }) {
  const [sector, setSector] = useState("All");
  const [minPE, setMinPE] = useState("");
  const [maxPE, setMaxPE] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [prebuilt, setPrebuilt] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);

  const symbols = equities.map((i) => i.symbol).filter((s) => s in FINNHUB_SYMBOL_MAP);
  const quotes = useLiveQuotes(symbols, 30000);

  const filtered = useMemo(() => {
    // Only show stocks where live data has actually loaded
    let list = equities.map((i) => {
      const q = quotes[i.symbol];
      return {
        ...i,
        price: q?.price ?? 0,
        change: q?.changePct ?? 0,
        pe: q?.pe ?? null,
        isLoading: !q || q.isLoading,
      };
    }).filter((i) => !i.isLoading && i.price > 0); // only show live data

    if (sector !== "All") list = list.filter((i) => i.sector === sector);
    if (minPE) list = list.filter((i) => i.pe !== null && i.pe >= Number(minPE));
    if (maxPE) list = list.filter((i) => i.pe !== null && i.pe <= Number(maxPE));
    if (minPrice) list = list.filter((i) => i.price >= Number(minPrice));
    if (maxPrice) list = list.filter((i) => i.price <= Number(maxPrice));

    if (prebuilt) {
      const pb = PREBUILT.find((p) => p.label === prebuilt);
      if (pb) list = list.filter((i) => pb.filter(i));
    }
    return list;
  }, [sector, minPE, maxPE, minPrice, maxPrice, prebuilt, quotes]);

  function saveScreen() {
    const name = `Screen ${saved.length + 1}`;
    setSaved((prev) => [...prev, name]);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
          <FiFilter /> Stock Screener
        </p>

        {/* Pre-built screens */}
        <div className="mb-4 flex flex-wrap gap-2">
          {PREBUILT.map((p) => (
            <button key={p.label} type="button" onClick={() => setPrebuilt(prebuilt === p.label ? null : p.label)}
              className={`h-9 rounded-xl px-3 text-xs font-bold ${prebuilt === p.label ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Sector filter */}
        <div className="mb-4 flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button key={s} type="button" onClick={() => setSector(s)}
              className={`h-8 rounded-xl px-3 text-xs font-bold ${sector === s ? "bg-indigo-500 text-white" : "bg-black/30 text-slate-500"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Range filters */}
        <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
          <label className="rounded-xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Min PE</span>
            <input type="number" value={minPE} onChange={(e) => setMinPE(e.target.value)}
              placeholder="0" className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" />
          </label>
          <label className="rounded-xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Max PE</span>
            <input type="number" value={maxPE} onChange={(e) => setMaxPE(e.target.value)}
              placeholder="100" className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" />
          </label>
          <label className="rounded-xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Min Price ₹</span>
            <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
              className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" />
          </label>
          <label className="rounded-xl bg-black/25 p-3">
            <span className="text-xs text-slate-500">Max Price ₹</span>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
              className="mt-1 h-8 w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" />
          </label>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-slate-400">{filtered.length} stocks found</p>
          <button type="button" onClick={saveScreen} className="flex items-center gap-1 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300">
            <FiStar size={12} /> Save Screen
          </button>
        </div>

        {/* Results */}
        {quotes[equities[0]?.symbol]?.isLoading && filtered.length === 0 && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        )}
        <div className="space-y-2">
          {filtered.map((stock) => {
            const isUp = stock.change >= 0;
            return (
              <button key={stock.symbol} type="button" onClick={() => onSelectSymbol?.(stock.symbol)}
                className="flex w-full items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-left hover:bg-white/5">
                <div>
                  <p className="text-sm font-bold text-white">{stock.symbol}</p>
                  <p className="text-xs text-slate-500">PE: {stock.pe?.toFixed(1) ?? "—"} · {stock.sector ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">₹{stock.price.toLocaleString("en-IN")}</p>
                  <p className={`text-xs font-bold ${isUp ? "text-emerald-300" : "text-red-300"}`}>
                    {isUp ? "+" : ""}{stock.change.toFixed(2)}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved screens */}
      {saved.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="mb-2 text-sm font-bold text-white">Saved Screens</p>
          <div className="flex flex-wrap gap-2">
            {saved.map((s) => (
              <span key={s} className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-indigo-300">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
