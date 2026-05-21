<<<<<<< Updated upstream
// Maps internal app symbols → Yahoo Finance ticker symbols
// Yahoo Finance gives free real-time data for NSE/BSE stocks + indices
// NSE stocks use .NS suffix, BSE use .BO suffix
// Indices use ^ prefix

export const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Indices
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
  FINNIFTY: "NIFTY_FIN_SERVICE.NS",
  MIDCPNIFTY: "^CNXMIDCAP",
  INDIAVIX: "^INDIAVIX",

  // Large-cap NSE stocks
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  HDFCBANK: "HDFCBANK.NS",
  INFY: "INFY.NS",
  ICICIBANK: "ICICIBANK.NS",
  SBIN: "SBIN.NS",
  LT: "LT.NS",
  TATAMOTORS: "TATAMOTORS.NS",
  WIPRO: "WIPRO.NS",
  AXISBANK: "AXISBANK.NS",
  MARUTI: "MARUTI.NS",
  SUNPHARMA: "SUNPHARMA.NS",
  ADANIPORTS: "ADANIPORTS.NS",
  BAJFINANCE: "BAJFINANCE.NS",
  KOTAKBANK: "KOTAKBANK.NS",
  HINDUNILVR: "HINDUNILVR.NS",
  TITAN: "TITAN.NS",
  NESTLEIND: "NESTLEIND.NS",
  ULTRACEMCO: "ULTRACEMCO.NS",
  POWERGRID: "POWERGRID.NS",
=======
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
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
// Reverse map for display
export const DISPLAY_NAME_MAP: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "BANKNIFTY",
  "^INDIAVIX": "INDIA VIX",
  "GC=F": "GOLD",
  "SI=F": "SILVER",
  "CL=F": "CRUDE OIL",
  "NG=F": "NATURAL GAS",
};
=======
// Keep FINNHUB_SYMBOL_MAP for backward-compat (some components reference it)
export const FINNHUB_SYMBOL_MAP: Record<string, string> = { ...YAHOO_SYMBOL_MAP };
>>>>>>> Stashed changes

// Resolve internal symbol → Yahoo Finance symbol
export function toYahoo(symbol: string): string {
  if (YAHOO_SYMBOL_MAP[symbol]) return YAHOO_SYMBOL_MAP[symbol];
  if (symbol.includes(".") || symbol.startsWith("^") || symbol.includes("=") || symbol.includes("-")) return symbol;
  return symbol + ".NS";
}

<<<<<<< Updated upstream
// Yahoo chart interval → display label
=======
// Alias for backward compat — routes & hooks call toFinnhub()
export function toFinnhub(symbol: string): string {
  return toYahoo(symbol);
}

// Chart interval configuration
>>>>>>> Stashed changes
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
