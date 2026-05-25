// ─── Options Chain API (Full) ────────────────────────────────────────────────
// Returns full option chain with all details.
// Provider: Upstox. All users share the same cached response.
//
// GET /api/options?symbol=NIFTY+50&date=29-May-2026&exchange=NSE
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/services/market";
import { logEvent } from "@/lib/logger";

function toErrorDetails(err: unknown) {
  const e = err as { message?: string; response?: { status?: number; data?: unknown }; config?: { url?: string } };
  return {
    message: e?.message ?? String(err),
    upstreamStatus: e?.response?.status,
    upstreamBody: e?.response?.data,
    requestUrl: e?.config?.url,
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const dateParam = sp.get("date") ?? "";
  const exchange = (sp.get("exchange") ?? "NSE").toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const chainData = await getOptionChain(symbol, dateParam || undefined, exchange);

    return NextResponse.json(chainData, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (err) {
    const details = toErrorDetails(err);
    logEvent("error", "api.options.failed", { symbol, dateParam, exchange, ...details });
    return NextResponse.json(
      {
        error: "Upstream option chain request failed",
        symbol,
        exchange,
      },
      { status: 502 },
    );
  }
}
