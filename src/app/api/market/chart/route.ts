import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "RELIANCE";
  const interval = searchParams.get("interval") || "1d";
  const range = searchParams.get("range") || "1mo";
  const yahooSymbol = symbol.includes("^") ? symbol : `${symbol}.NS`;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");

    const timestamps = result.timestamp || [];
    const ohlc = result.indicators?.quote?.[0] || {};
    const candles = timestamps.map((t: number, i: number) => ({
      time: t * 1000,
      open: ohlc.open?.[i] || 0,
      high: ohlc.high?.[i] || 0,
      low: ohlc.low?.[i] || 0,
      close: ohlc.close?.[i] || 0,
      volume: ohlc.volume?.[i] || 0,
    })).filter((c: { open: number }) => c.open > 0);

    return NextResponse.json(candles);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
