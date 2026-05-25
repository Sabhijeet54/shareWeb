// ─── INDIAN MARKET INSTRUMENT CATALOG ────────────────────────────────────────
// NO prices here. Every component must get prices from useLiveQuotes / useDerivativeQuotes.
// This file defines what instruments exist and their metadata.

import type { Instrument } from "@/types/app";

export type WatchlistKey =
  | "indices"
  | "stocks"
  | "stockFut"
  | "stockOpt"
  | "commodities"
  | "forex"
  | "crypto";

export const watchTabs: Array<{ key: WatchlistKey; label: string }> = [
  { key: "indices",    label: "Indices" },
  { key: "stocks",     label: "Stocks" },
  { key: "stockFut",   label: "F&O" },
  { key: "stockOpt",   label: "Options" },
  { key: "commodities",label: "Commodities" },
  { key: "forex",      label: "Forex" },
  { key: "crypto",     label: "Crypto" },
];

const Z: Pick<Instrument, "price" | "change" | "volume" | "high" | "low"> = { price: 0, change: 0, volume: "—", high: 0, low: 0 };

export const watchlists: Record<WatchlistKey, Instrument[]> = {
  indices: [
    { symbol: "NIFTY 50",    title: "NIFTY 50",      subtitle: "NSE Index",  ...Z },
    { symbol: "SENSEX",      title: "SENSEX",         subtitle: "BSE Index",  ...Z },
    { symbol: "BANK NIFTY",  title: "BANK NIFTY",     subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY IT",    title: "NIFTY IT",       subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY PHARMA",title: "NIFTY PHARMA",   subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY AUTO",  title: "NIFTY AUTO",     subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY METAL", title: "NIFTY METAL",    subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY FMCG",  title: "NIFTY FMCG",    subtitle: "NSE Index",  ...Z },
    { symbol: "NIFTY ENERGY",title: "NIFTY ENERGY",   subtitle: "NSE Index",  ...Z },
  ],
  stocks: [
    // ── Banking & Finance ──
    { symbol: "HDFCBANK",   title: "HDFC Bank",            subtitle: "NSE", ...Z, sector: "Banking" },
    { symbol: "ICICIBANK",  title: "ICICI Bank",           subtitle: "NSE", ...Z, sector: "Banking" },
    { symbol: "SBIN",       title: "State Bank of India",  subtitle: "NSE", ...Z, sector: "Banking" },
    { symbol: "KOTAKBANK",  title: "Kotak Mahindra Bank",  subtitle: "NSE", ...Z, sector: "Banking" },
    { symbol: "AXISBANK",   title: "Axis Bank",            subtitle: "NSE", ...Z, sector: "Banking" },
    { symbol: "BAJFINANCE", title: "Bajaj Finance",        subtitle: "NSE", ...Z, sector: "Finance" },
    { symbol: "BAJAJFINSV", title: "Bajaj Finserv",        subtitle: "NSE", ...Z, sector: "Finance" },
    { symbol: "HDFCLIFE",   title: "HDFC Life Insurance",  subtitle: "NSE", ...Z, sector: "Finance" },
    { symbol: "SBILIFE",    title: "SBI Life Insurance",   subtitle: "NSE", ...Z, sector: "Finance" },
    { symbol: "INDUSINDBK", title: "IndusInd Bank",        subtitle: "NSE", ...Z, sector: "Banking" },

    // ── IT ──
    { symbol: "TCS",        title: "Tata Consultancy",     subtitle: "NSE", ...Z, sector: "IT" },
    { symbol: "INFY",       title: "Infosys",              subtitle: "NSE", ...Z, sector: "IT" },
    { symbol: "WIPRO",      title: "Wipro",                subtitle: "NSE", ...Z, sector: "IT" },
    { symbol: "HCLTECH",    title: "HCL Technologies",     subtitle: "NSE", ...Z, sector: "IT" },
    { symbol: "TECHM",      title: "Tech Mahindra",        subtitle: "NSE", ...Z, sector: "IT" },

    // ── Oil & Gas / Energy ──
    { symbol: "RELIANCE",   title: "Reliance Industries",  subtitle: "NSE", ...Z, sector: "Oil & Gas" },
    { symbol: "ONGC",       title: "ONGC",                 subtitle: "NSE", ...Z, sector: "Oil & Gas" },
    { symbol: "BPCL",       title: "BPCL",                 subtitle: "NSE", ...Z, sector: "Oil & Gas" },
    { symbol: "NTPC",       title: "NTPC",                 subtitle: "NSE", ...Z, sector: "Power" },
    { symbol: "POWERGRID",  title: "Power Grid Corp",      subtitle: "NSE", ...Z, sector: "Power" },
    { symbol: "TATAPOWER",  title: "Tata Power",           subtitle: "NSE", ...Z, sector: "Power" },
    { symbol: "COALINDIA",  title: "Coal India",           subtitle: "NSE", ...Z, sector: "Mining" },
    { symbol: "ADANIENT",   title: "Adani Enterprises",    subtitle: "NSE", ...Z, sector: "Conglomerate" },
    { symbol: "ADANIPORTS", title: "Adani Ports",          subtitle: "NSE", ...Z, sector: "Infra" },

    // ── Auto ──
    { symbol: "TMCV",       title: "Tata Motors CV",       subtitle: "NSE", ...Z, sector: "Auto" },
    { symbol: "MARUTI",     title: "Maruti Suzuki",        subtitle: "NSE", ...Z, sector: "Auto" },
    { symbol: "M&M",        title: "Mahindra & Mahindra",  subtitle: "NSE", ...Z, sector: "Auto" },
    { symbol: "EICHERMOT",  title: "Eicher Motors",        subtitle: "NSE", ...Z, sector: "Auto" },
    { symbol: "HEROMOTOCO", title: "Hero MotoCorp",        subtitle: "NSE", ...Z, sector: "Auto" },

    // ── Pharma ──
    { symbol: "SUNPHARMA",  title: "Sun Pharma",           subtitle: "NSE", ...Z, sector: "Pharma" },
    { symbol: "DRREDDY",    title: "Dr Reddy's Labs",      subtitle: "NSE", ...Z, sector: "Pharma" },
    { symbol: "CIPLA",      title: "Cipla",                subtitle: "NSE", ...Z, sector: "Pharma" },
    { symbol: "DIVISLAB",   title: "Divi's Labs",          subtitle: "NSE", ...Z, sector: "Pharma" },
    { symbol: "APOLLOHOSP", title: "Apollo Hospitals",     subtitle: "NSE", ...Z, sector: "Healthcare" },

    // ── FMCG ──
    { symbol: "HINDUNILVR", title: "Hindustan Unilever",   subtitle: "NSE", ...Z, sector: "FMCG" },
    { symbol: "ITC",        title: "ITC Ltd",              subtitle: "NSE", ...Z, sector: "FMCG" },
    { symbol: "NESTLEIND",  title: "Nestle India",         subtitle: "NSE", ...Z, sector: "FMCG" },
    { symbol: "BRITANNIA",  title: "Britannia Industries", subtitle: "NSE", ...Z, sector: "FMCG" },
    { symbol: "TATACONSUM", title: "Tata Consumer",        subtitle: "NSE", ...Z, sector: "FMCG" },
    { symbol: "DABUR",      title: "Dabur India",          subtitle: "NSE", ...Z, sector: "FMCG" },

    // ── Metals & Cement ──
    { symbol: "TATASTEEL",  title: "Tata Steel",           subtitle: "NSE", ...Z, sector: "Metals" },
    { symbol: "JSWSTEEL",   title: "JSW Steel",            subtitle: "NSE", ...Z, sector: "Metals" },
    { symbol: "HINDALCO",   title: "Hindalco",             subtitle: "NSE", ...Z, sector: "Metals" },
    { symbol: "VEDL",       title: "Vedanta Ltd",          subtitle: "NSE", ...Z, sector: "Metals" },
    { symbol: "ULTRACEMCO", title: "UltraTech Cement",     subtitle: "NSE", ...Z, sector: "Cement" },
    { symbol: "GRASIM",     title: "Grasim Industries",    subtitle: "NSE", ...Z, sector: "Cement" },

    // ── Infra & Construction ──
    { symbol: "LT",         title: "Larsen & Toubro",      subtitle: "NSE", ...Z, sector: "Infra" },

    // ── Telecom ──
    { symbol: "BHARTIARTL", title: "Bharti Airtel",        subtitle: "NSE", ...Z, sector: "Telecom" },

    // ── Consumer / Retail ──
    { symbol: "TITAN",      title: "Titan Company",        subtitle: "NSE", ...Z, sector: "Consumer" },
    { symbol: "ASIANPAINT", title: "Asian Paints",         subtitle: "NSE", ...Z, sector: "Consumer" },
    { symbol: "PIDILITIND", title: "Pidilite Industries",  subtitle: "NSE", ...Z, sector: "Consumer" },
    { symbol: "HAVELLS",    title: "Havells India",        subtitle: "NSE", ...Z, sector: "Consumer" },

    // ── New Age / Tech ──
    { symbol: "ETERNAL",    title: "Eternal (Zomato)",     subtitle: "NSE", ...Z, sector: "Consumer Tech" },
    { symbol: "DMART",      title: "Avenue Supermarts",    subtitle: "NSE", ...Z, sector: "Retail" },
    { symbol: "IRCTC",      title: "IRCTC",                subtitle: "NSE", ...Z, sector: "Travel" },
    { symbol: "INDIGO",     title: "IndiGo",               subtitle: "NSE", ...Z, sector: "Aviation" },

    // ── Defence ──
    { symbol: "HAL",        title: "Hindustan Aero",       subtitle: "NSE", ...Z, sector: "Defence" },
    { symbol: "BEL",        title: "Bharat Electronics",   subtitle: "NSE", ...Z, sector: "Defence" },
  ],
  stockFut: [
    { symbol: "RELIANCE FUT",  title: "RELIANCE FUT",  subtitle: "Current month", ...Z },
    { symbol: "TCS FUT",       title: "TCS FUT",       subtitle: "Current month", ...Z },
    { symbol: "HDFCBANK FUT",  title: "HDFCBANK FUT",  subtitle: "Current month", ...Z },
    { symbol: "INFY FUT",      title: "INFY FUT",      subtitle: "Current month", ...Z },
    { symbol: "ICICIBANK FUT", title: "ICICIBANK FUT", subtitle: "Current month", ...Z },
    { symbol: "SBIN FUT",      title: "SBIN FUT",      subtitle: "Current month", ...Z },
    { symbol: "BAJFINANCE FUT",title: "BAJFINANCE FUT",subtitle: "Current month", ...Z },
    { symbol: "TMCV FUT",     title: "TMCV FUT",     subtitle: "Current month", ...Z },
    { symbol: "TATASTEEL FUT", title: "TATASTEEL FUT", subtitle: "Current month", ...Z },
    { symbol: "ITC FUT",       title: "ITC FUT",       subtitle: "Current month", ...Z },
  ],
  stockOpt: [
    { symbol: "RELIANCE CE ATM", title: "RELIANCE CE (ATM)", subtitle: "Call option", ...Z },
    { symbol: "RELIANCE PE ATM", title: "RELIANCE PE (ATM)", subtitle: "Put option",  ...Z },
    { symbol: "HDFCBANK CE ATM", title: "HDFCBANK CE (ATM)", subtitle: "Call option", ...Z },
    { symbol: "TCS CE ATM",      title: "TCS CE (ATM)",      subtitle: "Call option", ...Z },
    { symbol: "INFY PE ATM",     title: "INFY PE (ATM)",     subtitle: "Put option",  ...Z },
    { symbol: "SBIN CE ATM",     title: "SBIN CE (ATM)",     subtitle: "Call option", ...Z },
    { symbol: "BAJFINANCE CE ATM",title: "BAJFINANCE CE (ATM)",subtitle: "Call option", ...Z },
    { symbol: "ITC PE ATM",      title: "ITC PE (ATM)",      subtitle: "Put option",  ...Z },
  ],
  commodities: [
    { symbol: "GOLD",       title: "Gold (Intl)",      subtitle: "Commodity", ...Z },
    { symbol: "SILVER",     title: "Silver (Intl)",    subtitle: "Commodity", ...Z },
    { symbol: "CRUDEOIL",   title: "Crude Oil (WTI)",  subtitle: "Commodity", ...Z },
    { symbol: "NATURALGAS", title: "Natural Gas",      subtitle: "Commodity", ...Z },
    { symbol: "COPPER",     title: "Copper",           subtitle: "Commodity", ...Z },
  ],
  forex: [
    { symbol: "USDINR", title: "USD/INR", subtitle: "Forex", ...Z },
    { symbol: "EURINR", title: "EUR/INR", subtitle: "Forex", ...Z },
    { symbol: "GBPINR", title: "GBP/INR", subtitle: "Forex", ...Z },
    { symbol: "JPYINR", title: "JPY/INR", subtitle: "Forex", ...Z },
    { symbol: "EURUSD", title: "EUR/USD", subtitle: "Forex", ...Z },
    { symbol: "GBPUSD", title: "GBP/USD", subtitle: "Forex", ...Z },
  ],
  crypto: [
    { symbol: "BTCINR",  title: "Bitcoin (INR)",  subtitle: "Crypto", ...Z },
    { symbol: "ETHINR",  title: "Ethereum (INR)", subtitle: "Crypto", ...Z },
    { symbol: "BTCUSD",  title: "Bitcoin (USD)",  subtitle: "Crypto", ...Z },
    { symbol: "ETHUSD",  title: "Ethereum (USD)", subtitle: "Crypto", ...Z },
    { symbol: "SOLUSD",  title: "Solana (USD)",   subtitle: "Crypto", ...Z },
    { symbol: "XRPUSD",  title: "XRP (USD)",      subtitle: "Crypto", ...Z },
  ],
};

export const allInstruments: Instrument[] = Object.values(watchlists).flat();

export const equityInstruments = watchlists.stocks;
export const equitySymbols = equityInstruments.map((i) => i.symbol);
export const indexInstruments = watchlists.indices;
export const indexSymbols = indexInstruments.map((i) => i.symbol);

// ─── Derivative helpers ─────────────────────────────────────────────────────

export function getDerivativeSpotSymbol(symbol: string): string | null {
  if (symbol.endsWith(" FUT")) return symbol.replace(/\s+FUT$/, "");
  const m = symbol.match(/^(.*?)\s+(CE|PE)\s+ATM$/);
  return m?.[1]?.trim() ?? null;
}

export function getUpcomingMonthlyExpiries(count = 4): string[] {
  const result: string[] = [];
  const cursor = new Date();
  const getLastThursday = (year: number, month: number) => {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    return d;
  };
  while (result.length < count) {
    const exp = getLastThursday(cursor.getFullYear(), cursor.getMonth());
    if (exp.getTime() >= Date.now()) {
      result.push(exp.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
    }
    cursor.setMonth(cursor.getMonth() + 1, 1);
  }
  return result;
}

// ─── Contract metadata (lot sizes: NSE F&O) ─────────────────────────────────

export type ContractMeta = {
  lotSize: number;
  product: "CASH" | "FUT" | "OPT" | "INDEX" | "COMMODITY" | "CRYPTO" | "FOREX";
  marginRate: number;
  tradableLabel: string;
};

// NSE F&O lot sizes (as of 2024-25, approximate)
const NSE_LOT_SIZES: Record<string, number> = {
  RELIANCE: 250, TCS: 150, HDFCBANK: 550, INFY: 300, ICICIBANK: 700,
  SBIN: 1500, BAJFINANCE: 125, TMCV: 1375, TATASTEEL: 5500,
  ITC: 1600, HINDUNILVR: 300, MARUTI: 100, WIPRO: 1500, SUNPHARMA: 700,
  AXISBANK: 1200, KOTAKBANK: 400, LT: 150, BHARTIARTL: 950,
  ASIANPAINT: 300, TITAN: 175, ADANIENT: 250, HCLTECH: 350, TECHM: 600,
  CIPLA: 650, DRREDDY: 125, NESTLEIND: 40, BAJAJFINSV: 500,
  "NIFTY 50": 25, "BANK NIFTY": 15,
};

function normalizeFnoSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function resolveLotSize(symbol: string): number | undefined {
  const direct = NSE_LOT_SIZES[symbol];
  if (direct) return direct;

  const spot = getDerivativeSpotSymbol(symbol);
  if (spot && NSE_LOT_SIZES[spot]) return NSE_LOT_SIZES[spot];

  const normalized = normalizeFnoSymbol(symbol);
  const normalizedSpot = normalizeFnoSymbol(spot ?? "");

  for (const [key, value] of Object.entries(NSE_LOT_SIZES)) {
    const normalizedKey = normalizeFnoSymbol(key);
    if (normalizedKey === normalized || normalizedKey === normalizedSpot) {
      return value;
    }
  }

  if (normalized.includes("BANKNIFTY")) return 30;
  if (normalized.includes("FINNIFTY")) return 60;
  if (normalized.includes("MIDCPNIFTY")) return 120;
  if (normalized.includes("SENSEX")) return 20;
  if (normalized.includes("NIFTY")) return 75;

  return undefined;
}

export function getContractMeta(instrument: Instrument): ContractMeta {
  const sym = instrument.symbol;
  const normalizedSym = normalizeFnoSymbol(sym);
  const isOption = instrument.subtitle.toLowerCase().includes("option");
  const isFuture = instrument.subtitle.toLowerCase().includes("current month");
  const isDerivative = isOption || isFuture;

  if (isDerivative) {
    const lotSize = resolveLotSize(sym) ?? 500;
    return {
      lotSize,
      product: isOption ? "OPT" : "FUT",
      marginRate: isFuture ? 0.18 : 1,
      tradableLabel: `${lotSize} qty / lot`,
    };
  }

  if (normalizedSym.includes("BANKNIFTY")) {
    return { lotSize: 30, product: "INDEX", marginRate: 1, tradableLabel: "30 qty / lot" };
  }
  if (normalizedSym.includes("FINNIFTY")) {
    return { lotSize: 60, product: "INDEX", marginRate: 1, tradableLabel: "60 qty / lot" };
  }
  if (normalizedSym.includes("MIDCPNIFTY")) {
    return { lotSize: 120, product: "INDEX", marginRate: 1, tradableLabel: "120 qty / lot" };
  }
  if (normalizedSym.includes("SENSEX")) {
    return { lotSize: 20, product: "INDEX", marginRate: 1, tradableLabel: "20 qty / lot" };
  }
  if (normalizedSym.includes("NIFTY")) {
    return { lotSize: 75, product: "INDEX", marginRate: 1, tradableLabel: "75 qty / lot" };
  }
  if (instrument.subtitle === "Commodity") return { lotSize: 1, product: "COMMODITY", marginRate: 1, tradableLabel: "1 unit" };
  if (instrument.subtitle === "Crypto")    return { lotSize: 1, product: "CRYPTO",    marginRate: 1, tradableLabel: "1 unit" };
  if (instrument.subtitle === "Forex")     return { lotSize: 1, product: "FOREX",     marginRate: 1, tradableLabel: "1 unit" };
  return { lotSize: 1, product: "CASH", marginRate: 1, tradableLabel: "1 share" };
}

// ─── Sector metadata ────────────────────────────────────────────────────────
export const sectorData = [
  { name: "Banking",   change: 0, marketCap: "—", stocks: ["HDFCBANK","ICICIBANK","SBIN","KOTAKBANK","AXISBANK"] },
  { name: "IT",        change: 0, marketCap: "—", stocks: ["TCS","INFY","WIPRO","HCLTECH","TECHM"] },
  { name: "Oil & Gas", change: 0, marketCap: "—", stocks: ["RELIANCE","ONGC","BPCL"] },
  { name: "Auto",      change: 0, marketCap: "—", stocks: ["TMCV","MARUTI","M&M","EICHERMOT"] },
  { name: "Pharma",    change: 0, marketCap: "—", stocks: ["SUNPHARMA","DRREDDY","CIPLA","DIVISLAB"] },
  { name: "FMCG",      change: 0, marketCap: "—", stocks: ["HINDUNILVR","ITC","NESTLEIND","BRITANNIA"] },
  { name: "Metals",    change: 0, marketCap: "—", stocks: ["TATASTEEL","JSWSTEEL","HINDALCO","VEDL"] },
  { name: "Power",     change: 0, marketCap: "—", stocks: ["NTPC","POWERGRID","TATAPOWER"] },
  { name: "Infra",     change: 0, marketCap: "—", stocks: ["LT","ADANIPORTS"] },
  { name: "Telecom",   change: 0, marketCap: "—", stocks: ["BHARTIARTL"] },
  { name: "Consumer",  change: 0, marketCap: "—", stocks: ["TITAN","ASIANPAINT","PIDILITIND"] },
  { name: "Defence",   change: 0, marketCap: "—", stocks: ["HAL","BEL"] },
];

