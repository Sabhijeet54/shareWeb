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
import { logEvent } from "@/lib/logger";
import type { AxiosRequestConfig } from "axios";

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown): boolean {
  const e = error as { response?: { status?: number }; code?: string; message?: string };
  const status = e.response?.status;
  if (status && [429, 500, 502, 503, 504].includes(status)) return true;
  const code = e.code ?? "";
  if (["ECONNABORTED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET"].includes(code)) return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("timeout") || msg.includes("network");
}

function normalizeNseOptionSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper === "NIFTY 50") return "NIFTY";
  if (upper === "BANK NIFTY") return "BANKNIFTY";
  return symbol;
}

function normalizeExpiryInput(expiryDate?: string): string | undefined {
  if (!expiryDate) return undefined;
  const trimmed = expiryDate.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return undefined;

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractExpiryFromContractRow(row: Record<string, unknown>): string | undefined {
  const raw = row.expiry_date ?? row.expiry;
  if (typeof raw === "string") {
    return normalizeExpiryInput(raw);
  }
  if (typeof raw === "number") {
    const date = new Date(raw > 1e12 ? raw : raw * 1000);
    if (isNaN(date.getTime())) return undefined;
    return normalizeExpiryInput(date.toISOString().slice(0, 10));
  }
  return undefined;
}

function unwrapUpstoxArrayPayload(payload: unknown): Record<string, unknown>[] {
  const p = payload as { data?: unknown } | undefined;
  if (Array.isArray(p?.data)) return p.data as Record<string, unknown>[];
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  return [];
}

function buildRequestUrl(url: string, config?: AxiosRequestConfig): string {
  const base = `https://api.upstox.com/v2${url}`;
  const params = config?.params as Record<string, string | number | boolean | undefined> | undefined;
  if (!params) return base;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function extractUpstreamError(error: unknown): { status?: number; body?: unknown; message: string } {
  const e = error as { response?: { status?: number; data?: unknown }; message?: string };
  return {
    status: e.response?.status,
    body: e.response?.data,
    message: e.message ?? String(error),
  };
}

async function getWithRetry<T>(
  url: string,
  config?: AxiosRequestConfig,
  attempts = 3,
  context?: { symbol?: string; operation?: string },
): Promise<T> {
  let lastError: unknown;
  const requestUrl = buildRequestUrl(url, config);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const resp = await upstoxClient.get(url, { timeout: 10_000, ...(config ?? {}) });
      return resp.data as T;
    } catch (err) {
      lastError = err;
      const upstream = extractUpstreamError(err);

      logEvent("warn", "provider.retry", {
        operation: context?.operation ?? "upstream_get",
        symbol: context?.symbol,
        requestUrl,
        attempt,
        attempts,
        upstreamStatus: upstream.status,
        upstreamBody: upstream.body,
        error: upstream.message,
      });

      if (!shouldRetry(err) || attempt >= attempts) break;
      const backoffMs = 300 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100);
      await delay(backoffMs);
    }
  }

  const upstream = extractUpstreamError(lastError);
  logEvent("error", "provider.upstream_failed", {
    operation: context?.operation ?? "upstream_get",
    symbol: context?.symbol,
    requestUrl,
    upstreamStatus: upstream.status,
    upstreamBody: upstream.body,
    error: upstream.message,
  });

  throw lastError;
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
      const data = await getWithRetry<any>("/market-quote/quotes", {
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
      logEvent("warn", "provider.quotes_batch_failed", { symbols: batch.map((b) => b.sym), error: String(err) });
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
    const data = await getWithRetry<any>("/market-quote/ltp", {
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
    logEvent("warn", "provider.ltp_failed", { symbols, error: String(err) });
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
  const normalizedSymbol = exchange === "NSE" ? normalizeNseOptionSymbol(symbol) : symbol;
  const optionSymbol = toUpstoxOptionSymbol(normalizedSymbol);
  const optionSymbolFromOriginal = toUpstoxOptionSymbol(symbol);

  const candidates = [
    optionSymbol,
    normalizedSymbol,
    optionSymbolFromOriginal,
    symbol,
  ].map((s) => s.trim()).filter(Boolean);

  const candidateKeys = new Set<string>();
  for (const candidate of candidates) {
    const key = await resolveUpstoxKey(candidate);
    if (key) candidateKeys.add(key);
  }

  if (candidateKeys.size === 0) throw new Error(`Unknown instrument: ${symbol}`);

  // Step 1: Probe candidate keys and select one that yields actual option expiries
  let instrumentKey = "";
  let allExpiries: string[] = [];
  let lastContractError: unknown;

  for (const key of candidateKeys) {
    try {
      const expiryResp = await getWithRetry<any>("/option/contract", {
        params: { instrument_key: key },
      }, 3, { symbol: normalizedSymbol, operation: "option_contract" });

      const expiries: string[] = unwrapUpstoxArrayPayload(expiryResp)
        .map((c: Record<string, unknown>) => extractExpiryFromContractRow(c))
        .filter((e: string | undefined): e is string => Boolean(e))
        .filter((e: string, i: number, a: string[]) => a.indexOf(e) === i)
        .sort();

      if (expiries.length > 0) {
        instrumentKey = key;
        allExpiries = expiries;
        break;
      }
    } catch (err) {
      lastContractError = err;
    }
  }

  if (!instrumentKey || allExpiries.length === 0) {
    if (lastContractError) throw lastContractError;
    throw new Error(`No option contracts found for symbol: ${symbol}`);
  }

  const requestedExpiry = normalizeExpiryInput(expiryDate);
  const selectedExpiry = requestedExpiry && allExpiries.includes(requestedExpiry)
    ? requestedExpiry
    : (allExpiries[0] ?? requestedExpiry ?? "");

  // Step 2: Fetch option chain for selected expiry
  const chainParams: Record<string, string> = {
    instrument_key: instrumentKey,
  };
  chainParams.expiry_date = selectedExpiry;

  const chainResp = await getWithRetry<any>("/option/chain", {
    params: chainParams,
  }, 3, { symbol: normalizedSymbol, operation: "option_chain" });

  const chainData = unwrapUpstoxArrayPayload(chainResp);
  const spotPrice = Number((chainData[0]?.underlying_spot_price as number | undefined) ?? 0);

  // Find ATM strike
  let atmStrike = 0;
  let minDist = Infinity;
  for (const row of chainData) {
    const strike = Number((row.strike_price as number | undefined) ?? 0);
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
        iv: ceGreeks.iv ?? 0,
        oi: ceQuote.oi ?? 0,
        oiFormatted: formatVolume(ceQuote.oi ?? 0),
        oiChange: ceQuote.oi_day_change ?? 0,
        volume: ceQuote.volume ?? 0,
        volumeFormatted: formatVolume(ceQuote.volume ?? 0),
        change: (ceQuote.net_change as number) ?? (ceLTP - ceClose),
        changePct: (ceQuote.change_percentage as number) ?? (ceClose ? ((ceLTP - ceClose) / ceClose) * 100 : 0),
        itm: strike < spotPrice,
      },
      pe: {
        premium: peLTP,
        bid: peQuote.bid_price ?? 0,
        ask: peQuote.ask_price ?? 0,
        iv: peGreeks.iv ?? 0,
        oi: peQuote.oi ?? 0,
        oiFormatted: formatVolume(peQuote.oi ?? 0),
        oiChange: peQuote.oi_day_change ?? 0,
        volume: peQuote.volume ?? 0,
        volumeFormatted: formatVolume(peQuote.volume ?? 0),
        change: (peQuote.net_change as number) ?? (peLTP - peClose),
        changePct: (peQuote.change_percentage as number) ?? (peClose ? ((peLTP - peClose) / peClose) * 100 : 0),
        itm: strike > spotPrice,
      },
    };
  });

  // Sort by strike price
  chain.sort((a, b) => a.strike - b.strike);

  // Upstream OI totals
  const totalCeOI = chain.reduce((s, r) => s + r.ce.oi, 0);
  const totalPeOI = chain.reduce((s, r) => s + r.pe.oi, 0);

  const payloadMeta = (chainResp as Record<string, unknown>) ?? {};
  const pcr = (payloadMeta.pcr as number) ?? 0;
  const maxPainStrike = (payloadMeta.max_pain_strike as number) ?? 0;

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
    "5m": "30minute", "5": "30minute",
    "15m": "30minute", "15": "30minute",
    "30m": "30minute", "30": "30minute",
    "1h": "30minute", "60": "30minute", "60m": "30minute",
    "1d": "day", "D": "day",
    "1wk": "week", "W": "week",
    "1mo": "month", "M": "month",
  };
  const upstoxInterval = intervalMap[interval] ?? "day";

  const url = `/historical-candle/${instrumentKey}/${upstoxInterval}/${toDate}/${fromDate}`;
  const data = await getWithRetry<any>(url);

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
    "5m": "30minute", "5": "30minute",
    "15m": "30minute", "15": "30minute",
    "30m": "30minute", "30": "30minute",
    "1h": "30minute", "60": "30minute", "60m": "30minute",
  };
  const upstoxInterval = intervalMap[interval] ?? "1minute";

  let candles: unknown[][] = [];
  try {
    const url = `/historical-candle/intraday/${instrumentKey}/${upstoxInterval}`;
    const data = await getWithRetry<any>(url);
    candles = data?.data?.candles ?? [];
  } catch (err) {
    // Fallback for interval validation errors (UDAPI1076) and transient provider changes.
    if (upstoxInterval !== "1minute") {
      logEvent("warn", "chart.intraday_interval_fallback", { symbol, requestedInterval: interval, fallbackInterval: "1minute", error: String(err) });
      const fallbackUrl = `/historical-candle/intraday/${instrumentKey}/1minute`;
      const fallback = await getWithRetry<any>(fallbackUrl);
      candles = fallback?.data?.candles ?? [];
    } else {
      throw err;
    }
  }

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
