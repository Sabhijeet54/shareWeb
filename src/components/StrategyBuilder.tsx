"use client";

import { useMemo, useState } from "react";
import { FiZap } from "react-icons/fi";
import { useLiveSingleQuote } from "@/lib/useLiveQuotes";

type Leg = {
  id: number;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  strike: number;
  premium: number;
  lots: number;
  lotSize: number;
};

const STRATEGIES = {
  "Long Straddle": (atm: number, lotSize: number) => ([
    { id: 1, type: "CE" as const, action: "BUY" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
    { id: 2, type: "PE" as const, action: "BUY" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
  ]),
  "Short Straddle": (atm: number, lotSize: number) => ([
    { id: 1, type: "CE" as const, action: "SELL" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
    { id: 2, type: "PE" as const, action: "SELL" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
  ]),
  "Bull Call Spread": (atm: number, lotSize: number) => ([
    { id: 1, type: "CE" as const, action: "BUY" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
    { id: 2, type: "CE" as const, action: "SELL" as const, strike: atm + 100, premium: Math.round(atm * 0.003), lots: 1, lotSize },
  ]),
  "Bear Put Spread": (atm: number, lotSize: number) => ([
    { id: 1, type: "PE" as const, action: "BUY" as const, strike: atm, premium: Math.round(atm * 0.006), lots: 1, lotSize },
    { id: 2, type: "PE" as const, action: "SELL" as const, strike: atm - 100, premium: Math.round(atm * 0.003), lots: 1, lotSize },
  ]),
  "Iron Condor": (atm: number, lotSize: number) => ([
    { id: 1, type: "PE" as const, action: "BUY" as const, strike: atm - 200, premium: Math.round(atm * 0.002), lots: 1, lotSize },
    { id: 2, type: "PE" as const, action: "SELL" as const, strike: atm - 100, premium: Math.round(atm * 0.004), lots: 1, lotSize },
    { id: 3, type: "CE" as const, action: "SELL" as const, strike: atm + 100, premium: Math.round(atm * 0.004), lots: 1, lotSize },
    { id: 4, type: "CE" as const, action: "BUY" as const, strike: atm + 200, premium: Math.round(atm * 0.002), lots: 1, lotSize },
  ]),
  "Long Strangle": (atm: number, lotSize: number) => ([
    { id: 1, type: "CE" as const, action: "BUY" as const, strike: atm + 100, premium: Math.round(atm * 0.004), lots: 1, lotSize },
    { id: 2, type: "PE" as const, action: "BUY" as const, strike: atm - 100, premium: Math.round(atm * 0.004), lots: 1, lotSize },
  ]),
};

const UNDERLYINGS = [
  { symbol: "NIFTY", lotSize: 75, fallback: 22480 },
  { symbol: "BANKNIFTY", lotSize: 30, fallback: 48260 },
  { symbol: "FINNIFTY", lotSize: 60, fallback: 21440 },
];

function calcPayoff(legs: Leg[], spotAtExpiry: number): number {
  return legs.reduce((sum, leg) => {
    const intrinsic = leg.type === "CE"
      ? Math.max(0, spotAtExpiry - leg.strike)
      : Math.max(0, leg.strike - spotAtExpiry);
    const netPremium = leg.action === "BUY" ? -leg.premium : leg.premium;
    return sum + (intrinsic + netPremium) * leg.lots * leg.lotSize;
  }, 0);
}

export function StrategyBuilder() {
  const [underlying, setUnderlying] = useState(UNDERLYINGS[0]);
  const [selectedStrategy, setSelectedStrategy] = useState<keyof typeof STRATEGIES>("Long Straddle");
  const [legs, setLegs] = useState<Leg[]>([]);

  const quote = useLiveSingleQuote(underlying.symbol, 15000);
  const spot = (quote && !quote.isLoading && quote.price > 0) ? quote.price : underlying.fallback;
  const atm = Math.round(spot / 50) * 50;

  const maxCost = useMemo(() => {
    const buyCost = legs.filter((l) => l.action === "BUY").reduce((s, l) => s + l.premium * l.lots * l.lotSize, 0);
    const sellCredit = legs.filter((l) => l.action === "SELL").reduce((s, l) => s + l.premium * l.lots * l.lotSize, 0);
    return buyCost - sellCredit;
  }, [legs]);

  function loadStrategy(name: keyof typeof STRATEGIES) {
    setSelectedStrategy(name);
    setLegs(STRATEGIES[name](atm, underlying.lotSize));
  }

  // Payoff table
  const range = Array.from({ length: 21 }, (_, i) => atm - 500 + i * 50);
  const payoffs = range.map((s) => ({ spot: s, pnl: calcPayoff(legs, s) }));
  const maxProfit = Math.max(...payoffs.map((p) => p.pnl));
  const maxLoss = Math.min(...payoffs.map((p) => p.pnl));
  const breakevens = payoffs.filter((p, i) => i > 0 && ((payoffs[i - 1].pnl < 0 && p.pnl >= 0) || (payoffs[i - 1].pnl >= 0 && p.pnl < 0))).map((p) => p.spot);

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
          <FiZap /> Options Strategy Builder
        </p>

        {/* Underlying */}
        <div className="mb-4 flex gap-2">
          {UNDERLYINGS.map((u) => (
            <button key={u.symbol} type="button" onClick={() => { setUnderlying(u); setLegs([]); }}
              className={`h-9 rounded-xl px-4 text-xs font-bold ${underlying.symbol === u.symbol ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
              {u.symbol}
            </button>
          ))}
          <div className="ml-auto text-right text-xs">
            <p className="text-slate-500">Spot</p>
            <p className="font-bold text-white">₹{spot.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Strategy presets */}
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.keys(STRATEGIES).map((s) => (
            <button key={s} type="button" onClick={() => loadStrategy(s as keyof typeof STRATEGIES)}
              className={`h-8 rounded-xl px-3 text-xs font-bold ${selectedStrategy === s && legs.length > 0 ? "bg-indigo-500 text-white" : "bg-black/30 text-slate-400 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Legs table */}
        {legs.length > 0 && (
          <>
            <div className="mb-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500">
                    <th className="p-2 text-left">Action</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Strike</th>
                    <th className="p-2 text-left">Premium</th>
                    <th className="p-2 text-left">Lots</th>
                    <th className="p-2 text-left">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((leg) => (
                    <tr key={leg.id} className="border-b border-white/5">
                      <td className="p-2">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${leg.action === "BUY" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                          {leg.action}
                        </span>
                      </td>
                      <td className={`p-2 font-bold ${leg.type === "CE" ? "text-emerald-300" : "text-red-300"}`}>{leg.type}</td>
                      <td className="p-2 font-bold text-white">{leg.strike.toLocaleString("en-IN")}</td>
                      <td className="p-2 text-white">₹{leg.premium}</td>
                      <td className="p-2 text-white">{leg.lots}</td>
                      <td className={`p-2 font-bold ${leg.action === "BUY" ? "text-red-300" : "text-emerald-300"}`}>
                        {leg.action === "BUY" ? "-" : "+"}₹{(leg.premium * leg.lots * leg.lotSize).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Strategy summary */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-black/25 p-3 text-center">
                <p className="text-xs text-slate-500">Net Cost / Credit</p>
                <p className={`font-bold ${maxCost > 0 ? "text-red-300" : "text-emerald-300"}`}>
                  {maxCost > 0 ? `-₹${maxCost.toLocaleString("en-IN")}` : `+₹${Math.abs(maxCost).toLocaleString("en-IN")}`}
                </p>
              </div>
              <div className="rounded-xl bg-black/25 p-3 text-center">
                <p className="text-xs text-slate-500">Max Profit</p>
                <p className="font-bold text-emerald-300">{maxProfit === Infinity ? "Unlimited" : `₹${maxProfit.toLocaleString("en-IN")}`}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3 text-center">
                <p className="text-xs text-slate-500">Max Loss</p>
                <p className="font-bold text-red-300">{maxLoss === -Infinity ? "Unlimited" : `₹${Math.abs(maxLoss).toLocaleString("en-IN")}`}</p>
              </div>
              <div className="rounded-xl bg-black/25 p-3 text-center">
                <p className="text-xs text-slate-500">Breakeven(s)</p>
                <p className="font-bold text-amber-300">{breakevens.length > 0 ? breakevens.join(", ") : "—"}</p>
              </div>
            </div>

            {/* Payoff visual bar chart */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Payoff at Expiry</p>
              <div className="space-y-1">
                {payoffs.map((p) => {
                  const maxAbs = Math.max(Math.abs(maxProfit), Math.abs(maxLoss), 1);
                  const pct = (p.pnl / maxAbs) * 50;
                  return (
                    <div key={p.spot} className="flex items-center gap-2 text-xs">
                      <span className={`w-16 text-right ${p.spot === atm ? "font-bold text-amber-300" : "text-slate-500"}`}>
                        {p.spot.toLocaleString("en-IN")}
                      </span>
                      <div className="relative flex-1 h-4">
                        <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
                        {pct >= 0 ? (
                          <div className="absolute top-0.5 h-3 rounded-r bg-emerald-500/70 transition-all" style={{ left: "50%", width: `${pct}%` }} />
                        ) : (
                          <div className="absolute top-0.5 h-3 rounded-l bg-red-500/70 transition-all" style={{ right: "50%", width: `${-pct}%` }} />
                        )}
                      </div>
                      <span className={`w-20 text-right font-bold ${p.pnl >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {p.pnl >= 0 ? "+" : ""}₹{p.pnl.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {legs.length === 0 && (
          <p className="text-sm text-slate-400">Select a strategy above to see the payoff graph.</p>
        )}
      </div>
    </div>
  );
}
