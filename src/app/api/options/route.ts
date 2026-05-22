// ─── Options Chain API (Full) ────────────────────────────────────────────────
// Returns full option chain with all details.
// Provider: Upstox. All users share the same cached response.
//
// GET /api/options?symbol=NIFTY+50&date=29-May-2026&exchange=NSE
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/services/market";
import { logEvent } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const dateParam = sp.get("date") ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const chainData = await getOptionChain(symbol, dateParam || undefined);

    return NextResponse.json(chainData, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (err) {
    logEvent("error", "api.options.failed", { symbol, dateParam, error: String(err) });
    return NextResponse.json(
      {
        symbol,
        underlyingName: symbol,
        spotPrice: 0,
        atmStrike: 0,
        pcr: 0,
        maxPainStrike: 0,
        expiryStr: "",
        expirationDates: [],
        chain: [],
        totalCeOI: 0,
        totalPeOI: 0,
        exchange: "NSE",
        synthetic: false,
        error: "Temporary upstream issue. Showing empty chain.",
      },
      { status: 200 },
    );
  }
}
