"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { getStaticStockList, searchStocks } from "@/lib/api";
import type { StockQuote } from "@/lib/api";

type WatchlistItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  alert?: number;
};

type Watchlist = {
  id: string;
  name: string;
  items: WatchlistItem[];
};

type SortKey = "symbol" | "price" | "changePercent" | "volume";


const defaultWatchlists: Watchlist[] = [
  {
    id: "my-stocks",
    name: "My Stocks",
    items: [
      { symbol: "RELIANCE", name: "Reliance Industries", price: 2942.80, change: 38.60, changePercent: 1.33, volume: 6240000 },
      { symbol: "TCS", name: "Tata Consultancy", price: 4020.45, change: -42.30, changePercent: -1.04, volume: 1810000 },
      { symbol: "HDFCBANK", name: "HDFC Bank", price: 1642.30, change: 18.90, changePercent: 1.16, volume: 14000000 },
      { symbol: "INFY", name: "Infosys", price: 1862.50, change: -14.80, changePercent: -0.79, volume: 7420000 },
      { symbol: "ICICIBANK", name: "ICICI Bank", price: 1248.60, change: 22.40, changePercent: 1.83, volume: 9870000 },
      { symbol: "SBIN", name: "State Bank of India", price: 868.40, change: 28.90, changePercent: 3.44, volume: 22000000 },
    ],
  },
  {
    id: "fno-list",
    name: "F&O List",
    items: [
      { symbol: "BANKNIFTY", name: "Bank Nifty Fut", price: 53480, change: -128.40, changePercent: -0.24, volume: 7800000 },
      { symbol: "NIFTY", name: "Nifty 50 Fut", price: 24850, change: 156.30, changePercent: 0.63, volume: 18400000 },
      { symbol: "TATAMOTORS", name: "Tata Motors", price: 1024.50, change: 42.80, changePercent: 4.36, volume: 18200000 },
      { symbol: "SBIN", name: "SBI", price: 868.40, change: 28.90, changePercent: 3.44, volume: 22000000 },
    ],
  },
  {
    id: "momentum",
    name: "Momentum Picks",
    items: [
      { symbol: "TATAMOTORS", name: "Tata Motors", price: 1024.50, change: 42.80, changePercent: 4.36, volume: 18200000 },
      { symbol: "ADANIENT", name: "Adani Enterprises", price: 3280.15, change: 124.60, changePercent: 3.95, volume: 8400000 },
      { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1720.40, change: 28.80, changePercent: 1.70, volume: 4200000 },
    ],
  },
];


