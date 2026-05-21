"use client";
// ─── Global Markets: Commodities, Forex, Crypto ──────────────────────────
import { useMemo } from "react";
import { FiTrendingUp, FiTrendingDown, FiDollarSign } from "react-icons/fi";
import { useLiveQuotes } from "@/lib/useLiveQuotes";
import { watchlists } from "@/lib/marketData";

const ALL_GLOBAL = [
  ...watchlists.commodities.map((i) => i.symbol),
  ...watchlists.forex.map((i) => i.symbol),
  ...watchlists.crypto.map((i) => i.symbol),
];

export function GlobalMarkets({ onSelectSymbol }: { onSelectSymbol?: (symbol: string) => void }) {
  const quotes = useLiveQuotes(ALL_GLOBAL, 20000);

  const sections = useMemo(() => [
    { title: "Commodities", emoji: "🪙", instruments: watchlists.commodities },
    { title: "Forex", emoji: "💱", instruments: watchlists.forex },
    { title: "Crypto", emoji: "₿", instruments: watchlists.crypto },
  ], []);

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">Global Markets</h2>

      {sections.map((section) => (
        <div key={section.title} className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <span>{section.emoji}</span> {section.title}
          </p>
          <div className="space-y-2">
            {section.instruments.map((instrument) => {
              const q = quotes[instrument.symbol];
              const hasPrice = q && !q.isLoading && q.price > 0;
              const price = hasPrice ? q!.price : 0;
              const change = hasPrice ? q!.change : 0;
              const pct = hasPrice ? q!.changePct : 0;
              const isUp = pct >= 0;

              return (
                <button key={instrument.symbol} type="button"
                  onClick={() => onSelectSymbol?.(instrument.symbol)}
                  className="flex w-full items-center justify-between rounded-xl bg-[var(--background)]/80 px-4 py-3 text-left transition hover:bg-[var(--hover-bg)] dark:bg-[var(--background)]/80 dark:hover:bg-[var(--hover-bg)]"
                  style={{ background: "var(--card-bg)" }}>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${isUp ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                      {isUp ? <FiTrendingUp className="text-[var(--green)]" /> : <FiTrendingDown className="text-[var(--red)]" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{instrument.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{instrument.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {q?.isLoading ? (
                      <div className="h-4 w-16 animate-pulse rounded bg-[var(--shimmer-bg)]" />
                    ) : !hasPrice ? (
                      <p className="text-xs text-[var(--text-muted)]">—</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {instrument.subtitle === "Forex" ? price.toFixed(4) : price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center justify-end gap-1">
                          <span className={`text-xs font-bold ${isUp ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                            {isUp ? "+" : ""}{change.toFixed(2)}
                          </span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isUp ? "bg-emerald-400/15 text-[var(--green)]" : "bg-red-400/15 text-[var(--red)]"}`}>
                            {isUp ? "+" : ""}{pct.toFixed(2)}%
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
