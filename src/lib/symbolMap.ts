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

  // Commodities (international proxies via Yahoo)
  GOLD: "GC=F",
  SILVER: "SI=F",
  CRUDEOIL: "CL=F",
  NATURALGAS: "NG=F",

  // Crypto
  BTCUSDT: "BTC-USD",
  ETHUSDT: "ETH-USD",
  SOLUSDT: "SOL-USD",
  XRPUSDT: "XRP-USD",
};

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

export function toYahoo(symbol: string): string {
  return YAHOO_SYMBOL_MAP[symbol] ?? symbol + ".NS";
}

// Yahoo chart interval → display label
export const CHART_INTERVALS = [
  { label: "1m", value: "1m", range: "1d" },
  { label: "5m", value: "5m", range: "1d" },
  { label: "15m", value: "15m", range: "5d" },
  { label: "30m", value: "30m", range: "5d" },
  { label: "1hr", value: "60m", range: "1mo" },
  { label: "1D", value: "1d", range: "6mo" },
  { label: "1W", value: "1wk", range: "2y" },
  { label: "1M", value: "1mo", range: "5y" },
] as const;

export type ChartInterval = (typeof CHART_INTERVALS)[number];
