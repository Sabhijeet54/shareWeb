"use client";

import { useEffect, useRef, useState } from "react";

export type OHLCVBar = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type UseChartDataResult = {
  bars: OHLCVBar[];
  isLoading: boolean;
  isError: boolean;
};

// Fetches chart data from internal /api/chart — never calls external APIs directly.
export function useChartData(
  symbol: string,
  interval: string,
  range: string,
): UseChartDataResult {
  const [bars, setBars] = useState<OHLCVBar[]>([]);
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
        const opens: number[] = q.open ?? [];
        const highs: number[] = q.high ?? [];
        const lows: number[] = q.low ?? [];
        const closes: number[] = q.close ?? [];
        const volumes: number[] = q.volume ?? [];

        const parsed: OHLCVBar[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (
            closes[i] == null ||
            isNaN(closes[i]) ||
            closes[i] === 0
          )
            continue;
          parsed.push({
            time: timestamps[i],
            open: opens[i] ?? closes[i],
            high: highs[i] ?? closes[i],
            low: lows[i] ?? closes[i],
            close: closes[i],
            volume: volumes[i] ?? 0,
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
