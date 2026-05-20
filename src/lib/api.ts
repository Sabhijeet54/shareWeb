// Market Data API Service - Uses free APIs (Yahoo Finance, NSE India)
// Works with native fetch (no axios needed)

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance";
const NSE_BASE = "https://www.nseindia.com/api";

// Helper to handle CORS - we use Next.js API routes as proxy
const API_PREFIX = "/api/market";

export type IndexData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: string;
  timestamp: number;
};


export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  volume: number;
  marketCap: number;
  pe: number;
  eps: number;
  week52High: number;
  week52Low: number;
  avgVolume: number;
  dayRange: string;
  yearRange: string;
};

export type CandleData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};


export type OptionData = {
  strikePrice: number;
  expiryDate: string;
  ce: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    ltp: number;
    change: number;
    bidPrice: number;
    askPrice: number;
  } | null;
  pe: {
    oi: number;
    oiChange: number;
    volume: number;
    iv: number;
    ltp: number;
    change: number;
    bidPrice: number;
    askPrice: number;
  } | null;
};

export type SectorData = {
  name: string;
  change: number;
  stocks: string[];
};


export type MarketNews = {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
};

// Fetch with timeout and error handling
async function fetchWithTimeout(url: string, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch {
    clearTimeout(id);
    throw new Error(`Request timeout: ${url}`);
  }
}

// ============ MARKET DATA FUNCTIONS ============


export async function fetchIndices(): Promise<IndexData[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/indices`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticIndices();
  }
}

export async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/quote?symbol=${symbol}`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticQuote(symbol);
  }
}

export async function fetchTopGainers(): Promise<StockQuote[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/gainers`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticGainers();
  }
}


export async function fetchTopLosers(): Promise<StockQuote[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/losers`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticLosers();
  }
}

export async function fetchChartData(
  symbol: string,
  interval: string = "1d",
  range: string = "1mo"
): Promise<CandleData[]> {
  try {
    const res = await fetchWithTimeout(
      `${API_PREFIX}/chart?symbol=${symbol}&interval=${interval}&range=${range}`
    );
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return generateMockCandles(symbol, interval, range);
  }
}


export async function fetchOptionChain(symbol: string): Promise<OptionData[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/options?symbol=${symbol}`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return generateMockOptionChain(symbol);
  }
}

export async function fetchSectorPerformance(): Promise<SectorData[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/sectors`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticSectors();
  }
}

export async function fetchMarketNews(): Promise<MarketNews[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/news`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticNews();
  }
}


export async function searchStocks(query: string): Promise<StockQuote[]> {
  try {
    const res = await fetchWithTimeout(`${API_PREFIX}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed");
    return await res.json();
  } catch {
    return getStaticStockList().filter(
      (s) =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query.toLowerCase())
    );
  }
}

export function getMarketStatus(): { isOpen: boolean; message: string } {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay();
  const timeInMinutes = hours * 60 + minutes;

  if (day === 0 || day === 6) {
    return { isOpen: false, message: "Market Closed (Weekend)" };
  }
  if (timeInMinutes >= 555 && timeInMinutes <= 930) {
    return { isOpen: true, message: "Market Open" };
  }
  if (timeInMinutes > 930) {
    return { isOpen: false, message: "Market Closed" };
  }
  return { isOpen: false, message: "Pre-Market" };
}


// ============ STATIC FALLBACK DATA ============

function getStaticIndices(): IndexData[] {
  return [
    { symbol: "NIFTY50", name: "NIFTY 50", price: 24850.42, change: 156.30, changePercent: 0.63, high: 24920, low: 24710, open: 24740, prevClose: 24694.12, volume: "18.4Cr", timestamp: Date.now() },
    { symbol: "SENSEX", name: "SENSEX", price: 81720.88, change: 482.65, changePercent: 0.59, high: 81890, low: 81320, open: 81420, prevClose: 81238.23, volume: "9.2Cr", timestamp: Date.now() },
    { symbol: "BANKNIFTY", name: "BANK NIFTY", price: 53480.15, change: -128.40, changePercent: -0.24, high: 53720, low: 53310, open: 53610, prevClose: 53608.55, volume: "7.8Cr", timestamp: Date.now() },
    { symbol: "FINNIFTY", name: "FIN NIFTY", price: 23840.60, change: 92.15, changePercent: 0.39, high: 23920, low: 23740, open: 23780, prevClose: 23748.45, volume: "4.1Cr", timestamp: Date.now() },
    { symbol: "MIDCPNIFTY", name: "MIDCAP NIFTY", price: 12480.35, change: 186.20, changePercent: 1.51, high: 12520, low: 12310, open: 12340, prevClose: 12294.15, volume: "2.9Cr", timestamp: Date.now() },
    { symbol: "INDIAVIX", name: "INDIA VIX", price: 13.42, change: -0.68, changePercent: -4.82, high: 14.1, low: 13.2, open: 14.0, prevClose: 14.1, volume: "-", timestamp: Date.now() },
  ];
}


