// ─── Upstox Service Layer ────────────────────────────────────────────────────
// High-level service functions that call the Upstox API through upstoxClient.
// Each function handles data fetching, normalization, and error handling.
// Cached at the API route level (not here) so the cache key can include query params.
//
// Architecture:
//   Frontend hooks → /api/* routes → upstoxService → upstoxClient → Upstox REST API
// ─────────────────────────────────────────────────────────────────────────────

import upstoxClient, { resolveUpstoxKey, toUpstoxOptionSymbol, isUpstoxConfigured, fromUpstoxResponseKey } from "@/lib/upstox";
import { instrumentLoader } from "@/lib/instruments";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UpstoxQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;          // previous close
  volume: number;
  change: number;
  changePct: number;
  oi?: number;
  upperCircuit?: number;
  lowerCircuit?: number;
  weekHigh52?: number;
  weekLow52?: number;
}

export interface UpstoxOptionRow {
  strike: number;
  expiry: string;
  isATM: boolean;
  ce: OptionLegData;
  pe: OptionLegData;
}

export interface OptionLegData {
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

export interface UpstoxOptionChainResult {
  symbol: string;
  underlyingName: string;
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPainStrike: number;
  expiryStr: string;
  expirationDates: string[];
  chain: UpstoxOptionRow[];
  totalCeOI: number;
  totalPeOI: number;
  exchange: string;
  synthetic: boolean;
}

export interface UpstoxCandle {
  time: number;   // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVolume(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + "Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + "L";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

// ─── 1. Live Quotes / LTP ───────────────────────────────────────────────────

/**
 * Fetch live market quotes for one or more instruments.
 * Uses dynamic instrument key resolution — zero hardcoded ISINs.
 * Upstox endpoint: GET /market-quote/quotes?instrument_key=...
 */
export async function fetchUpstoxQuotes(
  symbols: string[],
): Promise<UpstoxQuote[]> {
  if (!isUpstoxConfigured()) throw new Error("Upstox not configured");

  // Ensure instrument loader is ready (downloads master file on first call)
  await instrumentLoader.ensureLoaded();

  // Resolve each symbol → instrument key, skip symbols not in master file
  const resolved: { sym: string; key: string }[] = [];
  for (const sym of symbols) {
    const key = await resolveUpstoxKey(sym);
    if (key) {
      resolved.push({ sym, key });
    }
    // Symbol not in master file — skip silently
  }

  if (resolved.length === 0) return [];

  // Upstox limits batch size — split into chunks of 50
  const BATCH_SIZE = 50;
  const allQuotes: UpstoxQuote[] = [];

  for (let i = 0; i < resolved.length; i += BATCH_SIZE) {
    const batch = resolved.slice(i, i + BATCH_SIZE);
    const keyParam = batch.map((r) => r.key).join(",");

    try {
      const { data } = await upstoxClient.get("/market-quote/quotes", {
        params: { instrument_key: keyParam },
      });

      const results = data?.data ?? {};

      // Upstox response keys are like "NSE_EQ:RELIANCE" or "NSE_INDEX:Nifty 50"
      // We need to match each batch entry to its response.
      // Strategy: for each batch entry, check ALL response keys to find the one
      // that belongs to our requested instrument key (same segment + either trading_symbol or display name).
      const responseKeys = Object.keys(results);

      for (const { sym, key } of batch) {
        // From our request key "NSE_EQ|INE002A01018", extract segment "NSE_EQ"
        const segment = key.split("|")[0]; // "NSE_EQ" or "NSE_INDEX"

        // Find matching response key - it will start with "SEGMENT:"
        let q: Record<string, unknown> | undefined;
        for (const rk of responseKeys) {
          if (!rk.startsWith(segment + ":")) continue;

          // Check if this response key maps to our symbol via the instrument loader
          const mappedSym = fromUpstoxResponseKey(rk);
          if (mappedSym === sym) {
            q = results[rk];
            break;
          }

          // Also check if response maps to the master trading symbol
          // (in case sym is an alias like "NIFTY 50" for master "NIFTY")
          if (mappedSym && instrumentLoader.getKey(sym) === instrumentLoader.getKey(mappedSym)) {
            q = results[rk];
            break;
          }
        }

        // Last resort: if only one response key matches our segment, use it
        if (!q) {
          const segmentMatches = responseKeys.filter(rk => rk.startsWith(segment + ":"));
          if (segmentMatches.length === 1) {
            q = results[segmentMatches[0]];
          }
        }

        if (!q) continue;

        const ohlc = (q.ohlc as Record<string, number>) ?? {};
        const ltp = (q.last_price as number) ?? 0;
        const netChange = (q.net_change as number | undefined) ?? undefined;
        const prevCloseFromNet = netChange != null ? ltp - netChange : undefined;
        const prevClose = prevCloseFromNet ?? ohlc.close ?? 0;
        const change = netChange ?? (ltp - prevClose);
        const changePct = prevClose ? (change / prevClose) * 100 : 0;

        allQuotes.push({
          symbol: sym,
          ltp,
          open: ohlc.open ?? 0,
          high: ohlc.high ?? 0,
          low: ohlc.low ?? 0,
          close: prevClose,
          volume: (q.volume as number) ?? 0,
          change: parseFloat(change.toFixed(2)),
          changePct: parseFloat(changePct.toFixed(2)),
          oi: (q.oi as number) ?? undefined,
          upperCircuit: (q.upper_circuit_limit as number) ?? undefined,
          lowerCircuit: (q.lower_circuit_limit as number) ?? undefined,
          weekHigh52: (q.week_52_high as number) ?? undefined,
          weekLow52: (q.week_52_low as number) ?? undefined,
        });
      }
    } catch (err) {
      console.warn(`[UpstoxService] Batch quote fetch failed:`, String(err));
      // Don't throw — partial results are better than no results
    }
  }

  return allQuotes;
}

/**
 * Fetch only LTP for instruments (lighter endpoint).
 * Upstox endpoint: GET /market-quote/ltp?instrument_key=...
 */
export async function fetchUpstoxLTP(
  symbols: string[],
): Promise<Record<string, number>> {
  if (!isUpstoxConfigured()) throw new Error("Upstox not configured");

  await instrumentLoader.ensureLoaded();

  const resolved: { sym: string; key: string }[] = [];
  for (const sym of symbols) {
    const key = await resolveUpstoxKey(sym);
    if (key) resolved.push({ sym, key });
  }

  if (resolved.length === 0) return {};

  const keyParam = resolved.map((r) => r.key).join(",");

  try {
    const { data } = await upstoxClient.get("/market-quote/ltp", {
      params: { instrument_key: keyParam },
    });

    const result: Record<string, number> = {};
    const entries = data?.data ?? {};

    // Match response keys to app symbols
    for (const { sym, key } of resolved) {
      const segment = key.split("|")[0];
      for (const [rk, entry] of Object.entries(entries)) {
        if (!rk.startsWith(segment + ":")) continue;
        const mappedSym = fromUpstoxResponseKey(rk);
        if (mappedSym === sym || (mappedSym && instrumentLoader.getKey(sym) === instrumentLoader.getKey(mappedSym))) {
          result[sym] = (entry as Record<string, number>)?.last_price ?? 0;
          break;
        }
      }
    }

    return result;
  } catch (err) {
    console.warn("[UpstoxService] LTP fetch failed:", String(err));
    return {};
  }
}

// ─── 2. Option Chain ─────────────────────────────────────────────────────────

/**
 * Fetch full option chain from Upstox.
 * Upstox endpoint: GET /option/chain?instrument_key=...&expiry_date=...
 */
export async function fetchUpstoxOptionChain(
  symbol: string,
  expiryDate?: string,
  exchange = "NSE",
): Promise<UpstoxOptionChainResult> {
  if (!isUpstoxConfigured()) throw new Error("Upstox not configured");

  await instrumentLoader.ensureLoaded();
  const optionSymbol = toUpstoxOptionSymbol(symbol);
  const instrumentKey = await resolveUpstoxKey(symbol);
  if (!instrumentKey) throw new Error(`Unknown instrument: ${symbol}`);

  // Step 1: Get expiry dates
  const expiryResp = await upstoxClient.get("/option/contract", {
    params: { instrument_key: instrumentKey },
  });

  const allExpiries: string[] = (expiryResp.data?.data ?? [])
    .map((c: { expiry?: string }) => c.expiry)
    .filter((e: string | undefined): e is string => Boolean(e))
    .filter((e: string, i: number, a: string[]) => a.indexOf(e) === i) // dedupe
    .sort();

  const selectedExpiry = expiryDate ?? allExpiries[0] ?? "";

  // Step 2: Fetch option chain for selected expiry
  const chainResp = await upstoxClient.get("/option/chain", {
    params: {
      instrument_key: instrumentKey,
      expiry_date: selectedExpiry,
    },
  });

  const chainData = chainResp.data?.data ?? [];
  const spotPrice = chainData[0]?.underlying_spot_price ?? 0;

  // Find ATM strike
  let atmStrike = 0;
  let minDist = Infinity;
  for (const row of chainData) {
    const strike = row.strike_price ?? 0;
    const dist = Math.abs(strike - spotPrice);
    if (dist < minDist) { minDist = dist; atmStrike = strike; }
  }

  // Normalize chain data
  const chain: UpstoxOptionRow[] = chainData.map((row: Record<string, unknown>) => {
    const strike = (row.strike_price as number) ?? 0;
    const ce = (row.call_options as Record<string, unknown>) ?? {};
    const pe = (row.put_options as Record<string, unknown>) ?? {};

    const ceGreeks = (ce.option_greeks as Record<string, number>) ?? {};
    const peGreeks = (pe.option_greeks as Record<string, number>) ?? {};
    const ceQuote = (ce.market_data as Record<string, number>) ?? {};
    const peQuote = (pe.market_data as Record<string, number>) ?? {};

    const ceLTP = ceQuote.ltp ?? 0;
    const peLTP = peQuote.ltp ?? 0;
    const ceClose = ceQuote.close_price ?? ceQuote.prev_close ?? ceLTP;
    const peClose = peQuote.close_price ?? peQuote.prev_close ?? peLTP;

    return {
      strike,
      expiry: selectedExpiry,
      isATM: strike === atmStrike,
      ce: {
        premium: ceLTP,
        bid: ceQuote.bid_price ?? 0,
        ask: ceQuote.ask_price ?? 0,
        iv: parseFloat(((ceGreeks.iv ?? 0) * 100).toFixed(1)),
        oi: ceQuote.oi ?? 0,
        oiFormatted: formatVolume(ceQuote.oi ?? 0),
        oiChange: ceQuote.oi_day_change ?? 0,
        volume: ceQuote.volume ?? 0,
        volumeFormatted: formatVolume(ceQuote.volume ?? 0),
        change: parseFloat((ceLTP - ceClose).toFixed(2)),
        changePct: ceClose ? parseFloat((((ceLTP - ceClose) / ceClose) * 100).toFixed(2)) : 0,
        itm: strike < spotPrice,
      },
      pe: {
        premium: peLTP,
        bid: peQuote.bid_price ?? 0,
        ask: peQuote.ask_price ?? 0,
        iv: parseFloat(((peGreeks.iv ?? 0) * 100).toFixed(1)),
        oi: peQuote.oi ?? 0,
        oiFormatted: formatVolume(peQuote.oi ?? 0),
        oiChange: peQuote.oi_day_change ?? 0,
        volume: peQuote.volume ?? 0,
        volumeFormatted: formatVolume(peQuote.volume ?? 0),
        change: parseFloat((peLTP - peClose).toFixed(2)),
        changePct: peClose ? parseFloat((((peLTP - peClose) / peClose) * 100).toFixed(2)) : 0,
        itm: strike > spotPrice,
      },
    };
  });

  // Sort by strike price
  chain.sort((a, b) => a.strike - b.strike);

  // Calculate PCR and Max Pain
  const totalCeOI = chain.reduce((s, r) => s + r.ce.oi, 0);
  const totalPeOI = chain.reduce((s, r) => s + r.pe.oi, 0);
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

  // Format expiry for display — expiry is ISO date string like "2026-05-26"
  let expiryStr = selectedExpiry;
  if (selectedExpiry) {
    // Parse yyyy-mm-dd manually to avoid timezone issues
    const parts = selectedExpiry.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        expiryStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    }
  }

