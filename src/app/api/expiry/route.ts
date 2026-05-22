// ─── Expiry Dates API ────────────────────────────────────────────────────────
// Returns available expiry dates for a given F&O instrument.
// Provider: Upstox.
//
// GET /api/expiry?symbol=NIFTY+50
// Response: { symbol, expiries: ["29-May-2026", "05-Jun-2026", ...] }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getExpiryDates } from "@/services/market";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const expiries = await getExpiryDates(symbol);
    return NextResponse.json({ symbol, expiries });
  } catch (err) {
    console.warn("[Expiry API] Error:", String(err));

    // Fallback: generate expiry dates (next 4 Thursdays)
    const expiries: string[] = [];
    const today = new Date();
    const d = new Date(today);
    for (let i = 0; i < 60 && expiries.length < 4; i++) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 4) expiries.push(d.toISOString().slice(0, 10));
    }
    return NextResponse.json({ symbol, expiries });
  }
}
