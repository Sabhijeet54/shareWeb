import { NextResponse } from "next/server";

export async function GET() {
  try {
    const symbols = ["TATAMOTORS.NS", "ADANIENT.NS", "SBIN.NS", "COALINDIA.NS", "POWERGRID.NS", "M%26M.NS", "NTPC.NS", "BAJFINANCE.NS"].join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const quotes = (data?.quoteResponse?.result || [])
      .map((q: Record<string, unknown>) => ({
        symbol: (q.symbol as string)?.replace(".NS", ""),
        name: q.shortName || q.longName,
        price: q.regularMarketPrice || 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
        high: q.regularMarketDayHigh || 0,
        low: q.regularMarketDayLow || 0,
        open: q.regularMarketOpen || 0,
        prevClose: q.regularMarketPreviousClose || 0,
        volume: q.regularMarketVolume || 0,
        marketCap: Math.round((q.marketCap as number || 0) / 10000000),
        pe: q.trailingPE || 0,
        eps: q.epsTrailingTwelveMonths || 0,
        week52High: q.fiftyTwoWeekHigh || 0,
        week52Low: q.fiftyTwoWeekLow || 0,
        avgVolume: q.averageDailyVolume3Month || 0,
        dayRange: `${q.regularMarketDayLow}-${q.regularMarketDayHigh}`,
        yearRange: `${q.fiftyTwoWeekLow}-${q.fiftyTwoWeekHigh}`,
      }))
      .sort((a: { changePercent: number }, b: { changePercent: number }) => b.changePercent - a.changePercent);
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
