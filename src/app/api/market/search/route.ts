import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0&region=IN`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const quotes = (data?.quotes || [])
      .filter((item: Record<string, string>) => item.exchange === "NSI" || item.exchange === "BSE")
      .map((item: Record<string, string>) => ({
        symbol: item.symbol?.replace(".NS", "").replace(".BO", ""),
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange === "BSE" ? "BSE" : "NSE",
      }));

    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
