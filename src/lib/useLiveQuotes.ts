// ─── Live Quotes Hook (SSE) ──────────────────────────────────────────────────
// Streams live market quotes via Server-Sent Events instead of polling.
// Server pushes updates every ~5s from the DataPump singleton.
//
// Architecture:
//   useLiveQuotes → EventSource('/api/stream') → DataPump → NSE (1 call)
//   No more setInterval / repeated HTTP requests.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useRef, useState } from "react";

export type LiveQuote = {
  symbol: string;
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

// Shape of NormalizedQuote sent from server via SSE
type ServerQuote = {
  symbol: string;
  shortName?: string;
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

function mapQuote(raw: ServerQuote, sym: string): LiveQuote {
  return {
    symbol: sym,
    name: raw.shortName ?? sym,
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

function makeDefault(sym: string): LiveQuote {
  return {
    symbol: sym,
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

/**
 * Streams live quotes via SSE — no repeated HTTP polling.
 * Server pushes updates every ~5s from the centralized DataPump.
 *
 * @param symbols  App symbols to subscribe to (e.g. ['RELIANCE', 'TCS'])
 * @param _refreshMs  Ignored — kept for API compatibility. Server controls the interval.
 */
export function useLiveQuotes(
  symbols: string[],
  _refreshMs?: number,
): Record<string, LiveQuote> {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>(() => {
    const init: Record<string, LiveQuote> = {};
    for (const sym of symbols) init[sym] = makeDefault(sym);
    return init;
  });

  // Stable dependency: sorted, deduped symbol list
  const symbolsKey = [...new Set(symbols)].sort().join(",");
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    const uniqueSymbols = [...new Set(symbolsRef.current)];
    if (uniqueSymbols.length === 0) return;

    // Reset to loading when symbols change
    setQuotes(() => {
      const init: Record<string, LiveQuote> = {};
      for (const sym of uniqueSymbols) init[sym] = makeDefault(sym);
      return init;
    });

    // Open SSE connection to /api/stream
    const es = new EventSource(
      `/api/stream?symbols=${encodeURIComponent(uniqueSymbols.join(","))}`,
    );

    es.onmessage = (event) => {
      try {
        const data: Record<string, ServerQuote> = JSON.parse(event.data);
        setQuotes((prev) => {
          const next = { ...prev };
          for (const [sym, raw] of Object.entries(data)) {
            next[sym] = mapQuote(raw, sym);
          }
          return next;
        });
      } catch {
        // parse error — ignore
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on error.
      // Only mark error if we never received data (still loading).
      setQuotes((prev) => {
        const next = { ...prev };
        for (const sym of uniqueSymbols) {
          if (next[sym]?.isLoading) {
            next[sym] = { ...next[sym], isLoading: false, isError: true };
          }
        }
        return next;
      });
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return quotes;
}

/** Single-symbol convenience wrapper — connects to the same SSE stream. */
export function useLiveSingleQuote(symbol: string, _refreshMs?: number) {
  const quotes = useLiveQuotes([symbol]);
  return quotes[symbol];
}
