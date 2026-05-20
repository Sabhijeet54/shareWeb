"use client";

import { useState } from "react";
import { generateOptionsChain } from "@/lib/marketData";
import { useLiveSingleQuote } from "@/lib/useLiveQuotes";

const UNDERLYINGS = [
  { label: "NIFTY", symbol: "NIFTY", spotFallback: 22480 },
  { label: "BANKNIFTY", symbol: "BANKNIFTY", spotFallback: 48260 },
  { label: "FINNIFTY", symbol: "FINNIFTY", spotFallback: 21440 },
  { label: "MIDCPNIFTY", symbol: "MIDCPNIFTY", spotFallback: 10880 },
];

const EXPIRIES = ["29 May 2025", "05 Jun 2025", "26 Jun 2025", "31 Jul 2025"];

export function OptionsChain() {
  const [underlying, setUnderlying] = useState(UNDERLYINGS[0]);
  const [expiry, setExpiry] = useState(EXPIRIES[0]);

  const spotQuote = useLiveSingleQuote(underlying.symbol, 15000);
  const spotPrice = (spotQuote && !spotQuote.isLoading && spotQuote.price > 0)
    ? spotQuote.price
    : underlying.spotFallback;

  const chain = generateOptionsChain(spotPrice, expiry);

  // PCR = total PE OI / total CE OI (rough from chain numbers)
  const totalCeOI = chain.reduce((s, r) => s + parseFloat(r.ce.oi), 0);
  const totalPeOI = chain.reduce((s, r) => s + parseFloat(r.pe.oi), 0);
  const pcr = totalCeOI > 0 ? (totalPeOI / totalCeOI).toFixed(2) : "N/A";

  // Max pain: strike where total pain is lowest
  const maxPainStrike = chain.reduce((best, row) => {
    const pain = chain.reduce((sum, r) => {
      const ceLoss = Math.max(0, row.strike - r.strike) * parseFloat(r.ce.oi);
      const peLoss = Math.max(0, r.strike - row.strike) * parseFloat(r.pe.oi);
      return sum + ceLoss + peLoss;
    }, 0);
    return pain < best.pain ? { strike: row.strike, pain } : best;
  }, { strike: chain[0]?.strike ?? 0, pain: Infinity }).strike;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-300">Options Chain · Live</p>

        {/* Underlying selector */}
        <div className="flex flex-wrap gap-2 mb-3">
          {UNDERLYINGS.map((u) => (
            <button key={u.symbol} type="button" onClick={() => setUnderlying(u)}
              className={`h-9 rounded-xl px-4 text-xs font-bold ${underlying.symbol === u.symbol ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
              {u.label}
            </button>
          ))}
        </div>

        {/* Expiry selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {EXPIRIES.map((e) => (
            <button key={e} type="button" onClick={() => setExpiry(e)}
              className={`h-9 rounded-xl px-3 text-xs font-bold ${expiry === e ? "bg-indigo-500 text-white" : "bg-black/30 text-slate-400"}`}>
              {e}
            </button>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <p className="text-xs text-slate-500">Spot Price</p>
            <p className="font-bold text-white">₹{spotPrice.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <p className="text-xs text-slate-500">PCR</p>
            <p className={`font-bold ${Number(pcr) > 1 ? "text-emerald-300" : "text-red-300"}`}>{pcr}</p>
          </div>
          <div className="rounded-xl bg-black/25 p-3 text-center">
            <p className="text-xs text-slate-500">Max Pain</p>
            <p className="font-bold text-amber-300">{maxPainStrike.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Chain table */}
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-500">
                <th className="p-2 text-right text-emerald-400">CE OI</th>
                <th className="p-2 text-right text-emerald-400">CE Vol</th>
                <th className="p-2 text-right text-emerald-400">CE IV</th>
                <th className="p-2 text-right text-emerald-400">CE Δ</th>
                <th className="p-2 text-right font-bold text-emerald-400">CE ₹</th>
                <th className="p-2 text-center font-bold text-white bg-white/5">STRIKE</th>
                <th className="p-2 text-left font-bold text-red-400">PE ₹</th>
                <th className="p-2 text-left text-red-400">PE Δ</th>
                <th className="p-2 text-left text-red-400">PE IV</th>
                <th className="p-2 text-left text-red-400">PE Vol</th>
                <th className="p-2 text-left text-red-400">PE OI</th>
              </tr>
            </thead>
            <tbody>
              {chain.map((row) => (
                <tr key={row.strike}
                  className={`border-b border-white/5 ${row.isATM ? "bg-amber-400/10" : row.strike < spotPrice ? "bg-emerald-400/5" : "bg-red-400/5"}`}>
                  <td className="p-2 text-right text-slate-400">{row.ce.oi}</td>
                  <td className="p-2 text-right text-slate-400">{row.ce.volume}</td>
                  <td className="p-2 text-right text-slate-400">{row.ce.iv}%</td>
                  <td className="p-2 text-right text-slate-400">{row.ce.delta}</td>
                  <td className="p-2 text-right font-bold text-emerald-300">₹{row.ce.premium}</td>
                  <td className={`p-2 text-center font-bold ${row.isATM ? "text-amber-300" : "text-white"} bg-white/5`}>
                    {row.strike.toLocaleString("en-IN")}
                    {row.isATM && <span className="ml-1 text-[10px] text-amber-400">ATM</span>}
                  </td>
                  <td className="p-2 font-bold text-red-300">₹{row.pe.premium}</td>
                  <td className="p-2 text-slate-400">{row.pe.delta}</td>
                  <td className="p-2 text-slate-400">{row.pe.iv}%</td>
                  <td className="p-2 text-slate-400">{row.pe.volume}</td>
                  <td className="p-2 text-slate-400">{row.pe.oi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Greeks legend */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-slate-400">
        <p className="mb-2 font-semibold text-white">Greeks Guide</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          <p>Δ <span className="text-white">Delta</span> — price sensitivity</p>
          <p>Γ <span className="text-white">Gamma</span> — delta change rate</p>
          <p>Θ <span className="text-white">Theta</span> — time decay/day</p>
          <p>ν <span className="text-white">Vega</span> — IV sensitivity</p>
        </div>
      </div>
    </div>
  );
}
