"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiSearch, FiTrendingDown, FiTrendingUp, FiBell, FiX } from "react-icons/fi";
import { addDoc, collection, doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { watchlists, watchTabs, getContractMeta } from "@/lib/marketData";
import type { WatchlistKey } from "@/lib/marketData";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { useDerivativeQuotes } from "@/lib/useDerivativeQuotes";
import { FINNHUB_SYMBOL_MAP } from "@/lib/symbolMap";
import { StockDetailModal } from "@/components/StockDetailModal";
import type { Instrument } from "@/types/app";

// Instruments that have direct Finnhub quote symbols
const DIRECT_SYMBOLS = Object.keys(FINNHUB_SYMBOL_MAP);
const allInstruments: Instrument[] = Object.values(watchlists).flat();

// Symbols needed to derive F&O prices
const SPOT_SYMBOLS_FOR_FO = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "RELIANCE", "TCS", "HDFCBANK", "SBIN", "INFY"];

type SortKey = "default" | "price_asc" | "price_desc" | "change_asc" | "change_desc";

function useCombinedQuotes(tabSymbols: string[]) {
  // Direct Finnhub quote symbols in this tab
  const directSymbols = useMemo(() => tabSymbols.filter((s) => DIRECT_SYMBOLS.includes(s)), [tabSymbols]);
  // Spot symbols needed for F&O derivation
  const needsSpot = useMemo(() =>
    tabSymbols.some((s) => !DIRECT_SYMBOLS.includes(s)), [tabSymbols]);

  const directQuotes = useLiveQuotes(directSymbols, 12000);
  const spotForFO = useLiveQuotes(needsSpot ? SPOT_SYMBOLS_FOR_FO : [], 12000);
  const derivativeQuotes = useDerivativeQuotes(spotForFO);

  return useMemo(() => {
    const combined: typeof directQuotes = { ...directQuotes };
    for (const sym of tabSymbols) {
      if (!DIRECT_SYMBOLS.includes(sym) && derivativeQuotes[sym]) {
        const d = derivativeQuotes[sym];
        combined[sym] = {
          symbol: sym,
          yahooSymbol: sym,
          name: sym,
          price: d.price,
          change: d.change,
          changePct: d.changePct,
          volume: 0,
          high: d.price * 1.002,
          low: d.price * 0.998,
          open: d.price,
          prevClose: d.price - d.change,
          weekHigh52: 0,
          weekLow52: 0,
          isLoading: d.isLoading,
          isError: d.isError,
        };
      }
    }
    return combined;
  }, [directQuotes, derivativeQuotes, tabSymbols]);
}

