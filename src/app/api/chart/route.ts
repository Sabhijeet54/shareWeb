// ─── Chart API ──────────────────────────────────────────────────────────────
// Returns OHLCV candle data for charting.
// Provider: Upstox (historical + intraday candles).
// All users share the same cached response.
//
// GET /api/chart?symbol=RELIANCE&interval=5m&range=1d
// Response: { chart: { result: [{ timestamp, indicators: { quote: [{ open, high, low, close, volume }] } }] } }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { CHART_INTERVALS } from "@/lib/symbolMap";
import { getChartData } from "@/services/market";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const interval = sp.get("interval") ?? sp.get("resolution") ?? "1d";
  const range = sp.get("range") ?? undefined;

  if (!symbol) {
    return NextResponse.json({ chart: { result: [] } }, { status: 400 });
  }

  // Validate interval
  const validIntervals = [
    ...CHART_INTERVALS.map((i) => i.value),
    "1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo",
  ];
  if (!validIntervals.includes(interval)) {
    return NextResponse.json(
      { chart: { result: [] }, error: `Invalid interval: ${interval}` },
      { status: 400 },
    );
  }

  try {
    const candles = await getChartData(symbol, interval, range);

    if (candles.length === 0) {
      return NextResponse.json({ chart: { result: [] } });
    }

    const result = {
      result: [
        {
          meta: { symbol },
          timestamp: candles.map((c) => c.time),
          indicators: {
            quote: [
              {
                open: candles.map((c) => c.open),
                high: candles.map((c) => c.high),
                low: candles.map((c) => c.low),
                close: candles.map((c) => c.close),
                volume: candles.map((c) => c.volume),
              },
            ],
          },
        },
      ],
    };

    return NextResponse.json(
      { chart: result },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } },
    );
  } catch (err) {
    console.error("[Chart API] Error:", String(err));
    return NextResponse.json(
      { chart: { result: [] }, error: "No chart data available" },
      { status: 200 },
    );
  }
}
