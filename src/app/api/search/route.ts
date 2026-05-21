// ─── Multi-provider Search API ────────────────────────────────────────────
// Primary: Yahoo Finance search (no auth needed, supports Indian stocks)
// GET /api/search?q=reliance
// Response: { quotes: [{ symbol, shortname, longname, exchange, exchDisp }] }

import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function searchYahoo(query: string) {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&quotesCount=15&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;
  const resp = await fetch(url, {
    headers: { "User-Agent": UA },
    next: { revalidate: 60 },
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.quotes ?? null;
}

async function searchFinnhub(query: string) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${key}`;
  const resp = await fetch(url, { next: { revalidate: 60 } });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data?.result?.length) return null;
  return data.result.map((r: { symbol: string; description: string; type: string }) => ({
    symbol: r.symbol,
    shortname: r.description,
    longname: r.description,
    exchange: r.type ?? "US",
    exchDisp: "Finnhub",
  }));
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!query) {
    return NextResponse.json({ quotes: [] });
  }

  // Try Yahoo first
  const yahoo = await searchYahoo(query);
  if (yahoo?.length) {
    // Normalize to consistent shape and prioritize Indian stocks
    const results = yahoo.map((q: {
      symbol: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      exchDisp?: string;
      quoteType?: string;
      industry?: string;
      sector?: string;
    }) => {
      // Strip .NS suffix for app-internal symbol
      const rawSymbol = q.symbol ?? "";
      const appSymbol = rawSymbol.endsWith(".NS")
        ? rawSymbol.replace(/\.NS$/, "")
        : rawSymbol.endsWith(".BO")
          ? rawSymbol.replace(/\.BO$/, "")
          : rawSymbol;
      return {
        symbol: appSymbol,
        yahooSymbol: rawSymbol,
        shortname: q.shortname ?? q.longname ?? appSymbol,
        longname: q.longname ?? q.shortname ?? appSymbol,
        exchange: q.exchange ?? "",
        exchDisp: q.exchDisp ?? q.exchange ?? "",
        quoteType: q.quoteType ?? "EQUITY",
        industry: q.industry ?? "",
        sector: q.sector ?? "",
      };
    });

    // Sort: NSE first, then BSE, then others
    results.sort((a: { exchange: string }, b: { exchange: string }) => {
      const order = (e: string) => {
        if (e === "NSI" || e === "NSE") return 0;
        if (e === "BSE" || e === "BOM") return 1;
        return 2;
      };
      return order(a.exchange) - order(b.exchange);
    });

    return NextResponse.json(
      { quotes: results },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  // Fallback to Finnhub
  const finnhub = await searchFinnhub(query);
  if (finnhub?.length) {
    return NextResponse.json(
      { quotes: finnhub },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  }

  return NextResponse.json({ quotes: [] });
}
