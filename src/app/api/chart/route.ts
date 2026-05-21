<<<<<<< Updated upstream
// GET /api/chart?symbol=RELIANCE.NS&interval=5m&range=1d
// Proxies Yahoo Finance chart — free, no API key
=======
// ─── Multi-provider Chart API ─────────────────────────────────────────────
// Primary: Yahoo Finance v8 chart
// Fallback: Finnhub candle endpoint
//
// GET /api/chart?symbol=RELIANCE&interval=5m&range=1d
// Response: { chart: { result: [{ timestamp, indicators: { quote: [{ open, high, low, close, volume }] } }] } }
>>>>>>> Stashed changes

import { NextRequest, NextResponse } from "next/server";
import { toYahoo, CHART_INTERVALS } from "@/lib/symbolMap";

<<<<<<< Updated upstream
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/",
};

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const interval = req.nextUrl.searchParams.get("interval") ?? "5m";
  const range = req.nextUrl.searchParams.get("range") ?? "1d";
=======
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Map our canonical intervals to Yahoo Finance intervals */
function toYahooInterval(interval: string): string {
  const map: Record<string, string> = {
    "1":  "1m",  "5":  "5m",  "15": "15m", "30": "30m",
    "60": "1h",  "D":  "1d",  "W":  "1wk", "M":  "1mo",
    "1m": "1m",  "5m": "5m",  "15m":"15m", "30m":"30m",
    "1h": "1h",  "1d": "1d",  "1wk":"1wk", "1mo":"1mo",
  };
  return map[interval] ?? "1d";
}

/** Map our canonical intervals to sensible default ranges */
function defaultRange(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1d",   "5m": "5d",   "15m": "5d",  "30m": "1mo",
    "1h": "1mo",  "1d": "6mo",  "1wk": "2y",  "1mo": "10y",
    "1": "1d",    "5": "5d",    "15": "5d",   "30": "1mo",
    "60": "1mo",  "D": "6mo",   "W": "2y",    "M": "10y",
  };
  return map[interval] ?? "6mo";
}

/** Map Finnhub resolution */
function toFinnhubResolution(interval: string): string {
  const map: Record<string, string> = {
    "1m": "1", "5m": "5", "15m": "15", "30m": "30",
    "1h": "60", "1d": "D", "1wk": "W", "1mo": "M",
    "1": "1", "5": "5", "15": "15", "30": "30",
    "60": "60", "D": "D", "W": "W", "M": "M",
  };
  return map[interval] ?? "D";
}

async function fetchYahooChart(appSymbol: string, interval: string, range?: string) {
  const yahooSymbol = toYahoo(appSymbol);
  const yInterval = toYahooInterval(interval);
  const yRange = range || defaultRange(interval);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yInterval}&range=${yRange}&includePrePost=false`;

  const resp = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.chart ?? null;
}

async function fetchFinnhubCandles(appSymbol: string, interval: string, range?: string) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const resolution = toFinnhubResolution(interval);

  // Calculate from/to timestamps based on range
  const now = Math.floor(Date.now() / 1000);
  const rangeMap: Record<string, number> = {
    "1d": 86400, "5d": 432000, "1mo": 2592000, "3mo": 7776000,
    "6mo": 15552000, "1y": 31536000, "2y": 63072000, "5y": 157680000,
    "10y": 315360000, "max": 631152000,
  };
  const r = range || defaultRange(interval);
  const from = now - (rangeMap[r] || 15552000);

  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(appSymbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${key}`;
  const resp = await fetch(url, { cache: "no-store" });
  if (!resp.ok) return null;
  const d = await resp.json();
  if (d.s === "no_data" || !d.t?.length) return null;

  // Convert to Yahoo format
  return {
    result: [{
      timestamp: d.t,
      indicators: {
        quote: [{
          open: d.o,
          high: d.h,
          low: d.l,
          close: d.c,
          volume: d.v,
        }],
      },
    }],
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const interval = sp.get("interval") ?? sp.get("resolution") ?? "D";
  const range = sp.get("range") ?? undefined;
>>>>>>> Stashed changes

  if (!symbol) {
    return NextResponse.json({ chart: { result: [] } }, { status: 400 });
  }

<<<<<<< Updated upstream
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplits`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplits`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json();
      const result = data?.chart?.result?.[0];

      if (result?.timestamp?.length > 0) {
        return NextResponse.json(data, {
          headers: { "Cache-Control": "no-store, max-age=0" },
        });
      }
    } catch {
      // try next url
    }
  }

  return NextResponse.json(
    { chart: { result: null }, error: "Chart data unavailable" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
=======
  // Check if interval is valid
  const validIntervals = [...CHART_INTERVALS.map((i) => i.value), "1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"];
  if (!validIntervals.includes(interval)) {
    return NextResponse.json(
      { chart: { result: [] }, error: `Invalid interval: ${interval}` },
      { status: 400 }
    );
  }

  // Try Yahoo Finance first
  const yahoo = await fetchYahooChart(symbol, interval, range);
  if (yahoo?.result?.[0]?.timestamp?.length) {
    return NextResponse.json(
      { chart: yahoo },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } }
    );
  }

  // Fallback to Finnhub
  const finnhub = await fetchFinnhubCandles(symbol, interval, range);
  if (finnhub?.result?.[0]?.timestamp?.length) {
    return NextResponse.json(
      { chart: finnhub },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } }
    );
  }

  // No data from any provider
  return NextResponse.json(
    { chart: { result: [] }, error: "No chart data available" },
    { status: 200 }
>>>>>>> Stashed changes
  );
}