export function MarketOverview({ balance }: { balance: number }) {
  const [activeTab, setActiveTab] = useState<WatchlistKey>("indices");
  const [selected, setSelected] = useState<Instrument>(watchlists.indices[0]);
  const [searchValue, setSearchValue] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [alertSymbol, setAlertSymbol] = useState<string | null>(null);
  const [alertPrice, setAlertPrice] = useState("");
  const [alertsSet, setAlertsSet] = useState<Array<{ symbol: string; price: number }>>([]);
  const [modalInstrument, setModalInstrument] = useState<Instrument | null>(null);

  const tabSymbols = useMemo(() => watchlists[activeTab].map((i) => i.symbol), [activeTab]);
  const quotes = useCombinedQuotes(tabSymbols);

  // Separate live quotes for the selected instrument
  const selectedTab = useMemo(() => [selected.symbol], [selected.symbol]);
  const selectedCombined = useCombinedQuotes(selectedTab);
  const selectedQuote = selectedCombined[selected.symbol];

  // Search autocomplete
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; shortname: string; exchange: string }>>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const query = searchValue.trim();
    if (!query) { setSearchResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const localMatches = allInstruments
          .filter((i) => i.symbol.toLowerCase().includes(query.toLowerCase()) || i.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);

        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const remote = (data.quotes ?? []).slice(0, 5).map((q: { symbol: string; shortname?: string; longname?: string; exchange?: string }) => ({
          symbol: q.symbol, shortname: q.shortname ?? q.longname ?? q.symbol, exchange: q.exchange ?? "",
        }));

        setSearchResults([
          ...localMatches.map((i) => ({ symbol: i.symbol, shortname: i.title, exchange: i.subtitle })),
          ...remote.filter((r: { symbol: string }) => !localMatches.find((l) => l.symbol === r.symbol)),
        ].slice(0, 8));
      } catch {
        const local = allInstruments.filter((i) => i.symbol.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
        setSearchResults(local.map((i) => ({ symbol: i.symbol, shortname: i.title, exchange: i.subtitle })));
      }
    }, 280);
  }, [searchValue]);

  // Price alerts check
  useEffect(() => {
    alertsSet.forEach((a) => {
      const q = quotes[a.symbol];
      if (q && q.price > 0 && q.price >= a.price) {
        window.alert(`🔔 Alert: ${a.symbol} crossed ₹${a.price}! Current: ₹${q.price.toFixed(2)}`);
        setAlertsSet((prev) => prev.filter((x) => x.symbol !== a.symbol));
      }
    });
  }, [quotes, alertsSet]);

  const currentList = useMemo(() => {
    const base = [...watchlists[activeTab]];
    switch (sortKey) {
      case "price_asc":   return base.sort((a, b) => (quotes[a.symbol]?.price ?? 0) - (quotes[b.symbol]?.price ?? 0));
      case "price_desc":  return base.sort((a, b) => (quotes[b.symbol]?.price ?? 0) - (quotes[a.symbol]?.price ?? 0));
      case "change_asc":  return base.sort((a, b) => (quotes[a.symbol]?.changePct ?? 0) - (quotes[b.symbol]?.changePct ?? 0));
      case "change_desc": return base.sort((a, b) => (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0));
      default: return base;
    }
  }, [activeTab, quotes, sortKey]);

  function chooseTab(tab: WatchlistKey) {
    setActiveTab(tab);
    setSelected(watchlists[tab][0]);
    setSearchValue("");
  }

  function selectInstrument(inst: Instrument) {
    setSelected(inst);
    setSearchValue("");
    setSearchResults([]);
  }

  const effectivePrice = selectedQuote?.price ?? 0;

  return (
    <section className="space-y-5">
      {modalInstrument && (
        <StockDetailModal instrument={modalInstrument} balance={balance} onClose={() => setModalInstrument(null)} />
      )}

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <FiTrendingUp /> Watchlist · Live
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Market Data</h2>
          </div>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl bg-black/30 px-2 py-1 text-xs text-slate-300 outline-none">
            <option value="default">Default</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="change_asc">Change% ↑</option>
            <option value="change_desc">Change% ↓</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {watchTabs.map((tab) => (
            <button key={tab.key} type="button" onClick={() => chooseTab(tab.key)}
              className={`h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition ${activeTab === tab.key ? "bg-emerald-400 text-slate-950" : "bg-black/25 text-slate-400"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <div className="flex items-center gap-3 rounded-2xl bg-black/30 px-4">
            <FiSearch className="shrink-0 text-slate-500" />
            <input value={searchValue} onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search any stock, index, F&O symbol..."
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
            {searchValue && (
              <button type="button" onClick={() => { setSearchValue(""); setSearchResults([]); }}>
                <FiX className="text-slate-500" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-14 z-20 rounded-2xl border border-white/10 bg-[#0d141d] p-2 shadow-2xl">
              {searchResults.map((item) => (
                <button key={item.symbol} type="button"
                  onClick={() => {
                    const found = allInstruments.find((i) => i.symbol === item.symbol);
                    const inst = found ?? { symbol: item.symbol, title: item.shortname, subtitle: item.exchange, price: 0, change: 0, volume: "—", high: 0, low: 0 };
                    selectInstrument(inst);
                    setModalInstrument(inst);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-white/5">
                  <span>
                    <span className="block text-sm font-bold text-white">{item.shortname}</span>
                    <span className="text-xs text-slate-500">{item.symbol} · {item.exchange}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Instrument grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {currentList.map((item) => {
            const q = quotes[item.symbol];
            const isLoading = !q || q.isLoading;
            const price = q?.price ?? 0;
            const changePct = q?.changePct ?? 0;
            const isUp = changePct >= 0;
            const active = item.symbol === selected.symbol;

            return (
              <button key={item.symbol} type="button"
                onClick={() => { selectInstrument(item); setModalInstrument(item); }}
                className={`min-h-20 rounded-2xl border p-4 text-left transition ${active ? "border-emerald-300/60 bg-emerald-300/10" : "border-white/10 bg-black/20 hover:border-white/20"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAlertSymbol(item.symbol); setAlertPrice(""); }}
                    className="mt-0.5 rounded-lg bg-black/30 p-1 text-slate-500 hover:text-amber-300">
                    <FiBell size={12} />
                  </button>
                </div>
                {isLoading ? (
                  <div className="mt-2 space-y-1">
                    <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-14 animate-pulse rounded bg-white/5" />
                  </div>
                ) : price === 0 ? (
                  <p className="mt-2 text-xs text-slate-600">Price unavailable</p>
                ) : (
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-sm font-bold text-white">
                      ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? "+" : ""}{changePct.toFixed(2)}%
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alert modal */}
      {alertSymbol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAlertSymbol(null)}>
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-[#0d141d] p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-white">Set Price Alert</p>
            <p className="mt-1 text-sm text-slate-400">{alertSymbol}</p>
            <input type="number" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)}
              placeholder="Target price (₹)" className="mt-4 h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none" />
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setAlertSymbol(null)}
                className="h-11 flex-1 rounded-2xl border border-white/10 text-sm text-slate-400">Cancel</button>
              <button type="button" onClick={() => {
                if (alertPrice && Number(alertPrice) > 0) {
                  setAlertsSet((prev) => [...prev, { symbol: alertSymbol, price: Number(alertPrice) }]);
                  setAlertSymbol(null);
                }
              }} className="h-11 flex-1 rounded-2xl bg-amber-400 text-sm font-bold text-slate-950">Set Alert</button>
            </div>
          </div>
        </div>
      )}

      {alertsSet.length > 0 && (
        <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/[0.05] p-4">
          <p className="mb-3 text-sm font-bold text-amber-300">Active Alerts ({alertsSet.length})</p>
          <div className="space-y-2">
            {alertsSet.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                <span className="text-sm text-white">{a.symbol}</span>
                <span className="text-sm text-amber-300">≥ ₹{a.price.toLocaleString("en-IN")}</span>
                <button type="button" onClick={() => setAlertsSet((prev) => prev.filter((_, j) => j !== i))}
                  className="text-slate-500 hover:text-red-400"><FiX size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Data Panel */}
      <MarketDataPanel instrument={selected} quote={selectedQuote} />

      {/* Trade Ticket */}
      <TradeTicket instrument={selected} effectivePrice={effectivePrice} balance={balance} />
    </section>
  );
}

