// GET /api/search?q=reliance
// Proxies Finnhub symbol search.

import { NextRequest, NextResponse } from "next/server";

type FinnhubSearchResult = {
  description?: string;
  displaySymbol?: string;
  symbol?: string;
  type?: string;
};

type FinnhubSearchResponse = {
  result?: FinnhubSearchResult[];
};

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const TOKEN =
  process.env.FINNHUB_API_KEY ??
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");

  if (!q || q.length < 1) {
    return NextResponse.json({ quotes: [] });
  }

  if (!TOKEN) {
    return NextResponse.json(
      { quotes: [], error: "Finnhub API token is missing" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const url = new URL(`${FINNHUB_BASE_URL}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("token", TOKEN);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ quotes: [] });
    }

    const data = (await res.json()) as FinnhubSearchResponse;
    return NextResponse.json({
      quotes: (data.result ?? []).slice(0, 8).map((item) => ({
        symbol: item.symbol ?? item.displaySymbol ?? "",
        shortname: item.description ?? item.displaySymbol ?? item.symbol ?? "",
        longname: item.description ?? item.displaySymbol ?? item.symbol ?? "",
        exchange: item.type ?? "",
      })).filter((item) => item.symbol),
    });
  } catch {
    return NextResponse.json({ quotes: [] });
  }
}
