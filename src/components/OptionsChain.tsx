"use client";
// ─── F&O Options Chain — NSE · MCX · BSE ─────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiRefreshCw, FiSearch, FiX, FiBarChart2 } from "react-icons/fi";
import { equityInstruments, indexInstruments, watchlists } from "@/lib/marketData";
import { getCurrencySign } from "@/lib/symbolMap";

/* ── Instruments by exchange ──────────────────────────────────────────────── */
type Exchange = "NSE" | "MCX" | "BSE";

const NSE_FNO = [
  ...indexInstruments.filter((i) => ["NIFTY 50", "BANK NIFTY"].includes(i.symbol)),
  ...equityInstruments.slice(0, 30),
];

const MCX_FNO = watchlists.commodities.map((c) => ({
  symbol: c.symbol,
  title: c.title,
  subtitle: "MCX",
}));

const BSE_FNO = [
  { symbol: "SENSEX", title: "SENSEX", subtitle: "BSE Index" },
  ...equityInstruments.slice(0, 15).map((e) => ({
    symbol: e.symbol,
    title: e.title,
    subtitle: "BSE",
  })),
];

const ALL_FNO = [...NSE_FNO, ...MCX_FNO, ...BSE_FNO];

const EXCHANGE_INSTRUMENTS: Record<Exchange, Array<{ symbol: string; title: string; subtitle: string }>> = {
  NSE: NSE_FNO,
  MCX: MCX_FNO,
  BSE: BSE_FNO,
};

/* ── Interfaces ───────────────────────────────────────────────────────────── */
interface OptionLeg {
  premium: number;
  bid: number;
  ask: number;
  iv: number;
  oi: number;
  oiFormatted: string;
  oiChange: number;
  volume: number;
  volumeFormatted: string;
  change: number;
  changePct: number;
  itm: boolean;
}

interface StrikeRow {
  strike: number;
  expiry: string;
  isATM: boolean;
  ce: OptionLeg;
  pe: OptionLeg;
}

interface OptionsData {
  symbol: string;
  underlyingName: string;
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPainStrike: number;
  expiryStr: string;
  expirationDates: string[];
  chain: StrikeRow[];
  totalCeOI: number;
  totalPeOI: number;
  exchange?: string;
  synthetic?: boolean;
}

type SearchSuggestion = {
  symbol: string;
  shortname: string;
  longname?: string;
  exchange: string;
  instrumentKey?: string;
  quoteType?: "EQUITY" | "INDEX" | "OPTION" | "FUTURE" | "OTHER";
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
  underlyingSymbol?: string;
};

/* ── Parse search input ────────────────────────────────────────────────────── */
// "NIFTY 23800" → { underlying: "NIFTY 50", strike: 23800 }
// "RELIANCE" → { underlying: "RELIANCE", strike: null }
// "23800" → { underlying: null, strike: 23800 }
function parseSearchQuery(query: string): { underlying: string | null; strike: number | null } {
  const trimmed = query.trim();
  const normalized = trimmed.replace(/,/g, "");
  // Pure number = strike price filter for current underlying
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    return { underlying: null, strike: Number(normalized) };
  }
  // "NIFTY 23800" or "BANK NIFTY 24000" pattern
  const parts = normalized.match(/^(.+?)\s+(\d{3,6}(?:\.\d+)?)$/);
  if (parts) {
    const name = parts[1].toUpperCase();
    const strike = Number(parts[2]);
    // Try to find the underlying instrument
    const match = ALL_FNO.find(
      (i) =>
        i.symbol.toUpperCase() === name ||
        i.title.toUpperCase() === name ||
        i.symbol.toUpperCase().startsWith(name) ||
        i.title.toUpperCase().includes(name)
    );
    return { underlying: match?.symbol ?? name, strike };
  }
  return { underlying: trimmed, strike: null };
}

