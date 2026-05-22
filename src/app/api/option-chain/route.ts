// ─── Option Chain API ────────────────────────────────────────────────────────
// Returns a clean, filtered option chain response.
// Provider: Upstox. All users share the same cached response.
//
// GET /api/option-chain?symbol=NIFTY+50&expiry=29-May-2026
// Response: { symbol, spotPrice, expiry, strikes, calls, puts, availableExpiries }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/services/market";
import { logEvent } from "@/lib/logger";

interface CleanOption {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  change: number;
  changePct: number;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const expiry = sp.get("expiry") ?? "";
  const strikeParam = sp.get("strike") ?? "";
  const typeParam = sp.get("type") ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const chainData = await getOptionChain(symbol, expiry || undefined);

    if (!chainData || chainData.chain.length === 0) {
      return NextResponse.json(
        { error: "No option chain data available", symbol, strikes: [], calls: [], puts: [], availableExpiries: [] },
        { status: 200 },
      );
    }

    let filteredChain = chainData.chain;

    // Filter by strike if specified
    if (strikeParam) {
      const targetStrike = Number(strikeParam);
      if (!isNaN(targetStrike)) {
        filteredChain = filteredChain.filter((row) => row.strike === targetStrike);
      }
    }

    // Extract calls and puts
    const calls: CleanOption[] = filteredChain.map((row) => ({
      strike: row.strike,
      lastPrice: row.ce.premium,
      bid: row.ce.bid,
      ask: row.ce.ask,
      volume: row.ce.volume,
      openInterest: row.ce.oi,
      impliedVolatility: row.ce.iv,
      inTheMoney: row.ce.itm,
      change: row.ce.change,
      changePct: row.ce.changePct,
    }));

    const puts: CleanOption[] = filteredChain.map((row) => ({
      strike: row.strike,
      lastPrice: row.pe.premium,
      bid: row.pe.bid,
      ask: row.pe.ask,
      volume: row.pe.volume,
      openInterest: row.pe.oi,
      impliedVolatility: row.pe.iv,
      inTheMoney: row.pe.itm,
      change: row.pe.change,
      changePct: row.pe.changePct,
    }));

    const strikes = filteredChain.map((row) => row.strike);

    const response: Record<string, unknown> = {
      symbol,
      spotPrice: chainData.spotPrice,
      expiry: expiry || "nearest",
      strikes,
      availableExpiries: chainData.expirationDates,
    };

    if (!typeParam || typeParam.toUpperCase() === "CE") {
      response.calls = calls;
    }
    if (!typeParam || typeParam.toUpperCase() === "PE") {
      response.puts = puts;
    }

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
  } catch (err) {
    logEvent("error", "api.option_chain.failed", { symbol, expiry, error: String(err) });
    return NextResponse.json(
      { error: "Failed to fetch option chain", symbol, strikes: [], calls: [], puts: [], availableExpiries: [] },
      { status: 200 },
    );
  }
}
