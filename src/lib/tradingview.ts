export type TradingViewSymbolResolution = {
  requestedSymbol: string;
  resolvedSymbol: string;
  fallbackUsed: boolean;
  reason?: string;
};

const SPECIAL_SYMBOLS: Record<string, string> = {
  NIFTYPHARMA: "NSE:NIFTY_PHARMA",
  "NIFTY PHARMA": "NSE:NIFTY_PHARMA",
  NIFTYIT: "NSE:NIFTY_IT",
  "NIFTY IT": "NSE:NIFTY_IT",
  BANKNIFTY: "NSE:BANKNIFTY",
  "BANK NIFTY": "NSE:BANKNIFTY",
  NIFTYBANK: "NSE:BANKNIFTY",
  NIFTY: "NSE:NIFTY",
  "NIFTY 50": "NSE:NIFTY",
  SENSEX: "BSE:SENSEX",
};

function getBaseSpotSymbol(rawSymbol: string): string {
  const symbol = rawSymbol.trim().toUpperCase();

  if (symbol.endsWith(" FUT")) {
    return symbol.replace(/\s+FUT$/, "").trim();
  }

  const optionMatch = symbol.match(/^(.*?)\s+(CE|PE)\s+ATM$/);
  if (optionMatch?.[1]) {
    return optionMatch[1].trim();
  }

  return symbol;
}

export function resolveTradingViewSymbol(rawSymbol: string, exchangeHint?: string): TradingViewSymbolResolution {
  const requested = rawSymbol.trim().toUpperCase();
  const symbol = getBaseSpotSymbol(requested);

  if (symbol.startsWith("NSE:") || symbol.startsWith("BSE:")) {
    return {
      requestedSymbol: requested,
      resolvedSymbol: symbol,
      fallbackUsed: false,
    };
  }

  if (SPECIAL_SYMBOLS[symbol]) {
    const defaultExchange = exchangeHint?.toUpperCase().includes("BSE") ? "BSE" : "NSE";
    const cleanedDefault = symbol
      .replace(/\s+/g, "")
      .replace(/&/g, "_")
      .replace(/[^A-Z0-9_]/g, "");
    const defaultSymbol = `${defaultExchange}:${cleanedDefault}`;
    const resolvedSymbol = SPECIAL_SYMBOLS[symbol];

    return {
      requestedSymbol: requested,
      resolvedSymbol,
      fallbackUsed: requested !== symbol || resolvedSymbol !== defaultSymbol,
      reason: requested !== symbol ? "Derivative mapped to spot index" : "Special TradingView symbol mapping",
    };
  }

  const exchange = exchangeHint?.toUpperCase().includes("BSE") ? "BSE" : "NSE";

  const cleaned = symbol
    .replace(/\s+/g, "")
    .replace(/&/g, "_")
    .replace(/[^A-Z0-9_]/g, "");

  if (!cleaned) {
    return {
      requestedSymbol: requested,
      resolvedSymbol: "NSE:NIFTY",
      fallbackUsed: true,
      reason: "Invalid symbol format",
    };
  }

  const looksLikeIndianEquityOrIndex = /^[A-Z0-9_]{2,20}$/.test(cleaned);
  if (!looksLikeIndianEquityOrIndex) {
    return {
      requestedSymbol: requested,
      resolvedSymbol: "NSE:NIFTY",
      fallbackUsed: true,
      reason: "Only Indian symbols are supported in chart view",
    };
  }

  return {
    requestedSymbol: requested,
    resolvedSymbol: `${exchange}:${cleaned}`,
    fallbackUsed: requested !== symbol,
    reason: requested !== symbol ? "Derivative mapped to spot symbol" : undefined,
  };
}

export function toTradingViewSymbol(rawSymbol: string, exchangeHint?: string): string {
  return resolveTradingViewSymbol(rawSymbol, exchangeHint).resolvedSymbol;
}
