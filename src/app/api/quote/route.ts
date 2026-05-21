// GET /api/quote?symbols=AAPL,MSFT,NVDA
// Proxies Finnhub quote + metric data and normalizes it to the app quote shape.

import { NextRequest, NextResponse } from "next/server";

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubMetrics = {
  metric?: Record<string, number | string | undefined>;
};

type NormalizedQuote = {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap?: number;
  trailingPE?: number;
  epsTrailingTwelveMonths?: number;
  regularMarketTime?: number;
};

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const TOKEN =
  process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

function getNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

async function fetchJson<T>(
  path: string,
  params: Record<string, string>,
  token: string,
): Promise<T | null> {
  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("token", token);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getQuote(
  symbol: string,
  token: string,
): Promise<NormalizedQuote | null> {
  const [quote] = await Promise.all([
    fetchJson<FinnhubQuote>("/quote", { symbol }, token),
    // fetchJson<FinnhubMetrics>(
    //   "/stock/metric",
    //   { symbol, metric: "all" },
    //   token,
    // ),
  ]);
  const metrics: any = null;

  if (!quote || !quote.c || quote.c <= 0) return null;

  const metric = metrics?.metric ?? {};
  const marketCapMillion = getNumber(metric.marketCapitalization);
  const averageVolumeMillion = getNumber(metric["10DayAverageTradingVolume"]);

  return {
    symbol,
    shortName: symbol,
    longName: symbol,
    regularMarketPrice: quote.c ?? 0,
    regularMarketChange: quote.d ?? (quote.c ?? 0) - (quote.pc ?? 0),
    regularMarketChangePercent: quote.dp ?? 0,
    regularMarketVolume: averageVolumeMillion
      ? averageVolumeMillion * 1_000_000
      : 0,
    regularMarketDayHigh: quote.h ?? 0,
    regularMarketDayLow: quote.l ?? 0,
    regularMarketOpen: quote.o ?? 0,
    regularMarketPreviousClose: quote.pc ?? 0,
    fiftyTwoWeekHigh: getNumber(metric["52WeekHigh"]) ?? 0,
    fiftyTwoWeekLow: getNumber(metric["52WeekLow"]) ?? 0,
    marketCap: marketCapMillion ? marketCapMillion * 1_000_000 : undefined,
    trailingPE:
      getNumber(metric.peNormalizedAnnual) ??
      getNumber(metric.peBasicExclExtraTTM) ??
      getNumber(metric.peTTM),
    epsTrailingTwelveMonths:
      getNumber(metric.epsNormalizedAnnual) ??
      getNumber(metric.epsBasicExclExtraItemsTTM) ??
      getNumber(metric.epsTTM),
    regularMarketTime: quote.t,
  };
}

export async function GET(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { quoteResponse: { result: [] }, error: "Finnhub API token is missing" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const symbols = req.nextUrl.searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json({ error: "symbols required" }, { status: 400 });
  }

  const requestedSymbols = [
    ...new Set(
      symbols
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean),
    ),
  ];

  const settled = await Promise.allSettled(
    requestedSymbols.map((symbol) => getQuote(symbol, TOKEN)),
  );

  const results = settled
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter((quote): quote is NormalizedQuote => quote !== null);

  return NextResponse.json(
    { quoteResponse: { result: results } },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
