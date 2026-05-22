// ─── Search API ───────────────────────────────────────────────────────────
// Real instrument master search from centralized backend cache.
// Provider: Upstox master contracts (NSE/BSE/MCX), cached in memory.
//
// GET /api/search?q=NIFTY+22300+CE
// Response: { quotes: [{ symbol, instrumentKey, quoteType, expiry, strike, ... }] }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { instrumentManager } from "@/lib/instruments";
import { logEvent } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const query = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

  if (!query) {
    return NextResponse.json({ quotes: [] });
  }

  try {
    await instrumentManager.ensureLoaded();
    const results = instrumentManager.search(query, limit);
    return NextResponse.json(
      { quotes: results },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } },
    );
  } catch (err) {
    logEvent("error", "api.search.failed", { query, limit, error: String(err) });
    return NextResponse.json({ quotes: [], error: "Search temporarily unavailable" }, { status: 200 });
  }
}