  return {
    symbol,
    underlyingName: optionSymbol,
    spotPrice,
    atmStrike,
    pcr,
    maxPainStrike,
    expiryStr,
    expirationDates: allExpiries,
    chain,
    totalCeOI,
    totalPeOI,
    exchange,
    synthetic: false,
  };
}

// ─── 3. Historical Candles (Chart Data) ──────────────────────────────────────

/**
 * Fetch historical candles for charting.
 * Upstox endpoint: GET /historical-candle/{instrumentKey}/{interval}/{to_date}/{from_date}
 */
export async function fetchUpstoxCandles(
  symbol: string,
  interval: string,
  fromDate: string,
  toDate: string,
): Promise<UpstoxCandle[]> {
  if (!isUpstoxConfigured()) throw new Error("Upstox not configured");

  const rawKey = await resolveUpstoxKey(symbol);
  if (!rawKey) throw new Error(`Unknown instrument: ${symbol}`);
  const instrumentKey = encodeURIComponent(rawKey);

  // Map our intervals → Upstox intervals
  const intervalMap: Record<string, string> = {
    "1m": "1minute", "1": "1minute",
    "5m": "5minute", "5": "5minute",
    "15m": "15minute", "15": "15minute",
    "30m": "30minute", "30": "30minute",
    "1h": "60minute", "60": "60minute", "60m": "60minute",
    "1d": "day", "D": "day",
    "1wk": "week", "W": "week",
    "1mo": "month", "M": "month",
  };
  const upstoxInterval = intervalMap[interval] ?? "day";

  const url = `/historical-candle/${instrumentKey}/${upstoxInterval}/${toDate}/${fromDate}`;
  const { data } = await upstoxClient.get(url);

  const candles: unknown[][] = data?.data?.candles ?? [];

  // Upstox candle format: [timestamp, open, high, low, close, volume, oi]
  return candles.map((c) => ({
    time: Math.floor(new Date(c[0] as string).getTime() / 1000),
    open: c[1] as number,
    high: c[2] as number,
    low: c[3] as number,
    close: c[4] as number,
    volume: c[5] as number,
    oi: (c[6] as number) ?? undefined,
  })).reverse(); // Upstox returns newest-first, we want oldest-first
}

/**
 * Fetch intraday candles (today's data).
 * Upstox endpoint: GET /historical-candle/intraday/{instrumentKey}/{interval}
 */
export async function fetchUpstoxIntradayCandles(
  symbol: string,
  interval: string,
): Promise<UpstoxCandle[]> {
  if (!isUpstoxConfigured()) throw new Error("Upstox not configured");

  const rawKey = await resolveUpstoxKey(symbol);
  if (!rawKey) throw new Error(`Unknown instrument: ${symbol}`);
  const instrumentKey = encodeURIComponent(rawKey);
  const intervalMap: Record<string, string> = {
    "1m": "1minute", "1": "1minute",
    "5m": "5minute", "5": "5minute",
    "15m": "15minute", "15": "15minute",
    "30m": "30minute", "30": "30minute",
    "1h": "60minute", "60": "60minute", "60m": "60minute",
  };
  const upstoxInterval = intervalMap[interval] ?? "1minute";

  const url = `/historical-candle/intraday/${instrumentKey}/${upstoxInterval}`;
  const { data } = await upstoxClient.get(url);

  const candles: unknown[][] = data?.data?.candles ?? [];

  return candles.map((c) => ({
    time: Math.floor(new Date(c[0] as string).getTime() / 1000),
    open: c[1] as number,
    high: c[2] as number,
    low: c[3] as number,
    close: c[4] as number,
    volume: c[5] as number,
    oi: (c[6] as number) ?? undefined,
  })).reverse();
}
