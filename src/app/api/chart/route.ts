// GET /api/chart?symbol=RELIANCE.NS&interval=5m&range=1d
// Proxies Yahoo Finance chart — free, no API key

import { NextRequest, NextResponse } from "next/server";

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

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

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
  );
}
