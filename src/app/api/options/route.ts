// ─── Options Chain API ──────────────────────────────────────────
// First tries Yahoo Finance. If 401/blocked → generates a synthetic
// Black‑Scholes chain using the live spot price from /api/quote.
// The component shape stays identical either way.

import { NextRequest, NextResponse } from "next/server";
import { toYahoo } from "@/lib/symbolMap";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface NormalizedStrike {
  strike: number;
  expiry: string;
  isATM: boolean;
  ce: LegData;
  pe: LegData;
}

interface LegData {
  premium: number;
  bid: number;
  ask: number;
  iv: number;
  oi: number;
  oiFormatted: string;
  oiChange: number;
  volume: number;
  volumeFormatted: string;
  change: number;
  changePct: number;
  itm: boolean;
}

function formatVolume(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + "Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + "L";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// ── Black‑Scholes helpers ──
function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p2 = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p2 * Math.abs(x));
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-x * x / 2)));
}

function bs(S: number, K: number, T: number, r: number, sigma: number) {
  if (T <= 0 || sigma <= 0)
    return { ce: Math.max(0, S - K), pe: Math.max(0, K - S), delta_ce: S > K ? 1 : 0, delta_pe: S < K ? -1 : 0, gamma: 0, theta_ce: 0, vega: 0 };
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const ce = Math.max(0.05, S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2));
  const pe = Math.max(0.05, K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1));
  return { ce, pe, delta_ce: normCDF(d1), delta_pe: normCDF(d1) - 1, gamma: Math.exp(-d1 * d1 / 2) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI)), theta_ce: -(S * sigma * Math.exp(-d1 * d1 / 2)) / (2 * sqrtT * Math.sqrt(2 * Math.PI)) - r * K * Math.exp(-r * T) * normCDF(d2), vega: S * sqrtT * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI) };
}

