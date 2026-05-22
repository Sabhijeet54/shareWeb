// ─── SYMBOL MAPPING: Internal App Symbols ───────────────────────────────────
// Maps internal symbols to their properties.
// Provider: Upstox.

/** All tradeable symbols recognized by the app. */
export const SYMBOL_MAP: Record<string, string> = {
  // ── Indices ──
  "NIFTY 50":     "NIFTY",
  "SENSEX":       "SENSEX",
  "BANK NIFTY":   "BANKNIFTY",
  "NIFTY IT":     "NIFTY IT",
  "NIFTY PHARMA": "NIFTY PHARMA",
  "NIFTY AUTO":   "NIFTY AUTO",
  "NIFTY METAL":  "NIFTY METAL",
  "NIFTY REALTY":  "NIFTY REALTY",
  "NIFTY ENERGY": "NIFTY ENERGY",
  "NIFTY FMCG":   "NIFTY FMCG",

  // ── Equities ──
  RELIANCE:    "RELIANCE",
  TCS:         "TCS",
  HDFCBANK:    "HDFCBANK",
  INFY:        "INFY",
  ICICIBANK:   "ICICIBANK",
  HINDUNILVR:  "HINDUNILVR",
  SBIN:        "SBIN",
  BHARTIARTL:  "BHARTIARTL",
  ITC:         "ITC",
  KOTAKBANK:   "KOTAKBANK",
  LT:          "LT",
  AXISBANK:    "AXISBANK",
  ASIANPAINT:  "ASIANPAINT",
  MARUTI:      "MARUTI",
  TITAN:       "TITAN",
  SUNPHARMA:   "SUNPHARMA",
  BAJFINANCE:  "BAJFINANCE",
  WIPRO:       "WIPRO",
  HCLTECH:     "HCLTECH",
  ULTRACEMCO:  "ULTRACEMCO",
  TMCV:        "TMCV",
  TATASTEEL:   "TATASTEEL",
  NTPC:        "NTPC",
  POWERGRID:   "POWERGRID",
  ONGC:        "ONGC",
  JSWSTEEL:    "JSWSTEEL",
  ADANIENT:    "ADANIENT",
  ADANIPORTS:  "ADANIPORTS",
  BAJAJFINSV:  "BAJAJFINSV",
  TECHM:       "TECHM",
  NESTLEIND:   "NESTLEIND",
  "M&M":       "M&M",
  HDFCLIFE:    "HDFCLIFE",
  DRREDDY:     "DRREDDY",
  DIVISLAB:    "DIVISLAB",
  APOLLOHOSP:  "APOLLOHOSP",
  HEROMOTOCO:  "HEROMOTOCO",
  CIPLA:       "CIPLA",
  TATACONSUM:  "TATACONSUM",
  EICHERMOT:   "EICHERMOT",
  SBILIFE:     "SBILIFE",
  BPCL:        "BPCL",
  BRITANNIA:   "BRITANNIA",
  GRASIM:      "GRASIM",
  COALINDIA:   "COALINDIA",
  HINDALCO:    "HINDALCO",
  INDUSINDBK:  "INDUSINDBK",
  VEDL:        "VEDL",
  ETERNAL:     "ETERNAL",
  IRCTC:       "IRCTC",
  TATAPOWER:   "TATAPOWER",
  DMART:       "DMART",
  PIDILITIND:  "PIDILITIND",
  HAVELLS:     "HAVELLS",
  DABUR:       "DABUR",
  BANKBARODA:  "BANKBARODA",
  PNB:         "PNB",
  INDIGO:      "INDIGO",
  HAL:         "HAL",
  BEL:         "BEL",

  // ── Commodities (MCX) ──
  GOLD:        "GOLD",
  SILVER:      "SILVER",
  CRUDEOIL:    "CRUDEOIL",
  NATURALGAS:  "NATURALGAS",
  COPPER:      "COPPER",

  // ── Forex ──
  USDINR:      "USDINR",
  EURINR:      "EURINR",
  GBPINR:      "GBPINR",
  JPYINR:      "JPYINR",
  EURUSD:      "EURUSD",
  GBPUSD:      "GBPUSD",

  // ── Crypto ──
  BTCINR:      "BTCINR",
  ETHINR:      "ETHINR",
  BTCUSD:      "BTCUSD",
  ETHUSD:      "ETHUSD",
  SOLUSD:      "SOLUSD",
  XRPUSD:      "XRPUSD",
};

// ─── Currency sign helper ────────────────────────────────────────────────────
const USD_SYMBOLS = new Set([
  "GOLD", "SILVER", "CRUDEOIL", "NATURALGAS", "COPPER",
  "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD",
  "EURUSD", "GBPUSD",
]);

export function getCurrencySign(symbol: string): string {
  if (USD_SYMBOLS.has(symbol)) return "$";
  return "₹";
}

// Chart interval configuration
export const CHART_INTERVALS = [
  { label: "1m",  value: "1m",  range: "1d" },
  { label: "5m",  value: "5m",  range: "1d" },
  { label: "15m", value: "15m", range: "5d" },
  { label: "30m", value: "30m", range: "5d" },
  { label: "1hr", value: "60m", range: "1mo" },
  { label: "1D",  value: "1d",  range: "6mo" },
  { label: "1W",  value: "1wk", range: "2y" },
  { label: "1M",  value: "1mo", range: "5y" },
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number];
