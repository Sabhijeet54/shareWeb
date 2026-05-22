// ─── Quote API ──────────────────────────────────────────────────────────────
// Centralized quote endpoint. Provider: Upstox.
// All users share the same cached response via CacheManager.
//
// GET /api/quote?symbols=RELIANCE,TCS,HDFCBANK
// Response: { quoteResponse: { result: [...] } }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/services/market";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return NextResponse.json({ quoteResponse: { result: [] } });
  }

  try {
    const results = await getQuotes(symbols);
    return NextResponse.json(
      { quoteResponse: { result: results } },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } },
    );
  } catch (err) {
    console.error("[Quote API] Error:", String(err));
    return NextResponse.json(
      { quoteResponse: { result: [] }, error: String(err) },
      { status: 500 },
    );
  }
}