function getStaticQuote(symbol: string): StockQuote | null {
  const list = getStaticStockList();
  return list.find((s) => s.symbol === symbol) || list[0];
}

function getStaticGainers(): StockQuote[] {
  return [
    { symbol: "TATAMOTORS", name: "Tata Motors", price: 1024.50, change: 42.80, changePercent: 4.36, high: 1032, low: 978, open: 982, prevClose: 981.70, volume: 18200000, marketCap: 378000, pe: 8.2, eps: 124.9, week52High: 1080, week52Low: 612, avgVolume: 15000000, dayRange: "978-1032", yearRange: "612-1080" },
    { symbol: "ADANIENT", name: "Adani Enterprises", price: 3280.15, change: 124.60, changePercent: 3.95, high: 3310, low: 3148, open: 3160, prevClose: 3155.55, volume: 8400000, marketCap: 374000, pe: 72.4, eps: 45.3, week52High: 3480, week52Low: 2142, avgVolume: 6500000, dayRange: "3148-3310", yearRange: "2142-3480" },
    { symbol: "SBIN", name: "State Bank of India", price: 868.40, change: 28.90, changePercent: 3.44, high: 874, low: 838, open: 842, prevClose: 839.50, volume: 22000000, marketCap: 775000, pe: 11.2, eps: 77.5, week52High: 912, week52Low: 602, avgVolume: 18000000, dayRange: "838-874", yearRange: "602-912" },
    { symbol: "COALINDIA", name: "Coal India", price: 488.75, change: 14.20, changePercent: 3.0, high: 492, low: 472, open: 476, prevClose: 474.55, volume: 12500000, marketCap: 301000, pe: 8.8, eps: 55.5, week52High: 528, week52Low: 388, avgVolume: 10000000, dayRange: "472-492", yearRange: "388-528" },
    { symbol: "POWERGRID", name: "Power Grid Corp", price: 324.60, change: 8.40, changePercent: 2.66, high: 328, low: 315, open: 317, prevClose: 316.20, volume: 9800000, marketCap: 226000, pe: 18.4, eps: 17.6, week52High: 345, week52Low: 248, avgVolume: 8000000, dayRange: "315-328", yearRange: "248-345" },
  ];
}


function getStaticLosers(): StockQuote[] {
  return [
    { symbol: "WIPRO", name: "Wipro", price: 462.30, change: -18.40, changePercent: -3.83, high: 484, low: 458, open: 480, prevClose: 480.70, volume: 14200000, marketCap: 241000, pe: 22.8, eps: 20.3, week52High: 542, week52Low: 380, avgVolume: 11000000, dayRange: "458-484", yearRange: "380-542" },
    { symbol: "TECHM", name: "Tech Mahindra", price: 1580.20, change: -52.60, changePercent: -3.22, high: 1638, low: 1572, open: 1630, prevClose: 1632.80, volume: 6800000, marketCap: 154000, pe: 38.6, eps: 40.9, week52High: 1748, week52Low: 1108, avgVolume: 5200000, dayRange: "1572-1638", yearRange: "1108-1748" },
    { symbol: "DRREDDY", name: "Dr. Reddys Labs", price: 6420.50, change: -186.30, changePercent: -2.82, high: 6620, low: 6380, open: 6580, prevClose: 6606.80, volume: 2100000, marketCap: 107000, pe: 24.2, eps: 265.3, week52High: 6940, week52Low: 5280, avgVolume: 1800000, dayRange: "6380-6620", yearRange: "5280-6940" },
    { symbol: "HCLTECH", name: "HCL Technologies", price: 1648.90, change: -42.10, changePercent: -2.49, high: 1698, low: 1640, open: 1690, prevClose: 1691.00, volume: 5400000, marketCap: 447000, pe: 26.8, eps: 61.5, week52High: 1860, week52Low: 1238, avgVolume: 4200000, dayRange: "1640-1698", yearRange: "1238-1860" },
    { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1824.60, change: -38.90, changePercent: -2.09, high: 1872, low: 1818, open: 1864, prevClose: 1863.50, volume: 4100000, marketCap: 438000, pe: 36.4, eps: 50.1, week52High: 1960, week52Low: 1382, avgVolume: 3500000, dayRange: "1818-1872", yearRange: "1382-1960" },
  ];
}


