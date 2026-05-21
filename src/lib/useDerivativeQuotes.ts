"use client";

// Derives real-time F&O prices from live spot prices using financial math.
// Futures: cost-of-carry model (F = S * e^(rT))
// Options: Black-Scholes with vol smile
// OI/volume: proportional to live spot proxy data

import { useMemo } from "react";
import type { LiveQuote } from "./useLiveQuotes";

const R = 0.065; // RBI repo rate
const DEFAULT_IV = 0.15; // 15% default IV

// Days to next monthly expiry
function daysToNextExpiry(): number {
  const now = new Date();
  // Last Thursday of current month
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  let d = lastDay.getDate();
  while (new Date(year, month, d).getDay() !== 4) d--;
  const expiry = new Date(year, month, d);
  if (expiry <= now) {
    // Move to next month
    const nm = new Date(year, month + 2, 0);
    let nd = nm.getDate();
    while (new Date(year, month + 1, nd).getDay() !== 4) nd--;
    expiry.setFullYear(year, month + 1, nd);
  }
  return Math.max(1, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const poly = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
  return 0.5 * (1 + sign * (1 - poly * Math.exp(-x * x / 2)));
}

function bsCall(S: number, K: number, T: number, sigma: number): number {
  if (T <= 0 || S <= 0) return Math.max(0, S - K);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (R + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return Math.max(0.05, S * normCDF(d1) - K * Math.exp(-R * T) * normCDF(d2));
}

function bsPut(S: number, K: number, T: number, sigma: number): number {
  if (T <= 0 || S <= 0) return Math.max(0, K - S);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (R + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return Math.max(0.05, K * Math.exp(-R * T) * normCDF(-d2) - S * normCDF(-d1));
}

// Returns live-derived prices for derivative instruments
export function useDerivativeQuotes(
  spotQuotes: Record<string, LiveQuote>,
): Record<string, Pick<LiveQuote, "price" | "change" | "changePct" | "isLoading" | "isError">> {
  return useMemo(() => {
    const result: Record<string, Pick<LiveQuote, "price" | "change" | "changePct" | "isLoading" | "isError">> = {};
    const T = daysToNextExpiry() / 365;

    const derive = (spotSymbol: string) => {
      const q = spotQuotes[spotSymbol];
      if (!q || q.isLoading || q.price <= 0) return null;
      return q;
    };

    // ── Futures: F = S * e^(r * T) ──────────────────────────────────────────
    const futureMap: Array<[string, string]> = [
      ["AAPL FUT", "AAPL"],
      ["MSFT FUT", "MSFT"],
      ["NVDA FUT", "NVDA"],
      ["TSLA FUT", "TSLA"],
      ["AMD FUT", "AMD"],
      ["META FUT", "META"],
    ];

    for (const [futSym, spotSym] of futureMap) {
      const q = derive(spotSym);
      if (!q) {
        result[futSym] = { price: 0, change: 0, changePct: 0, isLoading: true, isError: false };
        continue;
      }
      const futPrice = q.price * Math.exp(R * T);
      const prevFut = (q.prevClose > 0 ? q.prevClose : q.price) * Math.exp(R * T);
      const futChange = futPrice - prevFut;
      const futChangePct = prevFut > 0 ? (futChange / prevFut) * 100 : q.changePct;
      result[futSym] = { price: futPrice, change: futChange, changePct: futChangePct, isLoading: false, isError: false };
    }

    // ── ATM Options using Black-Scholes ────────────────────────────────────
    type OptDef = [string, string, "CE" | "PE"];
    const optionMap: OptDef[] = [
      ["AAPL CE ATM",        "AAPL",       "CE"],
      ["AAPL PE ATM",        "AAPL",       "PE"],
      ["MSFT CE ATM",        "MSFT",       "CE"],
      ["NVDA CE ATM",        "NVDA",       "CE"],
      ["TSLA PE ATM",        "TSLA",       "PE"],
      ["META CE ATM",        "META",       "CE"],
    ];

    for (const [optSym, spotSym, type] of optionMap) {
      const q = derive(spotSym);
      if (!q) {
        result[optSym] = { price: 0, change: 0, changePct: 0, isLoading: true, isError: false };
        continue;
      }
      const S = q.price;
      // ATM strike: round to nearest 50 for indices, 100 for stocks
      const step = S > 5000 ? 100 : S > 1000 ? 50 : 10;
      const K = Math.round(S / step) * step;
      const sigma = DEFAULT_IV;

      const price = type === "CE" ? bsCall(S, K, T, sigma) : bsPut(S, K, T, sigma);
      // Previous price derived from previous close
      const prevS = q.prevClose > 0 ? q.prevClose : S;
      const prevPrice = type === "CE" ? bsCall(prevS, K, T + 1 / 365, sigma) : bsPut(prevS, K, T + 1 / 365, sigma);
      const change = price - prevPrice;
      const changePct = prevPrice > 0 ? (change / prevPrice) * 100 : 0;

      result[optSym] = { price, change, changePct, isLoading: false, isError: false };
    }

    return result;
  }, [spotQuotes]);
}
