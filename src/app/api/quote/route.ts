// GET /api/quote?symbols=RELIANCE.NS,TCS.NS,^NSEI
// Proxies Yahoo Finance — free, no API key required

import { NextRequest, NextResponse } from "next/server";

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
  );
}
