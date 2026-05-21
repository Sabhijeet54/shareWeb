<<<<<<< Updated upstream
// GET /api/quote?symbols=RELIANCE.NS,TCS.NS,^NSEI
// Proxies Yahoo Finance — free, no API key required
=======
// ─── Multi-provider Quote API ──────────────────────────────────────────────
// Primary: Yahoo Finance v8 chart endpoint (no auth needed from server-side)
// Fallback: Finnhub (for symbols that have .US mapping)
//
// GET /api/quote?symbols=RELIANCE,TCS,HDFCBANK
// Response: { quoteResponse: { result: [...] } }
>>>>>>> Stashed changes

import { NextRequest, NextResponse } from "next/server";
import { toYahoo } from "@/lib/symbolMap";

<<<<<<< Updated upstream
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": "https://finance.yahoo.com",
  "Referer": "https://finance.yahoo.com/",
};

export async function GET(req: NextRequest) {
  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const fields = [
    "symbol", "shortName", "longName",
    "regularMarketPrice", "regularMarketChange", "regularMarketChangePercent",
    "regularMarketVolume", "regularMarketDayHigh", "regularMarketDayLow",
    "regularMarketOpen", "regularMarketPreviousClose",
    "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
    "marketCap", "trailingPE", "epsTrailingTwelveMonths",
  ].join(",");

  // Try v7 first, then v8 as fallback
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}&formatted=false&lang=en-US&region=US`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}&formatted=false&lang=en-US&region=US`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: HEADERS,
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json();
      const results = data?.quoteResponse?.result ?? [];

      if (results.length > 0) {
        return NextResponse.json(
          { quoteResponse: { result: results } },
          { headers: { "Cache-Control": "no-store, max-age=0" } }
        );
      }
    } catch {
      // try next url
    }
  }

  return NextResponse.json(
    { quoteResponse: { result: [] }, error: "Could not fetch from Yahoo Finance" },
    { status: 200, headers: { "Cache-Control": "no-store" } }
=======
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface YahooChartMeta {
  symbol?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketTime?: number;
  currency?: string;
  exchangeName?: string;
}

interface NormalizedQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  epsTrailingTwelveMonths: number;
}

async function fetchYahooQuote(appSymbol: string): Promise<NormalizedQuote | null> {
  try {
    const yahooSymbol = toYahoo(appSymbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d&includePrePost=false`;
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta: YahooChartMeta = result.meta ?? {};
    const timestamps: number[] = result.timestamp ?? [];
    const quotes = result.indicators?.quote?.[0] ?? {};
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const price = meta.regularMarketPrice ?? 0;
    const change = price - prevClose;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    // Derive open from first candle of current day
    const opens: number[] = quotes.open ?? [];
    const highs: number[] = quotes.high ?? [];
    const lows: number[] = quotes.low ?? [];
    const volumes: number[] = quotes.volume ?? [];

    // Get today's data  
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = Math.floor(todayStart.getTime() / 1000);
    let todayOpen = price;
    let todayHigh = meta.regularMarketDayHigh ?? price;
    let todayLow = meta.regularMarketDayLow ?? price;
    let todayVolume = meta.regularMarketVolume ?? 0;

    if (timestamps.length > 0) {
      const lastIdx = timestamps.length - 1;
      // If the last data point is from today
      if (timestamps[lastIdx] >= todayStartTs) {
        for (let i = 0; i < timestamps.length; i++) {
          if (timestamps[i] >= todayStartTs && opens[i] != null) {
            todayOpen = opens[i];
            break;
          }
        }
      } else {
        // Market closed: use last available candle data
        todayOpen = opens[lastIdx] ?? price;
        todayHigh = highs[lastIdx] ?? price;
        todayLow = lows[lastIdx] ?? price;
        todayVolume = volumes[lastIdx] ?? 0;
      }
    }

    return {
      symbol: appSymbol,
      shortName: meta.shortName ?? meta.longName ?? appSymbol,
      regularMarketPrice: price,
      regularMarketChange: parseFloat(change.toFixed(2)),
      regularMarketChangePercent: parseFloat(changePct.toFixed(2)),
      regularMarketVolume: todayVolume,
      regularMarketDayHigh: todayHigh,
      regularMarketDayLow: todayLow,
      regularMarketOpen: todayOpen,
      regularMarketPreviousClose: prevClose,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? 0,
      marketCap: 0, // chart endpoint doesn't return marketCap
      trailingPE: 0,
      epsTrailingTwelveMonths: 0,
    };
  } catch {
    return null;
  }
}

async function fetchFinnhubQuote(appSymbol: string): Promise<NormalizedQuote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(appSymbol)}&token=${key}`;
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return null;
    const d = await resp.json();
    if (!d || d.c === 0) return null;
    return {
      symbol: appSymbol,
      shortName: appSymbol,
      regularMarketPrice: d.c ?? 0,
      regularMarketChange: parseFloat(((d.c ?? 0) - (d.pc ?? 0)).toFixed(2)),
      regularMarketChangePercent: d.pc ? parseFloat((((d.c - d.pc) / d.pc) * 100).toFixed(2)) : 0,
      regularMarketVolume: 0,
      regularMarketDayHigh: d.h ?? 0,
      regularMarketDayLow: d.l ?? 0,
      regularMarketOpen: d.o ?? 0,
      regularMarketPreviousClose: d.pc ?? 0,
      fiftyTwoWeekHigh: 0,
      fiftyTwoWeekLow: 0,
      marketCap: 0,
      trailingPE: 0,
      epsTrailingTwelveMonths: 0,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quoteResponse: { result: [] } });
  }

  // Fetch all in parallel from Yahoo Finance
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const yahoo = await fetchYahooQuote(sym);
      if (yahoo && yahoo.regularMarketPrice > 0) return yahoo;
      // Fallback to Finnhub
      const finnhub = await fetchFinnhubQuote(sym);
      if (finnhub && finnhub.regularMarketPrice > 0) return finnhub;
      // Return stub so client doesn't break
      return {
        symbol: sym,
        shortName: sym,
        regularMarketPrice: 0,
        regularMarketChange: 0,
        regularMarketChangePercent: 0,
        regularMarketVolume: 0,
        regularMarketDayHigh: 0,
        regularMarketDayLow: 0,
        regularMarketOpen: 0,
        regularMarketPreviousClose: 0,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        marketCap: 0,
        trailingPE: 0,
        epsTrailingTwelveMonths: 0,
      } satisfies NormalizedQuote;
    })
  );

  const quotes = results.map((r) =>
    r.status === "fulfilled" ? r.value : null
  ).filter(Boolean);

  return NextResponse.json(
    { quoteResponse: { result: quotes } },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    }
>>>>>>> Stashed changes
  );
}