export function WatchlistPage({ onNavigate }: { onNavigate?: (tab: string, symbol?: string) => void }) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(defaultWatchlists);
  const [activeList, setActiveList] = useState("my-stocks");
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<StockQuote[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortAsc, setSortAsc] = useState(true);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");

  const currentList = watchlists.find((w) => w.id === activeList) || watchlists[0];

  const sortedItems = useMemo(() => {
    const items = [...currentList.items];
    items.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === "string") return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return items;
  }, [currentList.items, sortKey, sortAsc]);

  useEffect(() => {
    if (searchValue.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      searchStocks(searchValue).then(setSearchResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  function addToWatchlist(stock: StockQuote) {
    setWatchlists((prev) =>
      prev.map((w) => {
        if (w.id !== activeList) return w;
        if (w.items.find((i) => i.symbol === stock.symbol)) return w;
        return { ...w, items: [...w.items, { symbol: stock.symbol, name: stock.name, price: stock.price, change: stock.change, changePercent: stock.changePercent, volume: stock.volume }] };
      })
    );
    setSearchValue("");
    setSearchResults([]);
  }


  function removeFromWatchlist(symbol: string) {
    setWatchlists((prev) =>
      prev.map((w) => w.id === activeList ? { ...w, items: w.items.filter((i) => i.symbol !== symbol) } : w)
    );
  }

  function createWatchlist() {
    if (!newListName.trim()) return;
    const id = newListName.toLowerCase().replace(/\s+/g, "-");
    setWatchlists((prev) => [...prev, { id, name: newListName, items: [] }]);
    setActiveList(id);
    setNewListName("");
    setShowNewList(false);
  }

  function deleteWatchlist(id: string) {
    if (watchlists.length <= 1) return;
    setWatchlists((prev) => prev.filter((w) => w.id !== id));
    if (activeList === id) setActiveList(watchlists[0].id);
  }

  function setAlert(symbol: string) {
    if (!alertPrice) return;
    setWatchlists((prev) =>
      prev.map((w) => w.id === activeList
        ? { ...w, items: w.items.map((i) => i.symbol === symbol ? { ...i, alert: Number(alertPrice) } : i) }
        : w
      )
    );
    setAlertSymbol(null);
    setAlertPrice("");
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }


  return (
    <div className="space-y-4">
      {/* Watchlist Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {watchlists.map((w) => (
          <button
            key={w.id}
            onClick={() => setActiveList(w.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeList === w.id ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400 hover:text-white"
            }`}
          >
            {w.name} ({w.items.length})
            {watchlists.length > 1 && activeList === w.id && (
              <FiTrash2 size={12} onClick={(e) => { e.stopPropagation(); deleteWatchlist(w.id); }} />
            )}
          </button>
        ))}
        <button
          onClick={() => setShowNewList(true)}
          className="flex shrink-0 items-center gap-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"
        >
          <FiPlus size={14} /> New
        </button>
      </div>

      {/* New watchlist form */}
      {showNewList && (
        <div className="flex gap-2">
          <input
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Watchlist name..."
            className="h-10 flex-1 rounded-xl bg-black/30 px-4 text-sm text-white outline-none"
            onKeyDown={(e) => e.key === "Enter" && createWatchlist()}
          />
          <button onClick={createWatchlist} className="rounded-xl bg-emerald-400 px-4 text-sm font-bold text-slate-950">Add</button>
          <button onClick={() => setShowNewList(false)} className="rounded-xl bg-white/10 px-3 text-slate-400"><FiX /></button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className="flex items-center gap-3 rounded-2xl bg-black/30 px-4">
          <FiSearch className="text-slate-500" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search NSE/BSE stocks..."
            className="h-12 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          {searchValue && <button onClick={() => { setSearchValue(""); setSearchResults([]); }}><FiX className="text-slate-500" /></button>}
        </div>
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-14 z-30 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d141d] p-2 shadow-2xl">
            {searchResults.map((s) => (
              <button
                key={s.symbol}
                onClick={() => addToWatchlist(s)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 hover:bg-white/5"
              >
                <div className="text-left">
                  <p className="text-sm font-bold text-white">{s.symbol}</p>
                  <p className="text-xs text-slate-500">{s.name}</p>
                </div>
                <span className="text-xs text-emerald-300">+ Add</span>
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Sort Controls */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">Sort:</span>
        {(["symbol", "price", "changePercent", "volume"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`rounded-lg px-2 py-1 ${sortKey === key ? "bg-emerald-400/20 text-emerald-300" : "text-slate-500 hover:text-white"}`}
          >
            {key === "changePercent" ? "Change%" : key.charAt(0).toUpperCase() + key.slice(1)}
            {sortKey === key && (sortAsc ? " ↑" : " ↓")}
          </button>
        ))}
      </div>

      {/* Watchlist Items */}
      <div className="space-y-2">
        {sortedItems.map((item) => (
          <div key={item.symbol} className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => onNavigate?.("chart", item.symbol)}
                className="text-left flex-1"
              >
                <p className="text-sm font-bold text-white">{item.symbol}</p>
                <p className="text-xs text-slate-500">{item.name}</p>
              </button>
              <div className="text-right mr-3">
                <p className="text-sm font-bold text-white">Rs. {item.price.toLocaleString("en-IN")}</p>
                <p className={`text-xs font-semibold ${item.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setAlertSymbol(item.symbol); setAlertPrice(""); }}
                  className="rounded-lg p-2 text-slate-500 hover:text-amber-300 hover:bg-white/5"
                  title="Set Alert"
                >
                  <FiBell size={14} />
                </button>
                <button
                  onClick={() => removeFromWatchlist(item.symbol)}
                  className="rounded-lg p-2 text-slate-500 hover:text-red-300 hover:bg-white/5"
                  title="Remove"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              <span>Vol: {(item.volume / 100000).toFixed(1)}L</span>
              {item.alert && (
                <span className="flex items-center gap-1 text-amber-300">
                  <FiAlertCircle size={12} /> Alert: Rs.{item.alert}
                </span>
              )}
            </div>
            {/* Alert Modal */}
            {alertSymbol === item.symbol && (
              <div className="mt-3 flex gap-2 rounded-xl bg-amber-400/10 p-3">
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder="Target price..."
                  className="h-9 flex-1 rounded-lg bg-black/30 px-3 text-sm text-white outline-none"
                />
                <button onClick={() => setAlert(item.symbol)} className="rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950">Set</button>
                <button onClick={() => setAlertSymbol(null)} className="rounded-lg bg-white/10 px-2 text-slate-400"><FiX size={14} /></button>
              </div>
            )}
          </div>
        ))}
        {sortedItems.length === 0 && (
          <p className="rounded-2xl bg-black/20 p-6 text-center text-sm text-slate-500">
            No stocks in this watchlist. Use search to add stocks.
          </p>
        )}
      </div>
    </div>
  );
}
