"use client";
// ─── Market Data Frontend Hooks ─────────────────────────────────────────────
// Reusable React hooks for fetching data from internal API routes.
// Hooks 1 & 2 use SSE streaming — no repeated HTTP polling.
// Hooks 3 & 4 are one-time fetches (no change needed).
//
// Architecture:
//   useLiveQuotes / useUpstoxLTP → EventSource('/api/stream') → DataPump → NSE
//   useOptionChain → /api/option-chain (polling, heavy payload)
//   useExpiryDates / useUpstoxChart → one-time fetch
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";

// ─── 1. Live LTP Hook (SSE) ─────────────────────────────────────────────────
// Streams lightweight LTP data via SSE instead of polling /api/quotes.

export function useUpstoxLTP(
  symbols: string[],
  _refreshMs?: number, // ignored — server controls interval
): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const symbolsKey = [...new Set(symbols)].sort().join(",");
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;

  useEffect(() => {
    const uniqueSymbols = [...new Set(symbolsRef.current)];
    if (uniqueSymbols.length === 0) return;

    const es = new EventSource(
      `/api/stream?symbols=${encodeURIComponent(uniqueSymbols.join(","))}`,
    );

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setPrices((prev) => {
          const next = { ...prev };
          for (const [sym, raw] of Object.entries(data)) {
            const q = raw as { regularMarketPrice?: number };
            if (q.regularMarketPrice != null && q.regularMarketPrice > 0) {
              next[sym] = q.regularMarketPrice;
            }
          }
          return next;
        });
      } catch {
        // parse error — ignore
      }
    };

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolsKey]);

  return prices;
}

// ─── 2. Option Chain Hook ────────────────────────────────────────────────────
// Fetches the clean option chain from /api/option-chain.

export interface CleanOption {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  change: number;
  changePct: number;
}

export interface OptionChainData {
  symbol: string;
  spotPrice: number;
  expiry: string;
  strikes: number[];
  calls: CleanOption[];
  puts: CleanOption[];
  availableExpiries: string[];
}

export function useOptionChain(
  symbol: string,
  expiry?: string,
  exchange = "NSE",
  refreshMs = 15000,
) {
  const [data, setData] = useState<OptionChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChain = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ symbol, exchange });
      if (expiry) params.set("expiry", expiry);
      const res = await fetch(`/api/option-chain?${params}&_t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [symbol, expiry, exchange]);

  useEffect(() => {
    fetchChain();
    const id = setInterval(fetchChain, refreshMs);
    return () => clearInterval(id);
  }, [fetchChain, refreshMs]);

  return { data, loading, error, refetch: fetchChain };
}

// ─── 3. Expiry Dates Hook ────────────────────────────────────────────────────
// Fetches available expiry dates from /api/expiry.

export function useExpiryDates(symbol: string, exchange = "NSE") {
  const [expiries, setExpiries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/expiry?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}`)
      .then((r) => r.json())
      .then((data) => setExpiries(data.expiries ?? []))
      .catch(() => setExpiries([]))
      .finally(() => setLoading(false));
  }, [symbol, exchange]);

  return { expiries, loading };
}

// ─── 4. Chart Data Hook ─────────────────────────────────────────────────────
// Fetches OHLCV candles from /api/chart (already supports Upstox).

export interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useUpstoxChart(
  symbol: string,
  interval: string,
  range: string,
) {
  const [bars, setBars] = useState<CandleBar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!symbol) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setIsError(false);
    setBars([]);

    fetch(
      `/api/chart?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error("no result");

        const timestamps: number[] = result.timestamp ?? [];
        const q = result.indicators?.quote?.[0] ?? {};
        const parsed: CandleBar[] = [];

        for (let i = 0; i < timestamps.length; i++) {
          const close = q.close?.[i];
          if (close == null || isNaN(close) || close === 0) continue;
          parsed.push({
            time: timestamps[i],
            open: q.open?.[i] ?? close,
            high: q.high?.[i] ?? close,
            low: q.low?.[i] ?? close,
            close,
            volume: q.volume?.[i] ?? 0,
          });
        }

        setBars(parsed);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setIsError(true);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [symbol, interval, range]);

  return { bars, isLoading, isError };
}
