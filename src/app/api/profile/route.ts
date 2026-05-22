// ─── Company Profile API ──────────────────────────────────────────────────
// Returns company profile information.
// Provider: Upstox.
//
// GET /api/profile?symbol=RELIANCE
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/services/market";
import { allInstruments } from "@/lib/marketData";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    // Get live quote data
    const quotes = await getQuotes([symbol]);
    const quote = quotes[0];

    // Find instrument metadata
    const instrument = allInstruments.find((i) => i.symbol === symbol);

    const profile = {
      symbol,
      name: quote?.shortName ?? instrument?.title ?? symbol,
      shortName: quote?.shortName ?? symbol,
      exchange: "NSE",
      currency: "INR",
      sector: instrument?.sector ?? "",
      industry: "",
      website: "",
      description: "",
      country: "India",
      city: "",
      employees: 0,

      // Financial data from quote
      marketCap: quote?.marketCap ?? 0,
      pe: quote?.trailingPE ?? 0,
      forwardPE: 0,
      eps: quote?.epsTrailingTwelveMonths ?? 0,
      bookValue: 0,
      priceToBook: 0,
      dividendYield: 0,
      dividendRate: 0,
      beta: 0,
      revenue: 0,
      revenueGrowth: 0,
      grossMargin: 0,
      operatingMargin: 0,
      profitMargin: 0,
      returnOnEquity: 0,
      debtToEquity: 0,
      currentRatio: 0,
      freeCashflow: 0,
      targetMeanPrice: 0,
      targetHighPrice: 0,
      targetLowPrice: 0,
      recommendationKey: "",
      numberOfAnalystOpinions: 0,

      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? 0,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? 0,
      fiftyDayAverage: 0,
      twoHundredDayAverage: 0,
      averageVolume: 0,
      averageVolume10Day: 0,
    };

    return NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 },
    );
  }
}
