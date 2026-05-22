// ─── Live Quotes API ─────────────────────────────────────────────────────────
// Lightweight endpoint returning LTP and basic data for multiple symbols.
// Provider: Upstox. All users share the same cached response.
//
// GET /api/quotes?symbols=RELIANCE,TCS,NIFTY+50
// Response: { quotes: { "RELIANCE": 1359.5, "TCS": 2319.2, ... } }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/services/market";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  try {
    const data = await getQuotes(symbols);
    const result: Record<string, number> = {};
    for (const q of data) {
      if (q.regularMarketPrice > 0) {
        result[q.symbol] = q.regularMarketPrice;
      }
    }

    return NextResponse.json(
      { quotes: result },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } },
    );
  } catch (err) {
    console.error("[Quotes API] Error:", String(err));
    return NextResponse.json({ quotes: {} }, { status: 500 });
  }
}
