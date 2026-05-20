// GET /api/search?q=reliance
// Proxies Yahoo Finance search autocomplete — free, no API key

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q || q.length < 1) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0&listsCount=0&enableFuzzyQuery=true&region=IN&lang=en-IN`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json({ quotes: [] });
    }

    const data = await res.json();
    return NextResponse.json({
      quotes: (data?.quotes ?? []).filter(
        (q: { quoteType?: string }) =>
          q.quoteType === "EQUITY" ||
          q.quoteType === "INDEX" ||
          q.quoteType === "CURRENCY" ||
          q.quoteType === "CRYPTOCURRENCY" ||
          q.quoteType === "FUTURE",
      ),
    });
  } catch {
    return NextResponse.json({ quotes: [] });
  }
}
