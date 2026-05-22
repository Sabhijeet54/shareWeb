// ─── Search API ───────────────────────────────────────────────────────────
// Searches for stocks/instruments from local symbol map.
// Provider: local data (temporary) → Upstox search (after verification).
//
// GET /api/search?q=reliance
// Response: { quotes: [{ symbol, shortname, longname, exchange }] }
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { SYMBOL_MAP } from "@/lib/symbolMap";
import { allInstruments } from "@/lib/marketData";
import { instrumentLoader } from "@/lib/instruments";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "";
  if (!query) {
    return NextResponse.json({ quotes: [] });
  }

  const q = query.toLowerCase();
  await instrumentLoader.ensureLoaded();

  // Search through all instruments and symbol map
  const results = allInstruments
    .filter((inst) => {
      const sym = inst.symbol.toLowerCase();
      const title = inst.title.toLowerCase();
      const subtitle = (inst.subtitle ?? "").toLowerCase();
      return sym.includes(q) || title.includes(q) || subtitle.includes(q);
    })
    .slice(0, 15)
    .map((inst) => ({
      symbol: inst.symbol,
      shortname: inst.title,
      longname: inst.title,
      exchange: inst.subtitle?.includes("BSE") ? "BSE" : "NSE",
      exchDisp: inst.subtitle ?? "NSE",
      quoteType: inst.subtitle?.includes("Index") ? "INDEX" : "EQUITY",
      industry: inst.sector ?? "",
      sector: inst.sector ?? "",
    }));

  // Also search SYMBOL_MAP for symbols not in instruments
  if (results.length < 15) {
    for (const [appSymbol] of Object.entries(SYMBOL_MAP)) {
      if (results.length >= 15) break;
      if (appSymbol.toLowerCase().includes(q)) {
        const exists = results.some((r) => r.symbol === appSymbol);
        if (!exists) {
          results.push({
            symbol: appSymbol,
            shortname: appSymbol,
            longname: appSymbol,
            exchange: "NSE",
            exchDisp: "NSE",
            quoteType: "EQUITY",
            industry: "",
            sector: "",
          });
        }
      }
    }
  }

  // Finally search dynamically loaded Upstox symbols for broader coverage
  if (results.length < 15) {
    const dynSymbols = [...instrumentLoader.getAllKeys().keys()];
    for (const sym of dynSymbols) {
      if (results.length >= 15) break;
      if (!sym.toLowerCase().includes(q)) continue;
      const exists = results.some((r) => r.symbol === sym);
      if (exists) continue;

      const local = allInstruments.find((i) => i.symbol === sym);
      results.push({
        symbol: sym,
        shortname: local?.title ?? sym,
        longname: local?.title ?? sym,
        exchange: sym.includes("SENSEX") ? "BSE" : "NSE",
        exchDisp: local?.subtitle ?? "NSE",
        quoteType: local?.subtitle?.includes("Index") ? "INDEX" : "EQUITY",
        industry: local?.sector ?? "",
        sector: local?.sector ?? "",
      });
    }
  }

  return NextResponse.json(
    { quotes: results },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
  );
}
