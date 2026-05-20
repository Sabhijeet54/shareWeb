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
  orderType?: "MARKET" | "LIMIT";
  productType?: "INTRADAY" | "DELIVERY";
  validity?: "DAY" | "IOC";
  target?: number | null;
  stopLoss?: number | null;
  product?: string;
  status: "executed";
  mode: "paper";
  userEmail: string;
  userId: string;
  createdAt?: Timestamp;
};

export type MarketQuote = {
  symbol: string;
  name: string;
  price: string;
  change: string;
  trend: "up" | "down" | "flat";
};
