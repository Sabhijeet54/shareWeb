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
<<<<<<< Updated upstream
  { key: "indices", label: "Indices" },
  { key: "indexFut", label: "Index Fut" },
  { key: "indexOpt", label: "Index Opt" },
  { key: "stocks", label: "Stocks" },
  { key: "stockFut", label: "Stock Fut" },
  { key: "stockOpt", label: "Stock Opt" },
  { key: "commodities", label: "Commodities" },
  { key: "crypto", label: "Crypto" },
=======
  { key: "indices",    label: "Indices" },
  { key: "stocks",     label: "Stocks" },
  { key: "stockFut",   label: "F&O" },
  { key: "stockOpt",   label: "Options" },
  { key: "commodities",label: "Commodities" },
  { key: "forex",      label: "Forex" },
  { key: "crypto",     label: "Crypto" },
>>>>>>> Stashed changes
];

const Z: Pick<Instrument, "price" | "change" | "volume" | "high" | "low"> = { price: 0, change: 0, volume: "—", high: 0, low: 0 };

export const watchlists: Record<WatchlistKey, Instrument[]> = {
  indices: [
<<<<<<< Updated upstream
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
=======
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
    { symbol: "TATAMOTORS", title: "Tata Motors",          subtitle: "NSE", ...Z, sector: "Auto" },
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
    { symbol: "ZOMATO",     title: "Zomato",               subtitle: "NSE", ...Z, sector: "Consumer Tech" },
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
    { symbol: "TATAMOTORS FUT",title: "TATAMOTORS FUT",subtitle: "Current month", ...Z },
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
>>>>>>> Stashed changes
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
  SBIN: 1500, BAJFINANCE: 125, TATAMOTORS: 1375, TATASTEEL: 5500,
  ITC: 1600, HINDUNILVR: 300, MARUTI: 100, WIPRO: 1500, SUNPHARMA: 700,
  AXISBANK: 1200, KOTAKBANK: 400, LT: 150, BHARTIARTL: 950,
  ASIANPAINT: 300, TITAN: 175, ADANIENT: 250, HCLTECH: 350, TECHM: 600,
  CIPLA: 650, DRREDDY: 125, NESTLEIND: 40, BAJAJFINSV: 500,
  "NIFTY 50": 25, "BANK NIFTY": 15,
};

export function getContractMeta(instrument: Instrument): ContractMeta {
  const sym = instrument.symbol;
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
<<<<<<< Updated upstream
    const stockLots: Record<string, number> = {
      RELIANCE: 500, TCS: 175, HDFCBANK: 550, SBIN: 1500,
      WIPRO: 1600, AXISBANK: 1200, MARUTI: 100, SUNPHARMA: 700,
      BAJFINANCE: 125, KOTAKBANK: 400, INFY: 400,
    };
    const lotSize = Object.entries(stockLots).find(([key]) => symbol.includes(key))?.[1] ?? 500;
=======
    const spotKey = getDerivativeSpotSymbol(sym) ?? sym;
    const lotSize = NSE_LOT_SIZES[spotKey] ?? 500;
>>>>>>> Stashed changes
    return { lotSize, product: isOption ? "OPT" : "FUT", marginRate: isFuture ? 0.18 : 1, tradableLabel: `${lotSize} qty / lot` };
  }
  if (instrument.subtitle === "Commodity") return { lotSize: 1, product: "COMMODITY", marginRate: 1, tradableLabel: "1 unit" };
  if (instrument.subtitle === "Crypto")    return { lotSize: 1, product: "CRYPTO",    marginRate: 1, tradableLabel: "1 unit" };
  if (instrument.subtitle === "Forex")     return { lotSize: 1, product: "FOREX",     marginRate: 1, tradableLabel: "1 unit" };
  return { lotSize: 1, product: "CASH", marginRate: 1, tradableLabel: "1 share" };
}

