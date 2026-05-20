import { NextResponse } from "next/server";

export async function GET() {
  // Sector data derived from sector index ETFs
  try {
    const symbols = "^CNXIT,^CNXBANK,^CNXPHARMA,^CNXAUTO,^CNXENERGY,^CNXMETAL,^CNXFMCG,^CNXREALTY,^CNXINFRA,^CNXPSUBANK";
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 120 },
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const names = ["IT", "Banking", "Pharma", "Auto", "Energy", "Metal", "FMCG", "Realty", "Infra", "PSU Bank"];
    const quotes = (data?.quoteResponse?.result || []).map((q: Record<string, unknown>, i: number) => ({
      name: names[i] || q.shortName,
      change: q.regularMarketChangePercent || 0,
      stocks: [],
    }));
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