// ─── Market Data Panel ──────────────────────────────────────────────────────
function MarketDataPanel({ instrument, quote }: { instrument: Instrument; quote: ReturnType<typeof useLiveQuotes>[string] | undefined }) {
  const isLoading = !quote || quote.isLoading;
  const price = quote?.price ?? 0;
  const changePct = quote?.changePct ?? 0;
  const isUp = changePct >= 0;
  const high = quote?.high ?? 0;
  const low = quote?.low ?? 0;
  const range = Math.max(0.01, high - low);
  const position = price > 0 && low > 0 ? Math.min(100, Math.max(0, ((price - low) / range) * 100)) : 50;
  const spread = Math.max(0.05, price * 0.0008);
  const meta = getContractMeta(instrument);

  const stats = [
    { label: "Bid",       value: price > 0 ? `₹${(price - spread).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—" },
    { label: "Ask",       value: price > 0 ? `₹${(price + spread).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—" },
    { label: "Day High",  value: high > 0  ? `₹${high.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—" },
    { label: "Day Low",   value: low > 0   ? `₹${low.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—" },
    { label: "Open",      value: (quote?.open ?? 0) > 0 ? `₹${quote!.open.toLocaleString("en-IN")}` : "—" },
    { label: "Prev Close",value: (quote?.prevClose ?? 0) > 0 ? `₹${quote!.prevClose.toLocaleString("en-IN")}` : "—" },
    { label: "Volume",    value: (quote?.volume ?? 0) > 0 ? ((quote!.volume > 1e7 ? (quote!.volume / 1e7).toFixed(1) + " Cr" : (quote!.volume / 1e5).toFixed(1) + " L")) : "—" },
    { label: "52W High",  value: (quote?.weekHigh52 ?? 0) > 0 ? `₹${quote!.weekHigh52.toLocaleString("en-IN")}` : "—" },
    { label: "52W Low",   value: (quote?.weekLow52 ?? 0) > 0  ? `₹${quote!.weekLow52.toLocaleString("en-IN")}`  : "—" },
    { label: "Mkt Cap",   value: quote?.marketCap ? `₹${(quote.marketCap / 1e12).toFixed(2)}T` : "—" },
    { label: "P/E",       value: quote?.pe?.toFixed(1) ?? "—" },
    { label: "EPS",       value: quote?.eps?.toFixed(2) ?? "—" },
    { label: "Lot Size",  value: meta.tradableLabel },
    { label: "Product",   value: meta.product },
  ];

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Live Market Data</p>
          <h2 className="mt-2 text-2xl font-bold text-white">{instrument.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{instrument.subtitle}</p>
        </div>
        <div className="text-right">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-32 animate-pulse rounded-xl bg-white/10" />
              <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
            </div>
          ) : price === 0 ? (
            <p className="text-sm text-slate-500">Loading live price...</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-white">
                ₹{price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm font-bold ${isUp ? "text-emerald-300" : "text-red-300"}`}>
                {isUp ? "+" : ""}{changePct.toFixed(2)}%
                {quote && quote.change !== 0 && (
                  <span className="ml-1 text-xs opacity-60">({isUp ? "+" : ""}₹{quote.change.toFixed(2)})</span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {high > 0 && low > 0 && (
        <div className="mt-5 rounded-2xl bg-black/25 p-4">
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>Low ₹{low.toLocaleString("en-IN")}</span>
            <span>High ₹{high.toLocaleString("en-IN")}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800">
            <div className="h-2 rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${position}%` }} />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-black/25 p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="mt-1 text-sm font-bold text-white">{isLoading ? "—" : stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Trade Ticket ────────────────────────────────────────────────────────────
function TradeTicket({ instrument, effectivePrice, balance }: { instrument: Instrument; effectivePrice: number; balance: number }) {
  const { user } = useAuth();
  const [lots, setLots] = useState("1");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL" | "SL-M" | "AMO" | "GTT">("MARKET");
  const [productType, setProductType] = useState<"MIS" | "CNC" | "NRML">("MIS");
  const [validity, setValidity] = useState<"DAY" | "IOC" | "GTC">("DAY");
  const [target, setTarget] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const meta = getContractMeta(instrument);
  const lotCount = Math.max(1, Number(lots) || 1);
  const qty = lotCount * meta.lotSize;
  const execPrice = (orderType === "LIMIT" || orderType === "SL") && Number(limitPrice) > 0 ? Number(limitPrice) : effectivePrice;
  const notionalValue = Math.round(qty * execPrice);
  const walletImpact = Math.round(notionalValue * meta.marginRate);
  const charges = Math.round(Math.min(20, notionalValue * 0.0003) + notionalValue * 0.0007);
  const buyDebit = walletImpact + charges;
  const sellCredit = Math.max(0, walletImpact - charges);
  const maxLots = Math.floor(balance / Math.max(1, walletImpact / lotCount + charges / lotCount));
  const priceReady = effectivePrice > 0;

  async function placeTrade(side: "BUY" | "SELL") {
    if (!user?.email || !priceReady) return;
    setBusy(true);
    setMessage("");
    try {
      await runTransaction(db, async (txn) => {
        const userRef = doc(db, "users", user.uid);
        const snap = await txn.get(userRef);
        const bal = Number(snap.data()?.walletBalance ?? 0);
        const impact = side === "BUY" ? buyDebit : sellCredit;
        if (side === "BUY" && bal < impact) throw new Error("Insufficient wallet balance");
        txn.update(userRef, { walletBalance: increment(side === "BUY" ? -impact : impact), updatedAt: serverTimestamp() });
      });
      const impact = side === "BUY" ? buyDebit : sellCredit;
      await addDoc(collection(db, "trades"), {
        side, symbol: instrument.symbol, title: instrument.title,
        lots: lotCount, lotSize: meta.lotSize, quantity: qty,
        price: execPrice, amount: impact, notionalValue, charges,
        orderType, productType, validity,
        target: Number(target) || null, stopLoss: Number(stopLoss) || null,
        product: meta.product, status: "executed", mode: "paper",
        userId: user.uid, userEmail: user.email, createdAt: serverTimestamp(),
      });
      setMessage(side === "BUY" ? `✅ Buy ₹${impact.toLocaleString("en-IN")} deducted.` : `✅ Sell ₹${impact.toLocaleString("en-IN")} credited.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Trade failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Trade Ticket</h2>
          <p className="text-xs text-slate-500">Paper trading · wallet only</p>
        </div>
        <p className="text-right text-xs text-slate-400">
          Wallet <span className="block text-base font-bold text-white">₹{balance.toLocaleString("en-IN")}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(["MARKET", "LIMIT", "SL", "SL-M", "AMO", "GTT"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setOrderType(t)}
            className={`h-9 rounded-xl px-3 text-xs font-bold ${orderType === t ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        {(["MIS", "CNC", "NRML"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setProductType(p)}
            className={`h-9 flex-1 rounded-xl text-xs font-bold ${productType === p ? "bg-indigo-500 text-white" : "bg-black/30 text-slate-400"}`}>
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_120px] gap-3 mb-3">
        <div className="rounded-2xl bg-black/25 p-4">
          <p className="text-xs text-slate-500">Instrument</p>
          <p className="mt-1 font-bold text-white">{instrument.title}</p>
          <p className="mt-1 text-sm text-emerald-300">
            {priceReady ? `₹${effectivePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "Loading..."}
          </p>
          <p className="mt-1 text-xs text-slate-500">{meta.product} · {meta.tradableLabel}</p>
        </div>
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">{meta.lotSize > 1 ? "Lots" : "Qty"}</span>
          <input type="number" min="1" value={lots} onChange={(e) => setLots(e.target.value)}
            className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none" />
          {meta.lotSize > 1 && <p className="text-[10px] text-slate-600">max {maxLots}</p>}
        </label>
      </div>

      {(orderType === "LIMIT" || orderType === "SL" || orderType === "SL-M") && (
        <label className="mb-3 block rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Limit / trigger price</span>
          <input type="number" min="0" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={String(effectivePrice)} className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600" />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Target</span>
          <input type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)}
            placeholder="Optional" className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600" />
        </label>
        <label className="rounded-2xl bg-black/25 p-3">
          <span className="text-xs text-slate-500">Stop Loss</span>
          <input type="number" min="0" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Optional" className="mt-1 h-9 w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600" />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">Qty <span className="block font-bold text-white">{qty.toLocaleString("en-IN")}</span></p>
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">Value <span className="block font-bold text-white">₹{walletImpact.toLocaleString("en-IN")}</span></p>
        <p className="rounded-2xl bg-black/20 p-3 text-slate-400">Charges <span className="block font-bold text-white">₹{charges.toLocaleString("en-IN")}</span></p>
      </div>

      {message && <p className={`mb-3 text-sm ${message.startsWith("✅") ? "text-emerald-300" : "text-red-300"}`}>{message}</p>}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" disabled={busy || !priceReady} onClick={() => placeTrade("BUY")}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-bold text-slate-950 disabled:opacity-40">
          <FiTrendingUp /> {priceReady ? `BUY · ₹${buyDebit.toLocaleString("en-IN")}` : "Loading..."}
        </button>
        <button type="button" disabled={busy || !priceReady} onClick={() => placeTrade("SELL")}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-400 text-sm font-bold text-white disabled:opacity-40">
          <FiTrendingDown /> {priceReady ? `SELL · ₹${sellCredit.toLocaleString("en-IN")}` : "Loading..."}
        </button>
      </div>
    </section>
  );
}
