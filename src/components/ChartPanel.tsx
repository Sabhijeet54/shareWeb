"use client";

import { useMemo, useState } from "react";
import { FiMaximize2, FiMinimize2, FiArrowLeft } from "react-icons/fi";
import { getCurrencySign } from "@/lib/symbolMap";
import { resolveTradingViewSymbol } from "@/lib/tradingview";
import { useLiveSingleQuote } from "@/lib/useLiveQuotes";
import { TradingViewChart } from "@/components/TradingViewChart";

export function ChartPanel({ symbol, onBack }: { symbol: string; onBack?: () => void }) {
  const [fullscreen, setFullscreen] = useState(false);
  const liveQuote = useLiveSingleQuote(symbol, 3000);
  const resolution = useMemo(() => resolveTradingViewSymbol(symbol), [symbol]);
  const showTradingViewNotice = resolution.fallbackUsed;

  const tvSymbol = useMemo(
    () => liveQuote?.tvSymbol ?? resolveTradingViewSymbol(symbol).resolvedSymbol,
    [liveQuote?.tvSymbol, symbol],
  );

  const cs = getCurrencySign(symbol);
  const priceColor = liveQuote && liveQuote.changePct >= 0 ? "text-[var(--accent-label)]" : "text-[var(--error-label)]";

  return (
    <div className={`space-y-3 ${fullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-[var(--background)] p-4" : ""}`}>
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-label)]">Live Chart</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--text-primary)]">{symbol}</h2>
            <p className="text-xs text-[var(--text-muted)]">{tvSymbol}</p>
            {showTradingViewNotice && (
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">This symbol is only available on TradingView.</p>
            )}
            {liveQuote && !liveQuote.isLoading && (
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--text-primary)]">
                  {cs}{liveQuote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-sm font-bold ${priceColor}`}>
                  {liveQuote.changePct >= 0 ? "+" : ""}{liveQuote.changePct.toFixed(2)}%
                  {" "}({liveQuote.change >= 0 ? "+" : ""}{cs}{liveQuote.change.toFixed(2)})
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {onBack && (
              <button type="button" onClick={onBack} className="rounded-xl bg-[var(--hover-bg)] p-2 text-[var(--text-secondary)] hover:text-[var(--green)] transition-colors" title="Back">
                <FiArrowLeft size={18} />
              </button>
            )}
            <button type="button" onClick={() => setFullscreen((f) => !f)} className="rounded-xl bg-[var(--hover-bg)] p-2 text-[var(--text-secondary)]">
              {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-black/20">
          <TradingViewChart symbol={tvSymbol} height={420} />
        </div>

        {/* Live stats row */}
        {liveQuote && !liveQuote.isLoading && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
            {[
              { label: "Open", value: `${cs}${liveQuote.open.toLocaleString("en-IN")}` },
              { label: "High", value: `${cs}${liveQuote.high.toLocaleString("en-IN")}` },
              { label: "Low", value: `${cs}${liveQuote.low.toLocaleString("en-IN")}` },
              { label: "Prev Close", value: `${cs}${liveQuote.prevClose.toLocaleString("en-IN")}` },
              { label: "52W High", value: `${cs}${liveQuote.weekHigh52.toLocaleString("en-IN")}` },
              { label: "52W Low", value: `${cs}${liveQuote.weekLow52.toLocaleString("en-IN")}` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-[var(--background)]/80 p-2">
                <p className="text-[var(--text-muted)]">{stat.label}</p>
                <p className="mt-0.5 font-bold text-[var(--text-primary)]">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