function getStaticSectors(): SectorData[] {
  return [
    { name: "IT", change: -1.82, stocks: ["TCS", "INFY", "WIPRO", "HCLTECH", "TECHM"] },
    { name: "Banking", change: 1.24, stocks: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"] },
    { name: "Pharma", change: -0.94, stocks: ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP"] },
    { name: "Auto", change: 2.18, stocks: ["TATAMOTORS", "M&M", "MARUTI", "BAJAJ-AUTO", "HEROMOTOCO"] },
    { name: "Energy", change: 1.56, stocks: ["RELIANCE", "ONGC", "NTPC", "POWERGRID", "ADANIGREEN"] },
    { name: "Metal", change: 0.88, stocks: ["TATASTEEL", "HINDALCO", "JSWSTEEL", "COALINDIA", "VEDL"] },
    { name: "FMCG", change: -0.32, stocks: ["ITC", "HINDUNILVR", "NESTLEIND", "BRITANNIA", "DABUR"] },
    { name: "Realty", change: 3.24, stocks: ["DLF", "GODREJPROP", "OBEROIRLTY", "PRESTIGE", "BRIGADE"] },
    { name: "Infra", change: 1.92, stocks: ["LT", "ADANIPORTS", "ULTRACEMCO", "GRASIM", "AMBUJACEM"] },
    { name: "PSU Bank", change: 2.86, stocks: ["SBIN", "BANKBARODA", "PNB", "CANBK", "UNIONBANK"] },
  ];
}


function getStaticNews(): MarketNews[] {
  return [
    { title: "Nifty 50 hits all-time high amid FII inflows", description: "Indian markets rallied as foreign investors pumped Rs 4,200 crore into equities", url: "#", source: "Economic Times", publishedAt: "2 hours ago" },
    { title: "RBI keeps repo rate unchanged at 6.5%", description: "The MPC decided to maintain status quo on rates, focusing on inflation management", url: "#", source: "Mint", publishedAt: "4 hours ago" },
    { title: "IT stocks under pressure after weak guidance from TCS", description: "Technology sector fell 1.8% as TCS reported slower deal wins", url: "#", source: "Moneycontrol", publishedAt: "5 hours ago" },
    { title: "Auto stocks surge on strong monthly sales data", description: "Tata Motors and M&M led gains after reporting 25%+ YoY growth", url: "#", source: "Business Standard", publishedAt: "6 hours ago" },
    { title: "Adani Group stocks rally on FPO success", description: "Adani Enterprises gained 4% as FPO received strong institutional response", url: "#", source: "NDTV Profit", publishedAt: "8 hours ago" },
    { title: "Gold hits record high of Rs 73,000 per 10 grams", description: "Global uncertainty and geopolitical tensions push safe-haven demand", url: "#", source: "Reuters", publishedAt: "10 hours ago" },
  ];
}


export function getStaticStockList(): StockQuote[] {
  return [
    { symbol: "RELIANCE", name: "Reliance Industries", price: 2942.80, change: 38.60, changePercent: 1.33, high: 2968, low: 2898, open: 2910, prevClose: 2904.20, volume: 6240000, marketCap: 1992000, pe: 28.4, eps: 103.6, week52High: 3024, week52Low: 2220, avgVolume: 5500000, dayRange: "2898-2968", yearRange: "2220-3024" },
    { symbol: "TCS", name: "Tata Consultancy", price: 4020.45, change: -42.30, changePercent: -1.04, high: 4078, low: 4002, open: 4060, prevClose: 4062.75, volume: 1810000, marketCap: 1455000, pe: 32.6, eps: 123.3, week52High: 4248, week52Low: 3312, avgVolume: 1600000, dayRange: "4002-4078", yearRange: "3312-4248" },
    { symbol: "HDFCBANK", name: "HDFC Bank", price: 1642.30, change: 18.90, changePercent: 1.16, high: 1658, low: 1618, open: 1625, prevClose: 1623.40, volume: 14000000, marketCap: 1248000, pe: 20.8, eps: 79.0, week52High: 1794, week52Low: 1362, avgVolume: 12000000, dayRange: "1618-1658", yearRange: "1362-1794" },
    { symbol: "INFY", name: "Infosys", price: 1862.50, change: -14.80, changePercent: -0.79, high: 1890, low: 1852, open: 1878, prevClose: 1877.30, volume: 7420000, marketCap: 772000, pe: 28.2, eps: 66.1, week52High: 1980, week52Low: 1352, avgVolume: 6200000, dayRange: "1852-1890", yearRange: "1352-1980" },
    { symbol: "ICICIBANK", name: "ICICI Bank", price: 1248.60, change: 22.40, changePercent: 1.83, high: 1262, low: 1222, open: 1228, prevClose: 1226.20, volume: 9870000, marketCap: 876000, pe: 18.6, eps: 67.1, week52High: 1312, week52Low: 908, avgVolume: 8500000, dayRange: "1222-1262", yearRange: "908-1312" },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", price: 1720.40, change: 28.80, changePercent: 1.70, high: 1738, low: 1688, open: 1695, prevClose: 1691.60, volume: 4200000, marketCap: 1028000, pe: 82.4, eps: 20.9, week52High: 1810, week52Low: 1212, avgVolume: 3800000, dayRange: "1688-1738", yearRange: "1212-1810" },
    { symbol: "SBIN", name: "State Bank of India", price: 868.40, change: 28.90, changePercent: 3.44, high: 874, low: 838, open: 842, prevClose: 839.50, volume: 22000000, marketCap: 775000, pe: 11.2, eps: 77.5, week52High: 912, week52Low: 602, avgVolume: 18000000, dayRange: "838-874", yearRange: "602-912" },
    { symbol: "LT", name: "Larsen & Toubro", price: 3680.20, change: -24.60, changePercent: -0.66, high: 3720, low: 3652, open: 3710, prevClose: 3704.80, volume: 2280000, marketCap: 506000, pe: 36.8, eps: 100.0, week52High: 3882, week52Low: 2880, avgVolume: 2000000, dayRange: "3652-3720", yearRange: "2880-3882" },
    { symbol: "TATAMOTORS", name: "Tata Motors", price: 1024.50, change: 42.80, changePercent: 4.36, high: 1032, low: 978, open: 982, prevClose: 981.70, volume: 18200000, marketCap: 378000, pe: 8.2, eps: 124.9, week52High: 1080, week52Low: 612, avgVolume: 15000000, dayRange: "978-1032", yearRange: "612-1080" },
    { symbol: "ITC", name: "ITC Limited", price: 468.90, change: -2.40, changePercent: -0.51, high: 474, low: 466, open: 472, prevClose: 471.30, volume: 8600000, marketCap: 585000, pe: 28.6, eps: 16.4, week52High: 512, week52Low: 398, avgVolume: 7500000, dayRange: "466-474", yearRange: "398-512" },
  ];
}


// Generate mock candle data
function generateMockCandles(symbol: string, interval: string, range: string): CandleData[] {
  const basePrice = getStaticStockList().find(s => s.symbol === symbol)?.price || 1000;
  const candles: CandleData[] = [];
  let count = 60;

  if (range === "1d") count = interval === "1m" ? 375 : interval === "5m" ? 75 : 25;
  else if (range === "5d") count = 50;
  else if (range === "1mo") count = 22;
  else if (range === "3mo") count = 65;
  else if (range === "6mo") count = 130;
  else if (range === "1y") count = 252;

  const now = Date.now();
  const intervalMs = range === "1d" ? 60000 : 86400000;
  let price = basePrice * 0.92;

  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.015;
    const change = (Math.random() - 0.48) * volatility;
    const open = price;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 5000000) + 500000;

    candles.push({
      time: now - (count - i) * intervalMs,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    price = close;
  }
  return candles;
}


// Generate mock option chain
function generateMockOptionChain(symbol: string): OptionData[] {
  const spotPrice = symbol.includes("NIFTY") ? 24850 : symbol.includes("BANK") ? 53480 : 2942;
  const strikeGap = symbol.includes("NIFTY") ? 50 : symbol.includes("BANK") ? 100 : 20;
  const options: OptionData[] = [];
  const baseStrike = Math.round(spotPrice / strikeGap) * strikeGap;

  for (let i = -10; i <= 10; i++) {
    const strike = baseStrike + i * strikeGap;
    const distFromATM = Math.abs(i);
    const ceIV = 12 + distFromATM * 0.8 + Math.random() * 3;
    const peIV = 13 + distFromATM * 0.9 + Math.random() * 3;
    const cePremium = Math.max(5, (spotPrice - strike) + ceIV * spotPrice * 0.001);
    const pePremium = Math.max(5, (strike - spotPrice) + peIV * spotPrice * 0.001);

    options.push({
      strikePrice: strike,
      expiryDate: getNextThursday(),
      ce: {
        oi: Math.floor(Math.random() * 5000000) + 100000,
        oiChange: Math.floor((Math.random() - 0.5) * 200000),
        volume: Math.floor(Math.random() * 1000000) + 50000,
        iv: Math.round(ceIV * 100) / 100,
        ltp: Math.round(cePremium * 100) / 100,
        change: Math.round((Math.random() - 0.4) * 20 * 100) / 100,
        bidPrice: Math.round((cePremium - 0.5) * 100) / 100,
        askPrice: Math.round((cePremium + 0.5) * 100) / 100,
      },
      pe: {
        oi: Math.floor(Math.random() * 4500000) + 80000,
        oiChange: Math.floor((Math.random() - 0.5) * 180000),
        volume: Math.floor(Math.random() * 900000) + 40000,
        iv: Math.round(peIV * 100) / 100,
        ltp: Math.round(pePremium * 100) / 100,
        change: Math.round((Math.random() - 0.6) * 18 * 100) / 100,
        bidPrice: Math.round((pePremium - 0.5) * 100) / 100,
        askPrice: Math.round((pePremium + 0.5) * 100) / 100,
      },
    });
  }
  return options;
}

function getNextThursday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (4 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}


// ============ TECHNICAL INDICATORS ============

export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) { result.push(ema); continue; }
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  result.push(null);
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}