// ─── Sector metadata ────────────────────────────────────────────────────────
export const sectorData = [
<<<<<<< Updated upstream
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
=======
  { name: "Banking",   change: 0, marketCap: "—", stocks: ["HDFCBANK","ICICIBANK","SBIN","KOTAKBANK","AXISBANK"] },
  { name: "IT",        change: 0, marketCap: "—", stocks: ["TCS","INFY","WIPRO","HCLTECH","TECHM"] },
  { name: "Oil & Gas", change: 0, marketCap: "—", stocks: ["RELIANCE","ONGC","BPCL"] },
  { name: "Auto",      change: 0, marketCap: "—", stocks: ["TATAMOTORS","MARUTI","M&M","EICHERMOT"] },
  { name: "Pharma",    change: 0, marketCap: "—", stocks: ["SUNPHARMA","DRREDDY","CIPLA","DIVISLAB"] },
  { name: "FMCG",      change: 0, marketCap: "—", stocks: ["HINDUNILVR","ITC","NESTLEIND","BRITANNIA"] },
  { name: "Metals",    change: 0, marketCap: "—", stocks: ["TATASTEEL","JSWSTEEL","HINDALCO","VEDL"] },
  { name: "Power",     change: 0, marketCap: "—", stocks: ["NTPC","POWERGRID","TATAPOWER"] },
  { name: "Infra",     change: 0, marketCap: "—", stocks: ["LT","ADANIPORTS"] },
  { name: "Telecom",   change: 0, marketCap: "—", stocks: ["BHARTIARTL"] },
  { name: "Consumer",  change: 0, marketCap: "—", stocks: ["TITAN","ASIANPAINT","PIDILITIND"] },
  { name: "Defence",   change: 0, marketCap: "—", stocks: ["HAL","BEL"] },
>>>>>>> Stashed changes
];

// ─── Options chain (Black-Scholes based) ────────────────────────────────────
export function generateOptionsChain(spotPrice: number, expiryLabel: string, ivPercent = 18) {
  if (spotPrice <= 0) return [];
  const strikes = [];
  const step = spotPrice > 5000 ? 100 : spotPrice > 1000 ? 50 : spotPrice > 500 ? 25 : 10;
  const atmStrike = Math.round(spotPrice / step) * step;
  const sigma = ivPercent / 100;

  const expDate = new Date(expiryLabel);
  const now = new Date();
  const T = Math.max(1, (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const r = 0.065;

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
      ce: Math.max(0.05, ce), pe: Math.max(0.05, pe),
      delta_ce: normCDF(d1), delta_pe: normCDF(d1) - 1,
      gamma: Math.exp(-d1 * d1 / 2) / (S * sigma * sqrtT * Math.sqrt(2 * Math.PI)),
      theta_ce: -(S * sigma * Math.exp(-d1 * d1 / 2)) / (2 * sqrtT * Math.sqrt(2 * Math.PI)) - r * K * Math.exp(-r * T) * normCDF(d2),
      vega: S * sqrtT * Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI),
    };
  }

  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + i * step;
    const isATM = i === 0;
    const smileSigma = sigma * (1 + 0.02 * Math.abs(i));
    const bs = blackScholes(spotPrice, strike, T, r, smileSigma);
    const oiBase = Math.round(Math.max(10, 80 - Math.abs(i) * 5));
    strikes.push({
      strike, expiry: expiryLabel, isATM,
      ce: {
        premium: parseFloat(bs.ce.toFixed(2)), iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: oiBase + "L", oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: Math.max(1, Math.round(oiBase * 0.15)) + "L",
        delta: parseFloat((bs.delta_ce ?? 0.5).toFixed(3)), gamma: parseFloat((bs.gamma ?? 0.002).toFixed(4)),
        theta: parseFloat(((bs.theta_ce ?? -15) / 365).toFixed(2)), vega: parseFloat(((bs.vega ?? 8) / 100).toFixed(2)),
      },
      pe: {
        premium: parseFloat(bs.pe.toFixed(2)), iv: parseFloat((smileSigma * 100).toFixed(1)),
        oi: Math.round(oiBase * 0.9) + "L", oiChange: parseFloat((Math.random() * 10 - 5).toFixed(1)),
        volume: Math.max(1, Math.round(oiBase * 0.12)) + "L",
        delta: parseFloat((bs.delta_pe ?? -0.5).toFixed(3)), gamma: parseFloat((bs.gamma ?? 0.002).toFixed(4)),
        theta: parseFloat(((bs.theta_ce ?? -15) / 365).toFixed(2)), vega: parseFloat(((bs.vega ?? 8) / 100).toFixed(2)),
      },
    });
  }
  return strikes;
}
