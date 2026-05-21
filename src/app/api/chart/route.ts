// GET /api/chart?symbol=AAPL&interval=5m&range=1d
// Proxies Finnhub stock candles and normalizes them to the chart shape used by the app.

import { NextRequest, NextResponse } from "next/server";

type FinnhubCandleResponse = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  s?: string;
  t?: number[];
  v?: number[];
};

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const TOKEN =
  process.env.FINNHUB_API_KEY ??
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

const INTERVAL_TO_RESOLUTION: Record<string, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "60m": "60",
  "1d": "D",
  "1wk": "W",
  "1mo": "M",
};

const RANGE_TO_SECONDS: Record<string, number> = {
  "1d": 24 * 60 * 60,
  "5d": 5 * 24 * 60 * 60,
  "1mo": 31 * 24 * 60 * 60,
  "6mo": 183 * 24 * 60 * 60,
  "2y": 2 * 365 * 24 * 60 * 60,
  "5y": 5 * 365 * 24 * 60 * 60,
};

export async function GET(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { chart: { result: null }, error: "Finnhub API token is missing" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  const interval = req.nextUrl.searchParams.get("interval") ?? "5m";
  const range = req.nextUrl.searchParams.get("range") ?? "1d";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const to = Math.floor(Date.now() / 1000);
  const from = to - (RANGE_TO_SECONDS[range] ?? RANGE_TO_SECONDS["1d"]);
  const resolution = INTERVAL_TO_RESOLUTION[interval] ?? "5";
  const url = new URL(`${FINNHUB_BASE_URL}/stock/candle`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("resolution", resolution);
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  url.searchParams.set("token", TOKEN);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Finnhub candle request failed");

    const data = (await res.json()) as FinnhubCandleResponse;
    if (data.s !== "ok" || !data.t?.length) {
      return NextResponse.json(
        { chart: { result: null }, error: "Chart data unavailable" },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      {
        chart: {
          result: [
            {
              timestamp: data.t,
              indicators: {
                quote: [
                  {
                    open: data.o ?? [],
                    high: data.h ?? [],
                    low: data.l ?? [],
                    close: data.c ?? [],
                    volume: data.v ?? [],
                  },
                ],
              },
            },
          ],
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { chart: { result: null }, error: "Chart data unavailable" },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }
}