export function calculateMACD(data: number[]): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (ema12[i] === null || ema26[i] === null) { macdLine.push(null); continue; }
    macdLine.push((ema12[i] as number) - (ema26[i] as number));
  }

  const validMacd = macdLine.filter((v) => v !== null) as number[];
  const signalLine = calculateEMA(validMacd, 9);
  const signal: (number | null)[] = [];
  const histogram: (number | null)[] = [];
  let si = 0;

  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null) { signal.push(null); histogram.push(null); continue; }
    const s = signalLine[si] ?? null;
    signal.push(s);
    histogram.push(s !== null ? (macdLine[i] as number) - s : null);
    si++;
  }
  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i] as number;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const sd = Math.sqrt(variance) * stdDev;
    upper.push(mean + sd);
    lower.push(mean - sd);
  }
  return { upper, middle, lower };
}


export function calculateVWAP(candles: CandleData[]): number[] {
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    cumulativeTPV += tp * c.volume;
    cumulativeVolume += c.volume;
    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : tp;
  });
}

export function calculateSupertrend(candles: CandleData[], period: number = 10, multiplier: number = 3): { value: number[]; direction: number[] } {
  const atr: number[] = [];
  const supertrend: number[] = [];
  const direction: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const tr = i === 0
      ? candles[i].high - candles[i].low
      : Math.max(candles[i].high - candles[i].low, Math.abs(candles[i].high - candles[i - 1].close), Math.abs(candles[i].low - candles[i - 1].close));
    
    if (i < period) {
      atr.push(tr);
      supertrend.push(candles[i].close);
      direction.push(1);
      continue;
    }

    const avgTR = atr.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    atr.push(avgTR);

    const hl2 = (candles[i].high + candles[i].low) / 2;
    const upperBand = hl2 + multiplier * avgTR;
    const lowerBand = hl2 - multiplier * avgTR;

    if (candles[i].close > supertrend[i - 1]) {
      supertrend.push(lowerBand);
      direction.push(1);
    } else {
      supertrend.push(upperBand);
      direction.push(-1);
    }
  }
  return { value: supertrend, direction };
}


// ============ OPTIONS GREEKS CALCULATOR ============

export function calculateGreeks(spot: number, strike: number, timeToExpiry: number, iv: number, riskFreeRate: number = 0.065, isCall: boolean = true) {
  const t = timeToExpiry / 365;
  const sigma = iv / 100;
  if (t <= 0 || sigma <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };

  const d1 = (Math.log(spot / strike) + (riskFreeRate + sigma * sigma / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);
  const nd1 = normalCDF(d1);
  const nd2 = normalCDF(d2);
  const npd1 = normalPDF(d1);

  const delta = isCall ? nd1 : nd1 - 1;
  const gamma = npd1 / (spot * sigma * Math.sqrt(t));
  const theta = isCall
    ? (-(spot * npd1 * sigma) / (2 * Math.sqrt(t)) - riskFreeRate * strike * Math.exp(-riskFreeRate * t) * nd2) / 365
    : (-(spot * npd1 * sigma) / (2 * Math.sqrt(t)) + riskFreeRate * strike * Math.exp(-riskFreeRate * t) * (1 - nd2)) / 365;
  const vega = spot * npd1 * Math.sqrt(t) / 100;

  return {
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 100) / 100,
    vega: Math.round(vega * 100) / 100,
  };
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}
