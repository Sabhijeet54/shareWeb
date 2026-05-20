// ─── PURE SYMBOL CATALOG ────────────────────────────────────────────────────
// NO prices, NO change%, NO volumes here.
// Every component must get prices from useLiveQuotes or useDerivativeQuotes.
// This file only defines what instruments exist and their metadata.

import type { Instrument } from "@/types/app";

export type WatchlistKey =
  | "indices"
  | "indexFut"
  | "indexOpt"
  | "stocks"
  | "stockFut"
  | "stockOpt"
  | "commodities"
  | "crypto";

export const watchTabs: Array<{ key: WatchlistKey; label: string }> = [
  { key: "indices", label: "Indices" },
  { key: "indexFut", label: "Index Fut" },
  { key: "indexOpt", label: "Index Opt" },
  { key: "stocks", label: "Stocks" },
  { key: "stockFut", label: "Stock Fut" },
  { key: "stockOpt", label: "Stock Opt" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
];

// All instruments — prices are always 0 here, loaded live from API
export const watchlists: Record<WatchlistKey, Instrument[]> = {
  indices: [
    { symbol: "NIFTY",      title: "NIFTY 50",   subtitle: "Index",      price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Index" },
    { symbol: "SENSEX",     title: "SENSEX",      subtitle: "Index",      price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Index" },
    { symbol: "BANKNIFTY",  title: "BANKNIFTY",   subtitle: "Index",      price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "FINNIFTY",   title: "FINNIFTY",    subtitle: "Index",      price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Finance" },
    { symbol: "MIDCPNIFTY", title: "MIDCPNIFTY",  subtitle: "Index",      price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Mid Cap" },
    { symbol: "INDIAVIX",   title: "INDIA VIX",   subtitle: "Volatility", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Volatility" },
  ],
  indexFut: [
    { symbol: "NIFTY FUT",      title: "NIFTY FUT",      subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "BANKNIFTY FUT",  title: "BANKNIFTY FUT",  subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "FINNIFTY FUT",   title: "FINNIFTY FUT",   subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "MIDCPNIFTY FUT", title: "MIDCPNIFTY FUT", subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
  indexOpt: [
    { symbol: "NIFTY CE ATM",       title: "NIFTY CE (ATM)",      subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "NIFTY PE ATM",       title: "NIFTY PE (ATM)",      subtitle: "Put option",  price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "BANKNIFTY CE ATM",   title: "BANKNIFTY CE (ATM)",  subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "BANKNIFTY PE ATM",   title: "BANKNIFTY PE (ATM)",  subtitle: "Put option",  price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "FINNIFTY CE ATM",    title: "FINNIFTY CE (ATM)",   subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "MIDCPNIFTY PE ATM",  title: "MIDCPNIFTY PE (ATM)", subtitle: "Put option",  price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
  stocks: [
    { symbol: "RELIANCE",  title: "RELIANCE",      subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Oil & Gas" },
    { symbol: "TCS",       title: "TCS",            subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "IT" },
    { symbol: "HDFCBANK",  title: "HDFC BANK",      subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "INFY",      title: "INFOSYS",        subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "IT" },
    { symbol: "ICICIBANK", title: "ICICI BANK",     subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "SBIN",      title: "SBI",            subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "LT",        title: "L&T",            subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Infra" },
    { symbol: "TATAMOTORS",title: "TATA MOTORS",    subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Auto" },
    { symbol: "WIPRO",     title: "WIPRO",          subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "IT" },
    { symbol: "AXISBANK",  title: "AXIS BANK",      subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "MARUTI",    title: "MARUTI SUZUKI",  subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Auto" },
    { symbol: "SUNPHARMA", title: "SUN PHARMA",     subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Pharma" },
    { symbol: "BAJFINANCE",title: "BAJAJ FINANCE",  subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Finance" },
    { symbol: "KOTAKBANK", title: "KOTAK BANK",     subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Banking" },
    { symbol: "HINDUNILVR",title: "HINDUSTAN UNILEVER", subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "FMCG" },
    { symbol: "TITAN",     title: "TITAN",          subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Consumer" },
    { symbol: "ADANIPORTS",title: "ADANI PORTS",    subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Infra" },
    { symbol: "ULTRACEMCO",title: "ULTRATECH CEMENT",subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Cement" },
    { symbol: "POWERGRID", title: "POWER GRID",     subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "Utilities" },
    { symbol: "NESTLEIND", title: "NESTLE INDIA",   subtitle: "NSE equity", price: 0, change: 0, volume: "—", high: 0, low: 0, sector: "FMCG" },
  ],
  stockFut: [
    { symbol: "RELIANCE FUT", title: "RELIANCE FUT", subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "TCS FUT",      title: "TCS FUT",      subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "HDFCBANK FUT", title: "HDFCBANK FUT", subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "SBIN FUT",     title: "SBIN FUT",     subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "INFY FUT",     title: "INFY FUT",     subtitle: "Current month", price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
  stockOpt: [
    { symbol: "RELIANCE CE ATM", title: "RELIANCE CE (ATM)", subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "RELIANCE PE ATM", title: "RELIANCE PE (ATM)", subtitle: "Put option",  price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "TCS CE ATM",      title: "TCS CE (ATM)",      subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "SBIN CE ATM",     title: "SBIN CE (ATM)",     subtitle: "Call option", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "HDFCBANK PE ATM", title: "HDFCBANK PE (ATM)", subtitle: "Put option",  price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
  commodities: [
    { symbol: "GOLD",       title: "GOLD",        subtitle: "Commodity", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "SILVER",     title: "SILVER",      subtitle: "Commodity", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "CRUDEOIL",   title: "CRUDE OIL",   subtitle: "Commodity", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "NATURALGAS", title: "NATURAL GAS", subtitle: "Commodity", price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
  crypto: [
    { symbol: "BTCUSDT", title: "BTC/USDT", subtitle: "Crypto", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "ETHUSDT", title: "ETH/USDT", subtitle: "Crypto", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "SOLUSDT", title: "SOL/USDT", subtitle: "Crypto", price: 0, change: 0, volume: "—", high: 0, low: 0 },
    { symbol: "XRPUSDT", title: "XRP/USDT", subtitle: "Crypto", price: 0, change: 0, volume: "—", high: 0, low: 0 },
  ],
};

export const allInstruments: Instrument[] = Object.values(watchlists).flat();

// ─── CONTRACT METADATA (lot sizes, margin rates) ────────────────────────────
// No prices here — just structural metadata used for order calculation

export type ContractMeta = {
  lotSize: number;
  product: "CASH" | "FUT" | "OPT" | "INDEX" | "COMMODITY" | "CRYPTO";
  marginRate: number;
  tradableLabel: string;
};

export function getContractMeta(instrument: Instrument): ContractMeta {
  const symbol = instrument.symbol;
  const isOption = instrument.subtitle.toLowerCase().includes("option");
  const isFuture = instrument.subtitle.toLowerCase().includes("current month");

  if (symbol.includes("BANKNIFTY")) {
    return { lotSize: 30, product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX", marginRate: isFuture ? 0.15 : 1, tradableLabel: "30 qty / lot" };
  }
  if (symbol.includes("FINNIFTY")) {
    return { lotSize: 60, product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX", marginRate: isFuture ? 0.15 : 1, tradableLabel: "60 qty / lot" };
  }
  if (symbol.includes("MIDCPNIFTY")) {
    return { lotSize: 120, product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX", marginRate: isFuture ? 0.15 : 1, tradableLabel: "120 qty / lot" };
  }
  if (symbol.includes("SENSEX")) {
    return { lotSize: 20, product: "INDEX", marginRate: 1, tradableLabel: "20 qty / lot" };
  }
  if (symbol.includes("NIFTY")) {
    return { lotSize: 75, product: isOption ? "OPT" : isFuture ? "FUT" : "INDEX", marginRate: isFuture ? 0.15 : 1, tradableLabel: "75 qty / lot" };
  }
  if (isFuture || isOption) {
    const stockLots: Record<string, number> = {
      RELIANCE: 500, TCS: 175, HDFCBANK: 550, SBIN: 1500,
      WIPRO: 1600, AXISBANK: 1200, MARUTI: 100, SUNPHARMA: 700,
      BAJFINANCE: 125, KOTAKBANK: 400, INFY: 400,
    };
    const lotSize = Object.entries(stockLots).find(([key]) => symbol.includes(key))?.[1] ?? 500;
    return { lotSize, product: isOption ? "OPT" : "FUT", marginRate: isFuture ? 0.18 : 1, tradableLabel: `${lotSize} qty / lot` };
  }
  if (instrument.subtitle === "Commodity") {
    return { lotSize: 1, product: "COMMODITY", marginRate: 1, tradableLabel: "1 unit" };
  }
  if (instrument.subtitle === "Crypto") {
    return { lotSize: 1, product: "CRYPTO", marginRate: 1, tradableLabel: "1 unit" };
  }
  return { lotSize: 1, product: "CASH", marginRate: 1, tradableLabel: "1 share" };
}

// ─── SECTOR METADATA ────────────────────────────────────────────────────────
// Change% here is always 0 — it gets overwritten in DashboardHome using live data
export const sectorData = [
  { name: "IT",       change: 0, marketCap: "—", stocks: ["TCS", "INFY", "WIPRO"] },
  { name: "Banking",  change: 0, marketCap: "—", stocks: ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK"] },
  { name: "Pharma",   change: 0, marketCap: "—", stocks: ["SUNPHARMA"] },
  { name: "Auto",     change: 0, marketCap: "—", stocks: ["TATAMOTORS", "MARUTI"] },
  { name: "Oil & Gas",change: 0, marketCap: "—", stocks: ["RELIANCE"] },
  { name: "Infra",    change: 0, marketCap: "—", stocks: ["LT", "ADANIPORTS"] },
  { name: "FMCG",     change: 0, marketCap: "—", stocks: ["HINDUNILVR", "NESTLEIND"] },
  { name: "Finance",  change: 0, marketCap: "—", stocks: ["BAJFINANCE"] },
  { name: "Consumer", change: 0, marketCap: "—", stocks: ["TITAN"] },
  { name: "Utilities",change: 0, marketCap: "—", stocks: ["POWERGRID"] },
];

// ─── OPTIONS CHAIN — derived from live spot via Black-Scholes ───────────────
// This function is called with LIVE spot price, not static data
export function generateOptionsChain(spotPrice: number, expiryLabel: string, ivPercent = 15) {
  if (spotPrice <= 0) return [];
  const strikes = [];
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const sigma = ivPercent / 100;

  // Days to expiry from label (approximate)
  const expDate = new Date(expiryLabel);
  const now = new Date();
  const T = Math.max(1, (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const r = 0.065; // RBI repo rate

  function normCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const t = 1 / (1 + p * Math.abs(x));
    const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
    return 0.5 * (1 + sign * (1 - poly * Math.exp(-x * x / 2)));
  }

  function blackScholes(S: number, K: number, T: number, r: number, sigma: number) {
    if (T <= 0) return { ce: Math.max(0, S - K), pe: Math.max(0, K - S) };
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;
    const ce = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    const pe = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    return {
      ce: Math.max(0.05, ce),
      pe: Math.max(0.05, pe),
      delta_ce: normCDF(d1),
      delta_pe: normCDF(d1) - 1,
      gamma: Math.exp(-d1 * d1 / 2) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI)),
      theta_ce: -(S * sigma * Math.exp(-d1 * d1 / 2)) / (2 * sqrtT * Math.sqrt(2 * Math.PI)) - r * K * Math.exp(-r * T) * normCDF(d2),
      vega: S * sqrtT * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI),
    };
  }

  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + i * 50;
    const isATM = i === 0;
    // Smile effect: OTM options have higher IV
    const smileSigma = sigma * (1 + 0.02 * Math.abs(i));
    const bs = blackScholes(spotPrice, strike, T, r, smileSigma);
    const oiBase = Math.round(Math.max(10, 80 - Math.abs(i) * 5));

    strikes.push({
      strike,
      expiry: expiryLabel,
      isATM,
      ce: {
        premium: parseFloat(bs.ce.toFixed(2)),
        iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: oiBase + "L",
        oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: Math.max(1, Math.round(oiBase * 0.15)) + "L",
        delta: parseFloat((bs.delta_ce ?? 0.5).toFixed(3)),
        gamma: parseFloat((bs.gamma ?? 0.002).toFixed(4)),
        theta: parseFloat(((bs.theta_ce ?? -15) / 365).toFixed(2)),
        vega: parseFloat(((bs.vega ?? 8) / 100).toFixed(2)),
      },
      pe: {
        premium: parseFloat(bs.pe.toFixed(2)),
        iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: Math.round(oiBase * 0.9) + "L",
        oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: Math.max(1, Math.round(oiBase * 0.12)) + "L",
        delta: parseFloat((bs.delta_pe ?? -0.5).toFixed(3)),
        gamma: parseFloat((bs.gamma ?? 0.002).toFixed(4)),
        theta: parseFloat(((bs.theta_ce ?? -15) / 365).toFixed(2)),
        vega: parseFloat(((bs.vega ?? 8) / 100).toFixed(2)),
      },
    });
  }
  return strikes;
}
