import type { Timestamp } from "firebase/firestore";

export type AppUser = {
  email: string;
  name?: string;
  walletBalance: number;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
};

export type PaymentRequest = {
  id: string;
  amount: number;
  utr: string;
  status: "pending" | "approved" | "rejected";
  userEmail: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type TradeOrder = {
  id: string;
  side: "BUY" | "SELL";
  symbol: string;
  title: string;
  lots?: number;
  lotSize?: number;
  quantity: number;
  price: number;
  amount: number;
  notionalValue?: number;
  charges?: number;
  orderType?: "MARKET" | "LIMIT" | "SL" | "SL-M" | "AMO" | "GTT";
  productType?: "MIS" | "CNC" | "NRML";
  validity?: "DAY" | "IOC" | "GTC";
  target?: number | null;
  stopLoss?: number | null;
  product?: string;
  status: "executed" | "open" | "cancelled";
  mode: "paper";
  userEmail: string;
  userId: string;
  createdAt?: Timestamp;
};

export type Position = {
  id: string;
  symbol: string;
  title: string;
  side: "BUY" | "SELL";
  avgPrice: number;
  cmp: number;
  quantity: number;
  lots?: number;
  lotSize?: number;
  product: "MIS" | "NRML" | "CNC";
  unrealisedPnl: number;
  dayPnl: number;
  status: "open" | "closed";
  userId: string;
  userEmail: string;
  createdAt?: Timestamp;
};

export type Holding = {
  id: string;
  symbol: string;
  title: string;
  avgBuyPrice: number;
  cmp: number;
  quantity: number;
  investedAmount: number;
  currentValue: number;
  absoluteReturn: number;
  percentReturn: number;
  userId: string;
  userEmail: string;
  createdAt?: Timestamp;
};

export type PriceAlert = {
  id: string;
  symbol: string;
  title: string;
  alertType: "ABOVE" | "BELOW" | "PERCENT";
  targetPrice: number;
  currentPrice: number;
  triggered: boolean;
  userId: string;
  userEmail: string;
  createdAt?: Timestamp;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  trend: "up" | "down" | "flat";
};

export type Instrument = {
  symbol: string;
  title: string;
  subtitle: string;
  price: number;
  change: number;
  volume: string;
  high: number;
  low: number;
  open?: number;
  prevClose?: number;
  weekHigh52?: number;
  weekLow52?: number;
  marketCap?: string;
  pe?: number;
  eps?: number;
  oi?: string;
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  sector?: string;
};
