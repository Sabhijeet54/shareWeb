import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "NIFTY";

  try {
    // NSE option chain (may need proxy in production)
    const nseUrl = `https://www.nseindia.com/api/option-chain-indices?symbol=${symbol}`;
    const res = await fetch(nseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error("NSE API failed");
    const data = await res.json();
    const records = data?.records?.data || [];

    const options = records.map((r: Record<string, Record<string, unknown>>) => ({
      strikePrice: r.strikePrice,
      expiryDate: r.expiryDate,
      ce: r.CE ? {
        oi: r.CE.openInterest || 0,
        oiChange: r.CE.changeinOpenInterest || 0,
        volume: r.CE.totalTradedVolume || 0,
        iv: r.CE.impliedVolatility || 0,
        ltp: r.CE.lastPrice || 0,
        change: r.CE.change || 0,
        bidPrice: r.CE.bidprice || 0,
        askPrice: r.CE.askPrice || 0,
      } : null,
      pe: r.PE ? {
        oi: r.PE.openInterest || 0,
        oiChange: r.PE.changeinOpenInterest || 0,
        volume: r.PE.totalTradedVolume || 0,
        iv: r.PE.impliedVolatility || 0,
        ltp: r.PE.lastPrice || 0,
        change: r.PE.change || 0,
        bidPrice: r.PE.bidprice || 0,
        askPrice: r.PE.askPrice || 0,
      } : null,
    }));

    return NextResponse.json(options);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
