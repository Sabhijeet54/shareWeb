// ─── Options Chain API (Full) ────────────────────────────────────────────────
// Returns full option chain with all details.
// Provider: Upstox. All users share the same cached response.
//
// GET /api/options?symbol=NIFTY+50&date=29-May-2026&exchange=NSE
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/services/market";

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
    console.error("[Options API] Error:", String(err));
    return NextResponse.json(
      { error: "Failed to fetch option chain data" },
      { status: 502 },
    );
  }
}