function generateSyntheticChain(spotPrice: number, symbol: string): {
  chain: NormalizedStrike[];
  expirationDates: number[];
  expiryStr: string;
  atmStrike: number;
  totalCeOI: number;
  totalPeOI: number;
  pcr: number;
  maxPainStrike: number;
} {
  const step = spotPrice > 50000 ? 500 : spotPrice > 10000 ? 200 : spotPrice > 5000 ? 100 : spotPrice > 1000 ? 50 : spotPrice > 500 ? 25 : 10;
  const atmStrike = Math.round(spotPrice / step) * step;
  const baseIV = 0.18;
  const r = 0.065;

  // Generate next 4 Thursday expiries (NSE style)
  const expiries: Date[] = [];
  const today = new Date();
  const d = new Date(today);
  for (let i = 0; i < 60 && expiries.length < 4; i++) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 4) expiries.push(new Date(d));
  }

  const expirationDates = expiries.map((e) => Math.floor(e.getTime() / 1000));
  const expiryDate = expiries[0] ?? new Date(Date.now() + 7 * 86400000);
  const expiryStr = expiryDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const T = Math.max(1 / 365, (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365));

  const chain: NormalizedStrike[] = [];
  for (let i = -15; i <= 15; i++) {
    const strike = atmStrike + i * step;
    const isATM = i === 0;
    const smileSigma = baseIV * (1 + 0.02 * Math.abs(i));
    const p = bs(spotPrice, strike, T, r, smileSigma);
    const ceOI = Math.round(Math.max(500, (15000 - Math.abs(i) * 800)) * (1 + Math.random() * 0.2));
    const peOI = Math.round(Math.max(500, (14000 - Math.abs(i) * 700)) * (1 + Math.random() * 0.2));
    const ceVol = Math.round(ceOI * 0.15 * (0.8 + Math.random() * 0.4));
    const peVol = Math.round(peOI * 0.12 * (0.8 + Math.random() * 0.4));
    const spread = Math.max(0.05, p.ce * 0.01);

    chain.push({
      strike,
      expiry: expiryStr,
      isATM,
      ce: {
        premium: parseFloat(p.ce.toFixed(2)),
        bid: parseFloat(Math.max(0.05, p.ce - spread).toFixed(2)),
        ask: parseFloat((p.ce + spread).toFixed(2)),
        iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: ceOI,
        oiFormatted: formatVolume(ceOI),
        oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: ceVol,
        volumeFormatted: formatVolume(ceVol),
        change: parseFloat((Math.random() * 8 - 4).toFixed(2)),
        changePct: parseFloat((Math.random() * 6 - 3).toFixed(2)),
        itm: strike < spotPrice,
      },
      pe: {
        premium: parseFloat(p.pe.toFixed(2)),
        bid: parseFloat(Math.max(0.05, p.pe - spread).toFixed(2)),
        ask: parseFloat((p.pe + spread).toFixed(2)),
        iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: peOI,
        oiFormatted: formatVolume(peOI),
        oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: peVol,
        volumeFormatted: formatVolume(peVol),
        change: parseFloat((Math.random() * 8 - 4).toFixed(2)),
        changePct: parseFloat((Math.random() * 6 - 3).toFixed(2)),
        itm: strike > spotPrice,
      },
    });
  }

  const totalCeOI = chain.reduce((s, r2) => s + r2.ce.oi, 0);
  const totalPeOI = chain.reduce((s, r2) => s + r2.pe.oi, 0);
  const pcr = totalCeOI > 0 ? parseFloat((totalPeOI / totalCeOI).toFixed(2)) : 0;

  let maxPainStrike = atmStrike;
  let minPain = Infinity;
  for (const row of chain) {
    let pain = 0;
    for (const rr of chain) {
      pain += Math.max(0, row.strike - rr.strike) * rr.ce.oi;
      pain += Math.max(0, rr.strike - row.strike) * rr.pe.oi;
    }
    if (pain < minPain) { minPain = pain; maxPainStrike = row.strike; }
  }

  return { chain, expirationDates, expiryStr, atmStrike, totalCeOI, totalPeOI, pcr, maxPainStrike };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const dateParam = sp.get("date") ?? "";

  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  const yahooSymbol = toYahoo(symbol);

  // ── Step 1: Try Yahoo Finance v7 options ──
  try {
    let url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(yahooSymbol)}`;
    if (dateParam) url += `?date=${dateParam}`;

    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    });

    if (resp.ok) {
      const data = await resp.json();
      const result = data?.optionChain?.result?.[0];
      if (result) {
        // Yahoo data available — normalize and return
        const quote = result.quote ?? {};
        const spotPrice = quote.regularMarketPrice ?? 0;
        const underlyingName = quote.shortName ?? quote.longName ?? symbol;
        const expirationDates: number[] = result.expirationDates ?? [];
        const strikes: number[] = result.strikes ?? [];
        const options = result.options?.[0] ?? {};
        const calls = options.calls ?? [];
        const puts = options.puts ?? [];
        const expirationDate = options.expirationDate ?? 0;

        const expiryStr = expirationDate
          ? new Date(expirationDate * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : "";

        const callMap = new Map<number, Record<string, number | boolean | undefined>>();
        const putMap = new Map<number, Record<string, number | boolean | undefined>>();
        for (const c of calls) if (c.strike) callMap.set(c.strike, c);
        for (const p of puts) if (p.strike) putMap.set(p.strike, p);

        let atmStrike = strikes[0] ?? 0;
        let minDist = Infinity;
        for (const s of strikes) {
          const dist = Math.abs(s - spotPrice);
          if (dist < minDist) { minDist = dist; atmStrike = s; }
        }

        const atmIdx = strikes.indexOf(atmStrike);
        const fromIdx = Math.max(0, atmIdx - 15);
        const toIdx = Math.min(strikes.length - 1, atmIdx + 15);
        const nearStrikes = strikes.slice(fromIdx, toIdx + 1);

        const chain: NormalizedStrike[] = nearStrikes.map((strike) => {
          const call = callMap.get(strike) as Record<string, number | boolean | undefined> | undefined;
          const put = putMap.get(strike) as Record<string, number | boolean | undefined> | undefined;
          return {
            strike, expiry: expiryStr, isATM: strike === atmStrike,
            ce: {
              premium: (call?.lastPrice as number) ?? 0, bid: (call?.bid as number) ?? 0, ask: (call?.ask as number) ?? 0,
              iv: parseFloat((((call?.impliedVolatility as number) ?? 0) * 100).toFixed(1)),
              oi: (call?.openInterest as number) ?? 0, oiFormatted: formatVolume((call?.openInterest as number) ?? 0), oiChange: 0,
              volume: (call?.volume as number) ?? 0, volumeFormatted: formatVolume((call?.volume as number) ?? 0),
              change: (call?.change as number) ?? 0, changePct: (call?.percentChange as number) ?? 0, itm: (call?.inTheMoney as boolean) ?? false,
            },
            pe: {
              premium: (put?.lastPrice as number) ?? 0, bid: (put?.bid as number) ?? 0, ask: (put?.ask as number) ?? 0,
              iv: parseFloat((((put?.impliedVolatility as number) ?? 0) * 100).toFixed(1)),
              oi: (put?.openInterest as number) ?? 0, oiFormatted: formatVolume((put?.openInterest as number) ?? 0), oiChange: 0,
              volume: (put?.volume as number) ?? 0, volumeFormatted: formatVolume((put?.volume as number) ?? 0),
              change: (put?.change as number) ?? 0, changePct: (put?.percentChange as number) ?? 0, itm: (put?.inTheMoney as boolean) ?? false,
            },
          };
        });

        const totalCeOI = chain.reduce((s2, r2) => s2 + r2.ce.oi, 0);
        const totalPeOI = chain.reduce((s2, r2) => s2 + r2.pe.oi, 0);
        const pcr = totalCeOI > 0 ? parseFloat((totalPeOI / totalCeOI).toFixed(2)) : 0;

        let maxPainStrike = atmStrike;
        let minPain = Infinity;
        for (const row of chain) {
          let pain = 0;
          for (const rr of chain) {
            pain += Math.max(0, row.strike - rr.strike) * rr.ce.oi;
            pain += Math.max(0, rr.strike - row.strike) * rr.pe.oi;
          }
          if (pain < minPain) { minPain = pain; maxPainStrike = row.strike; }
        }

        return NextResponse.json(
          { symbol, underlyingName, spotPrice, atmStrike, pcr, maxPainStrike, expiryStr, expirationDates, chain, totalCeOI, totalPeOI },
          { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } }
        );
      }
    }
  } catch {
    // Yahoo failed — fall through to synthetic chain
  }

  // ── Step 2: Fallback — fetch live spot price, then generate synthetic chain ──
  try {
    const quoteResp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1m`,
      { headers: { "User-Agent": UA }, cache: "no-store" }
    );

    let spotPrice = 0;
    let underlyingName = symbol;
    if (quoteResp.ok) {
      const qd = await quoteResp.json();
      const meta = qd?.chart?.result?.[0]?.meta;
      if (meta) {
        spotPrice = meta.regularMarketPrice ?? 0;
        underlyingName = meta.shortName ?? meta.longName ?? symbol;
      }
    }

    if (spotPrice <= 0) {
      return NextResponse.json({ error: "Could not fetch spot price" }, { status: 502 });
    }

    const synthetic = generateSyntheticChain(spotPrice, symbol);

    return NextResponse.json(
      {
        symbol,
        underlyingName,
        spotPrice,
        atmStrike: synthetic.atmStrike,
        pcr: synthetic.pcr,
        maxPainStrike: synthetic.maxPainStrike,
        expiryStr: synthetic.expiryStr,
        expirationDates: synthetic.expirationDates,
        chain: synthetic.chain,
        totalCeOI: synthetic.totalCeOI,
        totalPeOI: synthetic.totalPeOI,
      },
      { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } }
    );
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
