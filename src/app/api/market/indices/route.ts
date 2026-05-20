import { NextResponse } from "next/server";

const YAHOO_SYMBOLS = [
  { symbol: "^NSEI", name: "NIFTY 50", key: "NIFTY50" },
  { symbol: "^BSESN", name: "SENSEX", key: "SENSEX" },
  { symbol: "^NSEBANK", name: "BANK NIFTY", key: "BANKNIFTY" },
];

export async function GET() {
  try {
    const symbols = YAHOO_SYMBOLS.map((s) => s.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 30 },
    });

    if (!res.ok) throw new Error("Yahoo API failed");
    const data = await res.json();
    const quotes = data?.quoteResponse?.result || [];

    const result = quotes.map((q: Record<string, unknown>, i: number) => ({
      symbol: YAHOO_SYMBOLS[i]?.key || q.symbol,
      name: YAHOO_SYMBOLS[i]?.name || q.shortName,
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      high: q.regularMarketDayHigh || 0,
      low: q.regularMarketDayLow || 0,
      open: q.regularMarketOpen || 0,
      prevClose: q.regularMarketPreviousClose || 0,
      volume: formatVolume(q.regularMarketVolume as number),
      timestamp: Date.now(),
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

function formatVolume(vol: number): string {
  if (!vol) return "0";
  if (vol >= 10000000) return `${(vol / 10000000).toFixed(1)}Cr`;
  if (vol >= 100000) return `${(vol / 100000).toFixed(1)}L`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return String(vol);
}
