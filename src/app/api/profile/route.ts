// ─── Company Profile API ──────────────────────────────────────────────────
// Uses Yahoo Finance quoteSummary endpoint for detailed company info
// GET /api/profile?symbol=RELIANCE

import { NextRequest, NextResponse } from "next/server";
import { toYahoo } from "@/lib/symbolMap";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const yahooSymbol = toYahoo(symbol);
  const modules = [
    "assetProfile",
    "summaryProfile",
    "financialData",
    "defaultKeyStatistics",
    "summaryDetail",
    "price",
    "earningsTrend",
  ].join(",");

  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${modules}`;

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 300 },
    });
    if (!resp.ok) {
      return NextResponse.json(
        { error: `Yahoo returned ${resp.status}` },
        { status: resp.status }
      );
    }
    const data = await resp.json();
    const r = data?.quoteSummary?.result?.[0];
    if (!r) {
      return NextResponse.json({ error: "No profile data" }, { status: 404 });
    }

    const ap = r.assetProfile ?? {};
    const fd = r.financialData ?? {};
    const ks = r.defaultKeyStatistics ?? {};
    const sd = r.summaryDetail ?? {};
    const pr = r.price ?? {};

    const profile = {
      symbol,
      yahooSymbol,
      name: pr.longName ?? pr.shortName ?? symbol,
      shortName: pr.shortName ?? symbol,
      exchange: pr.exchangeName ?? "",
      currency: pr.currency ?? "INR",
      sector: ap.sector ?? "",
      industry: ap.industry ?? "",
      website: ap.website ?? "",
      description: ap.longBusinessSummary ?? "",
      country: ap.country ?? "India",
      city: ap.city ?? "",
      employees: ap.fullTimeEmployees ?? 0,

      // ── Financial data ──
      marketCap: pr.marketCap?.raw ?? sd.marketCap?.raw ?? 0,
      pe: sd.trailingPE?.raw ?? 0,
      forwardPE: sd.forwardPE?.raw ?? ks.forwardPE?.raw ?? 0,
      eps: ks.trailingEps?.raw ?? 0,
      bookValue: ks.bookValue?.raw ?? 0,
      priceToBook: ks.priceToBook?.raw ?? 0,
      dividendYield: sd.dividendYield?.raw ?? 0,
      dividendRate: sd.dividendRate?.raw ?? 0,
      beta: ks.beta?.raw ?? sd.beta?.raw ?? 0,
      revenue: fd.totalRevenue?.raw ?? 0,
      revenueGrowth: fd.revenueGrowth?.raw ?? 0,
      grossMargin: fd.grossMargins?.raw ?? 0,
      operatingMargin: fd.operatingMargins?.raw ?? 0,
      profitMargin: fd.profitMargins?.raw ?? 0,
      returnOnEquity: fd.returnOnEquity?.raw ?? 0,
      debtToEquity: fd.debtToEquity?.raw ?? 0,
      currentRatio: fd.currentRatio?.raw ?? 0,
      freeCashflow: fd.freeCashflow?.raw ?? 0,
      targetMeanPrice: fd.targetMeanPrice?.raw ?? 0,
      targetHighPrice: fd.targetHighPrice?.raw ?? 0,
      targetLowPrice: fd.targetLowPrice?.raw ?? 0,
      recommendationKey: fd.recommendationKey ?? "",
      numberOfAnalystOpinions: fd.numberOfAnalystOpinions?.raw ?? 0,

      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh?.raw ?? 0,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow?.raw ?? 0,
      fiftyDayAverage: sd.fiftyDayAverage?.raw ?? 0,
      twoHundredDayAverage: sd.twoHundredDayAverage?.raw ?? 0,
      averageVolume: sd.averageVolume?.raw ?? 0,
      averageVolume10Day: sd.averageVolume10days?.raw ?? 0,
    };

    return NextResponse.json(
      { profile },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
