// ─── Centralized Market Data Service (Upstox Only) ───────────────────────────
// Single point of entry for ALL market data fetching.
// Implements centralized caching + request deduplication.
//
// Architecture:
//   API Routes → MarketService → Upstox Service → Upstox REST API
//   1000 users → same cached response. Only 1 external API call.
//
// Data flow:
//   Frontend (many users) → /api/* → MarketService.getXxx()
//     → CacheManager.getOrFetch()
//       → (cache hit? return immediately)
//       → (pending request? await same promise)
//       → (cold? call Upstox API once, cache result)
// ─────────────────────────────────────────────────────────────────────────────

import { CacheManager } from "@/lib/cache";
import {
  fetchUpstoxQuotes,
  fetchUpstoxOptionChain,
  fetchUpstoxCandles,
  fetchUpstoxIntradayCandles,
} from "@/services/upstoxService";
import { allInstruments } from "@/lib/marketData";

// ── Shared Types (provider-agnostic, used by API routes) ─────────────────────

export interface NormalizedQuote {
  symbol: string;
  shortName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  marketCap: number;
  trailingPE: number;
  epsTrailingTwelveMonths: number;
}

export interface NormalizedStrike {
  strike: number;
  expiry: string;
  isATM: boolean;
  ce: LegData;
  pe: LegData;
}

export interface LegData {
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

export interface OptionChainResult {
  symbol: string;
  underlyingName: string;
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPainStrike: number;
  expiryStr: string;
  expirationDates: string[];
  chain: NormalizedStrike[];
  totalCeOI: number;
  totalPeOI: number;
  exchange: string;
  synthetic: boolean;
}

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Cache Instances (5s TTL — shared across ALL users) ───────────────────────

const quoteCache = new CacheManager<NormalizedQuote[]>(5000);
const optionChainCache = new CacheManager<OptionChainResult>(5000);
const expiryCache = new CacheManager<string[]>(60_000);
const chartCache = new CacheManager<ChartCandle[]>(10_000);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(symbol: string): string {
  const inst = allInstruments.find((i) => i.symbol === symbol);
  return inst?.title ?? symbol;
}

// ── 1. Live Quotes ──────────────────────────────────────────────────────────

/** Fetch quotes for multiple symbols via Upstox. All users share the same cached response. */
export async function getQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
  if (symbols.length === 0) return [];

  const cacheKey = [...new Set(symbols)].sort().join(",");

  return quoteCache.getOrFetch(cacheKey, async () => {
    const upstoxQuotes = await fetchUpstoxQuotes(symbols);

    return upstoxQuotes.map((q) => ({
      symbol: q.symbol,
      shortName: getDisplayName(q.symbol),
      regularMarketPrice: q.ltp,
      regularMarketChange: q.change,
      regularMarketChangePercent: q.changePct,
      regularMarketVolume: q.volume,
      regularMarketDayHigh: q.high,
      regularMarketDayLow: q.low,
      regularMarketOpen: q.open,
      regularMarketPreviousClose: q.close,
      fiftyTwoWeekHigh: q.weekHigh52 ?? 0,
      fiftyTwoWeekLow: q.weekLow52 ?? 0,
      marketCap: 0,
      trailingPE: 0,
      epsTrailingTwelveMonths: 0,
    }));
  }, { serveStaleOnError: true, maxStaleMs: 120_000 });
}

// ── 2. Option Chain ─────────────────────────────────────────────────────────

/** Fetch option chain for a symbol via Upstox. One API call → many users. */
export async function getOptionChain(
  symbol: string,
  expiryDate?: string,
): Promise<OptionChainResult> {
  const cacheKey = `oc:${symbol}:${expiryDate ?? "nearest"}`;

  return optionChainCache.getOrFetch(cacheKey, async () => {
    const upstoxChain = await fetchUpstoxOptionChain(symbol, expiryDate);

    const chain: NormalizedStrike[] = upstoxChain.chain.map((row) => ({
      strike: row.strike,
      expiry: row.expiry,
      isATM: row.isATM,
      ce: row.ce,
      pe: row.pe,
    }));

    return {
      symbol: upstoxChain.symbol,
      underlyingName: upstoxChain.underlyingName,
      spotPrice: upstoxChain.spotPrice,
      atmStrike: upstoxChain.atmStrike,
      pcr: upstoxChain.pcr,
      maxPainStrike: upstoxChain.maxPainStrike,
      expiryStr: upstoxChain.expiryStr,
      expirationDates: upstoxChain.expirationDates,
      chain,
      totalCeOI: upstoxChain.totalCeOI,
      totalPeOI: upstoxChain.totalPeOI,
      exchange: upstoxChain.exchange,
      synthetic: false,
    };
  }, { serveStaleOnError: true, maxStaleMs: 300_000 });
}

// ── 3. Expiry Dates ─────────────────────────────────────────────────────────

/** Fetch available expiry dates for a symbol via Upstox. */
export async function getExpiryDates(symbol: string): Promise<string[]> {
  const cacheKey = `exp:${symbol}`;

  return expiryCache.getOrFetch(cacheKey, async () => {
    const chain = await fetchUpstoxOptionChain(symbol);
    return chain.expirationDates;
  }, { serveStaleOnError: true, maxStaleMs: 600_000 });
}

// ── 4. Chart Data ───────────────────────────────────────────────────────────

/** Fetch OHLCV chart candles from Upstox historical API. */
export async function getChartData(
  symbol: string,
  interval: string,
  range?: string,
): Promise<ChartCandle[]> {
  const cacheKey = `chart:${symbol}:${interval}:${range ?? "default"}`;

  return chartCache.getOrFetch(cacheKey, async () => {
    const isIntraday = ["1m", "5m", "15m", "30m", "1", "5", "15", "30"].includes(interval);

    if (isIntraday) {
      const candles = await fetchUpstoxIntradayCandles(symbol, interval);
      return candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    }

    // Determine date range from `range` parameter
    const now = new Date();
    const toDate = now.toISOString().slice(0, 10);
    const rangeMap: Record<string, number> = {
      "1d": 1, "5d": 5, "1mo": 30, "3mo": 90,
      "6mo": 180, "1y": 365, "2y": 730, "5y": 1825,
    };
    const daysBack = rangeMap[range ?? "6mo"] ?? 180;
    const fromDate = new Date(now.getTime() - daysBack * 86400_000)
      .toISOString()
      .slice(0, 10);

    const candles = await fetchUpstoxCandles(symbol, interval, fromDate, toDate);
    return candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  }, { serveStaleOnError: true, maxStaleMs: 300_000 });
}