/* ── Component ────────────────────────────────────────────────────────────── */
export function OptionsChain({ onSelectSymbol }: { onSelectSymbol?: (symbol: string) => void }) {
  const [exchange, setExchange] = useState<Exchange>("NSE");
  const [underlyingSymbol, setUnderlyingSymbol] = useState(NSE_FNO[0]?.symbol ?? "NIFTY 50");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [strikeFilter, setStrikeFilter] = useState<number | null>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const strikeScrollRef = useRef<HTMLTableRowElement | null>(null);

  const instruments = EXCHANGE_INSTRUMENTS[exchange];
  const cs = getCurrencySign(underlyingSymbol);

  const applySuggestionSelection = useCallback((item: SearchSuggestion) => {
    const ex = item.exchange.toUpperCase();
    const exMaybe = ex === "NSE" || ex === "BSE" || ex === "MCX" ? (ex as Exchange) : null;
    if (exMaybe && exMaybe !== exchange) {
      setExchange(exMaybe);
    }

    const nextUnderlying = item.quoteType === "OPTION"
      ? (item.underlyingSymbol || underlyingSymbol)
      : item.symbol;

    setUnderlyingSymbol(nextUnderlying);
    setSelectedDate(item.expiry && /^\d{4}-\d{2}-\d{2}$/.test(item.expiry) ? item.expiry : "");
    if (typeof item.strike === "number" && Number.isFinite(item.strike)) {
      setStrikeFilter(item.strike);
    }

    setSearchValue("");
    setSearchResults([]);
    setSearchOpen(false);
    setActiveSuggestionIdx(-1);

    if (onSelectSymbol) {
      onSelectSymbol(item.symbol);
    }
  }, [exchange, onSelectSymbol, underlyingSymbol]);

  // When exchange changes, pick first instrument
  const handleExchangeChange = (ex: Exchange) => {
    setExchange(ex);
    const first = EXCHANGE_INSTRUMENTS[ex][0];
    if (first) setUnderlyingSymbol(first.symbol);
    setSelectedDate("");
    setSearchValue("");
    setSearchResults([]);
  };

  /* ── Search ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchAbortRef.current?.abort();
    const query = searchValue.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchOpen(false);
      setActiveSuggestionIdx(-1);
      return;
    }

    const parsed = parseSearchQuery(query);

    // If it's only a number, treat as strike filter for current underlying
    if (parsed.underlying === null && parsed.strike !== null) {
      setStrikeFilter(parsed.strike);
      setSearchResults([]);
      setSearchLoading(false);
      setSearchOpen(false);
      setActiveSuggestionIdx(-1);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);

    searchDebounce.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        searchAbortRef.current = controller;
        const timeout = setTimeout(() => controller.abort(), 7000);

        // Local matches across ALL exchanges
        const localMatches: SearchSuggestion[] = ALL_FNO
          .filter((i) => i.symbol.toLowerCase().includes((parsed.underlying ?? query).toLowerCase()) || i.title.toLowerCase().includes((parsed.underlying ?? query).toLowerCase()))
          .slice(0, 6)
          .map((i) => ({
            symbol: i.symbol,
            shortname: i.title,
            exchange: i.subtitle,
            quoteType: "EQUITY" as const,
            strike: parsed.strike ?? undefined,
          }));

        // Search for more results
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`, { signal: controller.signal });
        const json = await res.json();
        clearTimeout(timeout);
        const remote: SearchSuggestion[] = (json.quotes ?? [])
          .slice(0, 18)
          .map((q: SearchSuggestion) => ({
            symbol: q.symbol,
            shortname: q.shortname ?? q.longname ?? q.symbol,
            exchange: q.exchange ?? "",
            instrumentKey: q.instrumentKey,
            quoteType: q.quoteType,
            expiry: q.expiry,
            strike: q.strike,
            optionType: q.optionType,
            underlyingSymbol: q.underlyingSymbol,
          }));

        const merged = [
          ...localMatches,
          ...remote.filter((r: SearchSuggestion) => !localMatches.find((l: SearchSuggestion) => l.symbol === r.symbol)),
        ].slice(0, 20);

        setSearchResults(merged);
        setActiveSuggestionIdx(merged.length > 0 ? 0 : -1);
        setSearchOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const local = ALL_FNO
          .filter((i) => i.symbol.toLowerCase().includes((parsed.underlying ?? query).toLowerCase()))
          .slice(0, 6)
          .map((i) => ({ symbol: i.symbol, shortname: i.title, exchange: i.subtitle, quoteType: "EQUITY" as const, strike: parsed.strike ?? undefined }));
        setSearchResults(local);
        setActiveSuggestionIdx(local.length > 0 ? 0 : -1);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [searchValue]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setActiveSuggestionIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Fetch chain ────────────────────────────────────────────────────────── */
  const fetchChain = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ symbol: underlyingSymbol, exchange });
      if (selectedDate) params.set("date", selectedDate);
      const resp = await fetch(`/api/options?${params}`);
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [underlyingSymbol, selectedDate, exchange]);

  useEffect(() => { fetchChain(); }, [fetchChain]);

  // Auto-refresh every 15s
  useEffect(() => {
    const id = setInterval(fetchChain, 15000);
    return () => clearInterval(id);
  }, [fetchChain]);

  /* ── Expiry options ─────────────────────────────────────────────────────── */
  const expiryOptions = useMemo(() => {
    if (!data?.expirationDates) return [];
    return data.expirationDates.map((dateStr) => {
      // Upstox returns ISO date strings like "2026-05-26"
      const parts = String(dateStr).split("-");
      let label = String(dateStr);
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
          });
        }
      }
      return { value: String(dateStr), label };
    });
  }, [data?.expirationDates]);

  const chain = data?.chain ?? [];
  const spotPrice = data?.spotPrice ?? 0;

  // Filter chain when strike filter is active — show 10 strikes around the target
  const displayChain = useMemo(() => {
    if (!strikeFilter || chain.length === 0) return chain;
    // Find closest strike to the filter
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < chain.length; i++) {
      const dist = Math.abs(chain[i].strike - strikeFilter);
      if (dist < minDist) { minDist = dist; closestIdx = i; }
    }
    const from = Math.max(0, closestIdx - 5);
    const to = Math.min(chain.length, closestIdx + 6);
    return chain.slice(from, to);
  }, [chain, strikeFilter]);

  // Scroll to the target strike row after data loads
  useEffect(() => {
    if (strikeFilter && strikeScrollRef.current) {
      strikeScrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [strikeFilter, displayChain]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">
              Options Chain · {exchange}
            </p>
            {lastUpdated && (
              <p className="text-[10px] text-[var(--text-muted)]">
                Updated: {lastUpdated.toLocaleTimeString("en-IN")}
                {data?.synthetic && <span className="ml-1 text-[var(--warn-label)]">(Synthetic B-S)</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSelectSymbol && (
              <button type="button" onClick={() => onSelectSymbol(underlyingSymbol)}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-label)]">
                <FiBarChart2 size={12} /> Chart
              </button>
            )}
            <button type="button" onClick={fetchChain}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--green)]">
              <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Exchange tabs */}
        <div className="flex gap-2 mb-3">
          {(["NSE", "MCX", "BSE"] as Exchange[]).map((ex) => (
            <button key={ex} type="button" onClick={() => handleExchangeChange(ex)}
              className={`h-9 rounded-xl px-4 text-xs font-bold transition ${
                exchange === ex
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-[var(--background)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}>
              {ex} {ex === "MCX" ? "Commodity" : ex === "BSE" ? "Sensex" : "F&O"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div ref={searchRef} className="relative mb-3">
          <div className="flex items-center rounded-xl border border-[var(--card-border)] bg-[var(--background)]/80 px-3">
            <FiSearch size={14} className="text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!searchOpen) setSearchOpen(true);
                  if (searchResults.length > 0) {
                    setActiveSuggestionIdx((prev) => (prev + 1) % searchResults.length);
                  }
                  return;
                }

                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    setActiveSuggestionIdx((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
                  }
                  return;
                }

                if (e.key === "Escape") {
                  setSearchOpen(false);
                  setActiveSuggestionIdx(-1);
                  return;
                }

                if (e.key !== "Enter") return;
                e.preventDefault();

                if (searchOpen && activeSuggestionIdx >= 0 && searchResults[activeSuggestionIdx]) {
                  applySuggestionSelection(searchResults[activeSuggestionIdx]);
                  return;
                }

                const parsed = parseSearchQuery(searchValue);
                if (parsed.strike != null) {
                  setStrikeFilter(parsed.strike);
                  if (parsed.underlying) {
                    setUnderlyingSymbol(parsed.underlying);
                    setSelectedDate("");
                  }
                  setSearchOpen(false);
                }
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder={`Search instrument or strike e.g. "NIFTY 23800"...`}
              className="h-10 flex-1 bg-transparent px-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {searchValue && (
              <button type="button" onClick={() => { setSearchValue(""); setSearchResults([]); setSearchOpen(false); setSearchLoading(false); setActiveSuggestionIdx(-1); }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <FiX size={14} />
              </button>
            )}
          </div>
          {searchOpen && searchValue.trim() && (
            <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--dropdown-bg)] shadow-xl backdrop-blur-xl">
              <div className="max-h-72 overflow-y-auto overscroll-contain scroll-smooth p-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] touch-pan-y">
                {searchLoading && (
                  <div className="px-3 py-3 text-xs text-[var(--text-muted)]">Searching live contracts...</div>
                )}

                {!searchLoading && searchResults.length === 0 && (
                  <div className="px-3 py-3 text-xs text-[var(--text-muted)]">No contracts found.</div>
                )}

                {!searchLoading && searchResults.map((r, index) => {
                  const isActive = index === activeSuggestionIdx;
                return (
                    <button key={`${r.instrumentKey ?? r.symbol}-${index}`} type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveSuggestionIdx(index)}
                      onClick={() => applySuggestionSelection(r)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left ${isActive ? "bg-[var(--hover-bg)]" : "hover:bg-[var(--hover-bg)]"}`}>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{r.symbol}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{r.shortname}</p>
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {r.exchange}
                        {r.optionType ? ` · ${r.optionType}` : ""}
                        {typeof r.strike === "number" ? ` · ${r.strike}` : ""}
                      </span>
                    </button>
                );
              })}
            </div>
            </div>
          )}
        </div>

        {/* Active strike filter indicator */}
        {strikeFilter && (
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-[var(--warn-label)]">
              Strike: {strikeFilter.toLocaleString("en-IN")}
              <button type="button" onClick={() => setStrikeFilter(null)} className="ml-1 hover:text-[var(--text-primary)]">
                <FiX size={12} />
              </button>
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Showing strikes near {strikeFilter}</span>
          </div>
        )}

        {/* Instrument buttons (scrollable) */}
        <div className="flex flex-wrap gap-1.5 mb-3 max-h-24 overflow-y-auto">
          {instruments.map((item) => (
            <button key={item.symbol} type="button"
              onClick={() => { setUnderlyingSymbol(item.symbol); setSelectedDate(""); }}
              className={`h-8 rounded-lg px-3 text-[11px] font-bold transition ${
                underlyingSymbol === item.symbol
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}>
              {item.symbol}
            </button>
          ))}
        </div>

        {/* Expiry selector */}
        {expiryOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {expiryOptions.slice(0, 6).map((e) => (
              <button key={e.value} type="button"
                onClick={() => setSelectedDate(e.value)}
                className={`h-8 rounded-lg px-3 text-[11px] font-bold transition ${
                  selectedDate === e.value || (!selectedDate && e.value === String(data?.expirationDates?.[0]))
                    ? "bg-indigo-500 text-white"
                    : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                {e.label}
              </button>
            ))}
            {expiryOptions.length > 6 && (
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 text-[11px] font-bold text-[var(--text-secondary)] outline-none">
                <option value="">More...</option>
                {expiryOptions.slice(6).map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Spot Price</p>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {spotPrice > 0 ? `${cs}${spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{data?.underlyingName ?? underlyingSymbol}</p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">PCR (OI)</p>
            <p className={`text-base font-bold ${(data?.pcr ?? 0) > 1 ? "text-[var(--green)]" : (data?.pcr ?? 0) > 0.7 ? "text-[var(--warn-label)]" : "text-[var(--red)]"}`}>
              {data?.pcr ?? "—"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {(data?.pcr ?? 0) > 1.2 ? "Bullish" : (data?.pcr ?? 0) > 0.8 ? "Neutral" : "Bearish"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Max Pain</p>
            <p className="text-base font-bold text-[var(--warn-label)]">
              {data?.maxPainStrike ? `${cs}${data.maxPainStrike.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Total OI</p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-[10px]">
                <span className="text-[var(--green)]">CE:</span>{" "}
                <span className="font-bold text-[var(--text-primary)]">{formatNum(data?.totalCeOI ?? 0)}</span>
              </span>
              <span className="text-[10px]">
                <span className="text-[var(--red)]">PE:</span>{" "}
                <span className="font-bold text-[var(--text-primary)]">{formatNum(data?.totalPeOI ?? 0)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 mb-3 text-sm text-[var(--red)]">
            {error}
            <button type="button" onClick={fetchChain}
              className="ml-2 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && chain.length === 0 && (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-8 flex-1 animate-pulse rounded bg-emerald-400/5" />
                <div className="h-8 w-20 animate-pulse rounded bg-[var(--card-border)]" />
                <div className="h-8 flex-1 animate-pulse rounded bg-red-400/5" />
              </div>
            ))}
          </div>
        )}

        {/* Chain table */}
        {displayChain.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)]">
            {strikeFilter && (
              <div className="bg-amber-400/10 px-3 py-1.5 text-[10px] font-semibold text-[var(--warn-label)] flex items-center justify-between">
                <span>Showing strikes near {strikeFilter.toLocaleString("en-IN")}</span>
                <button type="button" onClick={() => setStrikeFilter(null)} className="underline hover:no-underline text-[var(--text-secondary)]">Show all</button>
              </div>
            )}
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-[var(--text-muted)]">
                  <th className="p-2 text-right text-[var(--green)] font-semibold">OI</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Vol</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">IV%</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Chg%</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Bid</th>
                  <th className="p-2 text-right text-[var(--green)] font-bold">CE {cs}</th>
                  <th className="p-2 text-center font-bold text-[var(--text-primary)] bg-[var(--background)]">STRIKE</th>
                  <th className="p-2 text-left text-[var(--red)] font-bold">PE {cs}</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Bid</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Chg%</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">IV%</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Vol</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">OI</th>
                </tr>
              </thead>
              <tbody>
                {displayChain.map((row) => {
                  const ceUp = row.ce.change >= 0;
                  const peUp = row.pe.change >= 0;
                  const isFilterTarget = strikeFilter != null && row.strike === strikeFilter;
                  const isClosestToFilter = strikeFilter != null && !displayChain.some((r) => r.strike === strikeFilter) &&
                    row.strike === displayChain.reduce((prev, curr) => Math.abs(curr.strike - strikeFilter) < Math.abs(prev.strike - strikeFilter) ? curr : prev).strike;
                  const isHighlighted = isFilterTarget || isClosestToFilter;
                  return (
                    <tr key={row.strike}
                      ref={isHighlighted ? strikeScrollRef : undefined}
                      className={`border-b border-[var(--card-border)] transition-colors ${
                        isHighlighted
                          ? "bg-indigo-400/20 ring-1 ring-indigo-400/40"
                          : row.isATM
                            ? "bg-amber-400/10"
                            : row.ce.itm
                              ? "bg-emerald-400/[0.04]"
                              : row.pe.itm
                                ? "bg-red-400/[0.04]"
                                : ""
                      }`}>
                      {/* CE side */}
                      <td className="p-1.5 text-right text-[var(--text-secondary)]">
                        {row.ce.oi > 0 ? row.ce.oiFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.volume > 0 ? row.ce.volumeFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.iv > 0 ? `${row.ce.iv}` : "—"}
                      </td>
                      <td className={`p-1.5 text-right font-semibold ${ceUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.ce.changePct !== 0 ? `${row.ce.changePct > 0 ? "+" : ""}${row.ce.changePct.toFixed(1)}` : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.bid > 0 ? row.ce.bid.toFixed(2) : "—"}
                      </td>
                      <td className={`p-1.5 text-right font-bold ${ceUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.ce.premium > 0 ? `${cs}${row.ce.premium.toFixed(2)}` : "—"}
                      </td>

                      {/* Strike */}
                      <td className={`p-1.5 text-center font-bold bg-[var(--background)] ${row.isATM ? "text-[var(--warn-label)]" : "text-[var(--text-primary)]"}`}>
                        {row.strike.toLocaleString("en-IN")}
                        {row.isATM && <span className="ml-1 text-[9px] text-[var(--warn-label)]">ATM</span>}
                      </td>

                      {/* PE side */}
                      <td className={`p-1.5 text-left font-bold ${peUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.pe.premium > 0 ? `${cs}${row.pe.premium.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.bid > 0 ? row.pe.bid.toFixed(2) : "—"}
                      </td>
                      <td className={`p-1.5 text-left font-semibold ${peUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.pe.changePct !== 0 ? `${row.pe.changePct > 0 ? "+" : ""}${row.pe.changePct.toFixed(1)}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.iv > 0 ? `${row.pe.iv}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.volume > 0 ? row.pe.volumeFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-secondary)]">
                        {row.pe.oi > 0 ? row.pe.oiFormatted : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* No data */}
        {!loading && chain.length === 0 && !error && (
          <div className="rounded-xl bg-[var(--background)] p-6 text-center text-sm text-[var(--text-muted)]">
            No options data available for {underlyingSymbol} on {exchange}. Try searching for another instrument.
          </div>
        )}
      </div>

      {/* OI Analysis */}
      {chain.length > 0 && (
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">OI Analysis</p>
          <div className="space-y-1.5">
            {/* Top 5 CE OI */}
            <p className="text-[10px] font-semibold text-[var(--green)] uppercase tracking-wider">Highest Call OI (Resistance)</p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {[...chain].sort((a, b) => b.ce.oi - a.ce.oi).slice(0, 5).map((r) => (
                <div key={r.strike} className="rounded-lg bg-emerald-400/10 p-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--green)]">{r.strike.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.ce.oiFormatted}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-[var(--red)] uppercase tracking-wider">Highest Put OI (Support)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[...chain].sort((a, b) => b.pe.oi - a.pe.oi).slice(0, 5).map((r) => (
                <div key={r.strike} className="rounded-lg bg-red-400/10 p-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--red)]">{r.strike.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.pe.oiFormatted}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-xs text-[var(--text-muted)]">
        <p className="mb-2 font-semibold text-[var(--text-primary)]">Guide</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          <p><span className="text-[var(--green)]">Green</span> — In-the-money Calls</p>
          <p><span className="text-[var(--red)]">Red</span> — In-the-money Puts</p>
          <p><span className="text-[var(--warn-label)]">ATM</span> — At the money</p>
          <p>OI — Open Interest · IV — Implied Volatility</p>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          {exchange} options data. Auto-refreshes every 15 seconds. {data?.synthetic ? "Using synthetic Black-Scholes model." : "Live market feed."}
        </p>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + "Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(1) + "L";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}
