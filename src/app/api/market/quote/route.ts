import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "RELIANCE";
  const yahooSymbol = `${symbol}.NS`;

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbol}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 15 },
    });

    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0];
    if (!q) throw new Error("No data");

    return NextResponse.json({
      symbol,
      name: q.shortName || q.longName || symbol,
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changePercent: q.regularMarketChangePercent || 0,
      high: q.regularMarketDayHigh || 0,
      low: q.regularMarketDayLow || 0,
      open: q.regularMarketOpen || 0,
      prevClose: q.regularMarketPreviousClose || 0,
      volume: q.regularMarketVolume || 0,
      marketCap: Math.round((q.marketCap || 0) / 10000000),
      pe: q.trailingPE || 0,
      eps: q.epsTrailingTwelveMonths || 0,
      week52High: q.fiftyTwoWeekHigh || 0,
      week52Low: q.fiftyTwoWeekLow || 0,
      avgVolume: q.averageDailyVolume3Month || 0,
      dayRange: `${q.regularMarketDayLow}-${q.regularMarketDayHigh}`,
      yearRange: `${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}`,
    });
  } catch {
    return NextResponse.json(null, { status: 500 });
  }
}
