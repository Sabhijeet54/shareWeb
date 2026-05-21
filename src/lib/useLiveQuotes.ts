"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toYahoo } from "@/lib/symbolMap";

export type LiveQuote = {
  symbol: string;
  yahooSymbol: string;
  name: string;
  price: number;
  change: number;       // absolute ₹ change
  changePct: number;    // percent change
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  weekHigh52: number;
  weekLow52: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  isLoading: boolean;
  isError: boolean;
};

type RawYahooResult = {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
};

function mapResult(raw: RawYahooResult, appSymbol: string): LiveQuote {
  return {
    symbol: appSymbol,
    yahooSymbol: raw.symbol,
    name: raw.shortName ?? raw.longName ?? appSymbol,
    price: raw.regularMarketPrice ?? 0,
    change: raw.regularMarketChange ?? 0,
    changePct: raw.regularMarketChangePercent ?? 0,
    volume: raw.regularMarketVolume ?? 0,
    high: raw.regularMarketDayHigh ?? 0,
    low: raw.regularMarketDayLow ?? 0,
    open: raw.regularMarketOpen ?? 0,
    prevClose: raw.regularMarketPreviousClose ?? 0,
    weekHigh52: raw.fiftyTwoWeekHigh ?? 0,
    weekLow52: raw.fiftyTwoWeekLow ?? 0,
    marketCap: raw.marketCap,
    pe: raw.trailingPE,
    eps: raw.epsTrailingTwelveMonths,
    isLoading: false,
    isError: false,
  };
}

// Fetches live quotes for a list of app symbols, auto-refreshing every `refreshMs`
export function useLiveQuotes(
  symbols: string[],
  refreshMs = 2500,
): Record<string, LiveQuote> {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>(() => {
    const init: Record<string, LiveQuote> = {};
    for (const sym of symbols) {
      init[sym] = {
        symbol: sym,
        yahooSymbol: toYahoo(sym),
        name: sym,
        price: 0,
        change: 0,
        changePct: 0,
        volume: 0,
        high: 0,
        low: 0,
        open: 0,
        prevClose: 0,
        weekHigh52: 0,
        weekLow52: 0,
        isLoading: true,
        isError: false,
      };
    }
    return init;
  });

  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  const fetchQuotes = useCallback(async () => {
    if (symbolsRef.current.length === 0) return;

    // Build yahoo symbol string, deduplicated
    const yahooSymbols = [
      ...new Set(symbolsRef.current.map((s) => toYahoo(s))),
    ].join(",");

    try {
<<<<<<< Updated upstream
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(yahooSymbols)}`);
=======
      const res = await fetch(`/api/quote?symbols=${encodeURIComponent(finnhubSymbols)}&_t=${Date.now()}`, { cache: "no-store" });
>>>>>>> Stashed changes
      if (!res.ok) throw new Error("fetch failed");

      const data = await res.json();
      const results: RawYahooResult[] =
        data?.quoteResponse?.result ?? data?.result ?? [];

      if (results.length === 0) throw new Error("no results");

      // Build a map from yahoo symbol → raw result
      const byYahoo: Record<string, RawYahooResult> = {};
      for (const r of results) {
        byYahoo[r.symbol] = r;
      }

      setQuotes((prev) => {
        const next = { ...prev };
        for (const appSym of symbolsRef.current) {
          const yahooSym = toYahoo(appSym);
          const raw = byYahoo[yahooSym];
          if (raw) {
            next[appSym] = mapResult(raw, appSym);
          } else {
            // Keep previous price but mark stale
            next[appSym] = { ...prev[appSym], isLoading: false, isError: false };
          }
        }
        return next;
      });
    } catch {
      setQuotes((prev) => {
        const next = { ...prev };
        for (const sym of symbolsRef.current) {
          next[sym] = { ...prev[sym], isLoading: false, isError: prev[sym].price === 0 };
        }
        return next;
      });
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
    const id = setInterval(fetchQuotes, refreshMs);
    return () => clearInterval(id);
  }, [fetchQuotes, refreshMs]);

  return quotes;
}

// Single-symbol hook — wraps useLiveQuotes
export function useLiveSingleQuote(symbol: string, refreshMs = 2500) {
  const quotes = useLiveQuotes([symbol], refreshMs);
  return quotes[symbol];
}
