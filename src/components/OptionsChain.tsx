"use client";
// ─── F&O Options Chain — REAL Live Data from NSE via Yahoo Finance ───────
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { equityInstruments, indexInstruments } from "@/lib/marketData";

// Combine stocks + indices for F&O
const FNO_INSTRUMENTS = [
  ...indexInstruments.filter(i => ["NIFTY 50", "BANK NIFTY"].includes(i.symbol)),
  ...equityInstruments.slice(0, 30),
];

interface OptionLeg {
  premium: number;
  bid: number;
  ask: number;
  iv: number;
  oi: number;
  oiFormatted: string;
  oiChange: number;
  volume: number;
  volumeFormatted: string;
  change: number;
  changePct: number;
  itm: boolean;
}

interface StrikeRow {
  strike: number;
  expiry: string;
  isATM: boolean;
  ce: OptionLeg;
  pe: OptionLeg;
}

interface OptionsData {
  symbol: string;
  underlyingName: string;
  spotPrice: number;
  atmStrike: number;
  pcr: number;
  maxPainStrike: number;
  expiryStr: string;
  expirationDates: number[];
  chain: StrikeRow[];
  totalCeOI: number;
  totalPeOI: number;
}

export function OptionsChain() {
  const [underlyingSymbol, setUnderlyingSymbol] = useState(FNO_INSTRUMENTS[0]?.symbol ?? "NIFTY 50");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<OptionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchChain = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ symbol: underlyingSymbol });
      if (selectedDate) params.set("date", selectedDate);
      const resp = await fetch(`/api/options?${params}`);
      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [underlyingSymbol, selectedDate]);

  useEffect(() => { fetchChain(); }, [fetchChain]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchChain, 30000);
    return () => clearInterval(id);
  }, [fetchChain]);

  // Expiry options for dropdown
  const expiryOptions = useMemo(() => {
    if (!data?.expirationDates) return [];
    return data.expirationDates.map((ts) => ({
      value: String(ts),
      label: new Date(ts * 1000).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
      }),
    }));
  }, [data?.expirationDates]);

  const chain = data?.chain ?? [];
  const spotPrice = data?.spotPrice ?? 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--green)]">
              Options Chain · Live
            </p>
            {lastUpdated && (
              <p className="text-[10px] text-[var(--text-muted)]">
                Updated: {lastUpdated.toLocaleTimeString("en-IN")}
              </p>
            )}
          </div>
          <button type="button" onClick={fetchChain}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--green)]">
            <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Underlying selector */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {FNO_INSTRUMENTS.map((item) => (
            <button key={item.symbol} type="button"
              onClick={() => { setUnderlyingSymbol(item.symbol); setSelectedDate(""); }}
              className={`h-8 rounded-lg px-3 text-[11px] font-bold transition ${
                underlyingSymbol === item.symbol
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}>
              {item.symbol}
            </button>
          ))}
        </div>

        {/* Expiry selector */}
        {expiryOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {expiryOptions.slice(0, 6).map((e) => (
              <button key={e.value} type="button"
                onClick={() => setSelectedDate(e.value)}
                className={`h-8 rounded-lg px-3 text-[11px] font-bold transition ${
                  selectedDate === e.value || (!selectedDate && e.value === String(data?.expirationDates?.[0]))
                    ? "bg-indigo-500 text-white"
                    : "bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}>
                {e.label}
              </button>
            ))}
            {expiryOptions.length > 6 && (
              <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 text-[11px] font-bold text-[var(--text-secondary)] outline-none">
                <option value="">More...</option>
                {expiryOptions.slice(6).map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-4">
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Spot Price</p>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {spotPrice > 0 ? `₹${spotPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">{data?.underlyingName ?? underlyingSymbol}</p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">PCR (OI)</p>
            <p className={`text-base font-bold ${(data?.pcr ?? 0) > 1 ? "text-[var(--green)]" : (data?.pcr ?? 0) > 0.7 ? "text-[var(--warn-label)]" : "text-[var(--red)]"}`}>
              {data?.pcr ?? "—"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {(data?.pcr ?? 0) > 1.2 ? "Bullish" : (data?.pcr ?? 0) > 0.8 ? "Neutral" : "Bearish"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Max Pain</p>
            <p className="text-base font-bold text-[var(--warn-label)]">
              {data?.maxPainStrike ? `₹${data.maxPainStrike.toLocaleString("en-IN")}` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--background)] p-3 text-center">
            <p className="text-[10px] font-semibold text-[var(--text-muted)]">Total OI</p>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-[10px]">
                <span className="text-[var(--green)]">CE:</span>{" "}
                <span className="font-bold text-[var(--text-primary)]">{formatNum(data?.totalCeOI ?? 0)}</span>
              </span>
              <span className="text-[10px]">
                <span className="text-[var(--red)]">PE:</span>{" "}
                <span className="font-bold text-[var(--text-primary)]">{formatNum(data?.totalPeOI ?? 0)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 mb-3 text-sm text-[var(--red)]">
            {error}
            <button type="button" onClick={fetchChain}
              className="ml-2 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && chain.length === 0 && (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="h-8 flex-1 animate-pulse rounded bg-emerald-400/5" />
                <div className="h-8 w-20 animate-pulse rounded bg-[var(--card-border)]" />
                <div className="h-8 flex-1 animate-pulse rounded bg-red-400/5" />
              </div>
            ))}
          </div>
        )}

        {/* Chain table */}
        {chain.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[var(--card-border)]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--card-border)] text-[var(--text-muted)]">
                  <th className="p-2 text-right text-[var(--green)] font-semibold">OI</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Vol</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">IV%</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Chg%</th>
                  <th className="p-2 text-right text-[var(--green)] font-semibold">Bid</th>
                  <th className="p-2 text-right text-[var(--green)] font-bold">CE ₹</th>
                  <th className="p-2 text-center font-bold text-[var(--text-primary)] bg-[var(--background)]">STRIKE</th>
                  <th className="p-2 text-left text-[var(--red)] font-bold">PE ₹</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Bid</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Chg%</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">IV%</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">Vol</th>
                  <th className="p-2 text-left text-[var(--red)] font-semibold">OI</th>
                </tr>
              </thead>
              <tbody>
                {chain.map((row) => {
                  const ceUp = row.ce.change >= 0;
                  const peUp = row.pe.change >= 0;
                  return (
                    <tr key={row.strike}
                      className={`border-b border-[var(--card-border)] transition-colors ${
                        row.isATM
                          ? "bg-amber-400/10"
                          : row.ce.itm
                            ? "bg-emerald-400/[0.04]"
                            : row.pe.itm
                              ? "bg-red-400/[0.04]"
                              : ""
                      }`}>
                      {/* CE side */}
                      <td className="p-1.5 text-right text-[var(--text-secondary)]">
                        {row.ce.oi > 0 ? row.ce.oiFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.volume > 0 ? row.ce.volumeFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.iv > 0 ? `${row.ce.iv}` : "—"}
                      </td>
                      <td className={`p-1.5 text-right font-semibold ${ceUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.ce.changePct !== 0 ? `${row.ce.changePct > 0 ? "+" : ""}${row.ce.changePct.toFixed(1)}` : "—"}
                      </td>
                      <td className="p-1.5 text-right text-[var(--text-muted)]">
                        {row.ce.bid > 0 ? row.ce.bid.toFixed(2) : "—"}
                      </td>
                      <td className={`p-1.5 text-right font-bold ${ceUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.ce.premium > 0 ? `₹${row.ce.premium.toFixed(2)}` : "—"}
                      </td>

                      {/* Strike */}
                      <td className={`p-1.5 text-center font-bold bg-[var(--background)] ${row.isATM ? "text-[var(--warn-label)]" : "text-[var(--text-primary)]"}`}>
                        {row.strike.toLocaleString("en-IN")}
                        {row.isATM && <span className="ml-1 text-[9px] text-[var(--warn-label)]">ATM</span>}
                      </td>

                      {/* PE side */}
                      <td className={`p-1.5 text-left font-bold ${peUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.pe.premium > 0 ? `₹${row.pe.premium.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.bid > 0 ? row.pe.bid.toFixed(2) : "—"}
                      </td>
                      <td className={`p-1.5 text-left font-semibold ${peUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {row.pe.changePct !== 0 ? `${row.pe.changePct > 0 ? "+" : ""}${row.pe.changePct.toFixed(1)}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.iv > 0 ? `${row.pe.iv}` : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-muted)]">
                        {row.pe.volume > 0 ? row.pe.volumeFormatted : "—"}
                      </td>
                      <td className="p-1.5 text-left text-[var(--text-secondary)]">
                        {row.pe.oi > 0 ? row.pe.oiFormatted : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* No data */}
        {!loading && chain.length === 0 && !error && (
          <div className="rounded-xl bg-[var(--background)] p-6 text-center text-sm text-[var(--text-muted)]">
            No options data available for {underlyingSymbol}. Try a different stock.
          </div>
        )}
      </div>

      {/* OI Analysis */}
      {chain.length > 0 && (
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <p className="mb-3 text-sm font-bold text-[var(--text-primary)]">OI Analysis</p>
          <div className="space-y-1.5">
            {/* Top 5 CE OI */}
            <p className="text-[10px] font-semibold text-[var(--green)] uppercase tracking-wider">Highest Call OI (Resistance)</p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {[...chain].sort((a, b) => b.ce.oi - a.ce.oi).slice(0, 5).map((r) => (
                <div key={r.strike} className="rounded-lg bg-emerald-400/10 p-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--green)]">{r.strike.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.ce.oiFormatted}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-[var(--red)] uppercase tracking-wider">Highest Put OI (Support)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[...chain].sort((a, b) => b.pe.oi - a.pe.oi).slice(0, 5).map((r) => (
                <div key={r.strike} className="rounded-lg bg-red-400/10 p-2 text-center">
                  <p className="text-[11px] font-bold text-[var(--red)]">{r.strike.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{r.pe.oiFormatted}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-xs text-[var(--text-muted)]">
        <p className="mb-2 font-semibold text-[var(--text-primary)]">Guide</p>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          <p><span className="text-[var(--green)]">Green</span> — In-the-money Calls</p>
          <p><span className="text-[var(--red)]">Red</span> — In-the-money Puts</p>
          <p><span className="text-[var(--warn-label)]">ATM</span> — At the money</p>
          <p>OI — Open Interest · IV — Implied Volatility</p>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
          All data is LIVE from market feed. Auto-refreshes every 30 seconds.
        </p>
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(1) + "Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(1) + "L";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}
