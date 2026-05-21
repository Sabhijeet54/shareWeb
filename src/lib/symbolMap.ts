// ─── SYMBOL MAPPING: Internal → Provider ────────────────────────────────────
// Primary: Yahoo Finance (NSE .NS, BSE .BO, commodities, forex, crypto)
// Fallback: Finnhub (limited free-tier Indian support)

export const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // ── NSE Indices ──
  "NIFTY 50":     "^NSEI",
  "SENSEX":       "^BSESN",
  "BANK NIFTY":   "^NSEBANK",
  "NIFTY IT":     "^CNXIT",
  "NIFTY PHARMA": "^CNXPHARMA",
  "NIFTY AUTO":   "^CNXAUTO",
  "NIFTY METAL":  "^CNXMETAL",
  "NIFTY REALTY":  "^CNXREALTY",
  "NIFTY ENERGY": "^CNXENERGY",
  "NIFTY FMCG":   "^CNXFMCG",

  // ── NSE Equities ──
  RELIANCE:    "RELIANCE.NS",
  TCS:         "TCS.NS",
  HDFCBANK:    "HDFCBANK.NS",
  INFY:        "INFY.NS",
  ICICIBANK:   "ICICIBANK.NS",
  HINDUNILVR:  "HINDUNILVR.NS",
  SBIN:        "SBIN.NS",
  BHARTIARTL:  "BHARTIARTL.NS",
  ITC:         "ITC.NS",
  KOTAKBANK:   "KOTAKBANK.NS",
  LT:          "LT.NS",
  AXISBANK:    "AXISBANK.NS",
  ASIANPAINT:  "ASIANPAINT.NS",
  MARUTI:      "MARUTI.NS",
  TITAN:       "TITAN.NS",
  SUNPHARMA:   "SUNPHARMA.NS",
  BAJFINANCE:  "BAJFINANCE.NS",
  WIPRO:       "WIPRO.NS",
  HCLTECH:     "HCLTECH.NS",
  ULTRACEMCO:  "ULTRACEMCO.NS",
  TATAMOTORS:  "TATAMOTORS.NS",
  TATASTEEL:   "TATASTEEL.NS",
  NTPC:        "NTPC.NS",
  POWERGRID:   "POWERGRID.NS",
  ONGC:        "ONGC.NS",
  JSWSTEEL:    "JSWSTEEL.NS",
  ADANIENT:    "ADANIENT.NS",
  ADANIPORTS:  "ADANIPORTS.NS",
  BAJAJFINSV:  "BAJAJFINSV.NS",
  TECHM:       "TECHM.NS",
  NESTLEIND:   "NESTLEIND.NS",
  "M&M":       "M%26M.NS",
  HDFCLIFE:    "HDFCLIFE.NS",
  DRREDDY:     "DRREDDY.NS",
  DIVISLAB:    "DIVISLAB.NS",
  APOLLOHOSP:  "APOLLOHOSP.NS",
  HEROMOTOCO:  "HEROMOTOCO.NS",
  CIPLA:       "CIPLA.NS",
  TATACONSUM:  "TATACONSUM.NS",
  EICHERMOT:   "EICHERMOT.NS",
  SBILIFE:     "SBILIFE.NS",
  BPCL:        "BPCL.NS",
  BRITANNIA:   "BRITANNIA.NS",
  GRASIM:      "GRASIM.NS",
  COALINDIA:   "COALINDIA.NS",
  HINDALCO:    "HINDALCO.NS",
  INDUSINDBK:  "INDUSINDBK.NS",
  VEDL:        "VEDL.NS",
  ZOMATO:      "ZOMATO.NS",
  IRCTC:       "IRCTC.NS",
  TATAPOWER:   "TATAPOWER.NS",
  DMART:       "DMART.NS",
  PIDILITIND:  "PIDILITIND.NS",
  HAVELLS:     "HAVELLS.NS",
  DABUR:       "DABUR.NS",
  BANKBARODA:  "BANKBARODA.NS",
  PNB:         "PNB.NS",
  INDIGO:      "INDIGO.NS",
  HAL:         "HAL.NS",
  BEL:         "BEL.NS",

  // ── Commodities ──
  GOLD:        "GC=F",
  SILVER:      "SI=F",
  CRUDEOIL:    "CL=F",
  NATURALGAS:  "NG=F",
  COPPER:      "HG=F",

  // ── Forex ──
  USDINR:      "USDINR=X",
  EURINR:      "EURINR=X",
  GBPINR:      "GBPINR=X",
  JPYINR:      "JPYINR=X",
  EURUSD:      "EURUSD=X",
  GBPUSD:      "GBPUSD=X",

  // ── Crypto ──
  BTCINR:      "BTC-INR",
  ETHINR:      "ETH-INR",
  BTCUSD:      "BTC-USD",
  ETHUSD:      "ETH-USD",
  SOLUSD:      "SOL-USD",
  XRPUSD:      "XRP-USD",
};

// Keep FINNHUB_SYMBOL_MAP for backward-compat (some components reference it)
export const FINNHUB_SYMBOL_MAP: Record<string, string> = { ...YAHOO_SYMBOL_MAP };

// Resolve internal symbol → Yahoo Finance symbol
export function toYahoo(symbol: string): string {
  if (YAHOO_SYMBOL_MAP[symbol]) return YAHOO_SYMBOL_MAP[symbol];
  if (symbol.includes(".") || symbol.startsWith("^") || symbol.includes("=") || symbol.includes("-")) return symbol;
  return symbol + ".NS";
}

// Alias for backward compat — routes & hooks call toFinnhub()
export function toFinnhub(symbol: string): string {
  return toYahoo(symbol);
}

// ─── Currency sign helper ────────────────────────────────────────────────────
// Returns the correct currency symbol for display based on the instrument
const USD_SYMBOLS = new Set([
  "GOLD", "SILVER", "CRUDEOIL", "NATURALGAS", "COPPER",  // commodities
  "BTCUSD", "ETHUSD", "SOLUSD", "XRPUSD",               // crypto (USD pairs)
  "EURUSD", "GBPUSD",                                     // forex (USD denominated)
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
