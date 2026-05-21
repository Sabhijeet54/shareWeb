"use client";
// ─── Company Profile ────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { FiTrendingUp, FiBarChart2, FiExternalLink, FiDollarSign, FiUsers, FiMapPin, FiTarget } from "react-icons/fi";
import { useLiveQuotes } from "@/lib/useLiveQuotes";

interface ProfileData {
  symbol: string;
  name: string;
  shortName: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  website: string;
  description: string;
  country: string;
  city: string;
  employees: number;
  marketCap: number;
  pe: number;
  forwardPE: number;
  eps: number;
  bookValue: number;
  priceToBook: number;
  dividendYield: number;
  dividendRate: number;
  beta: number;
  revenue: number;
  revenueGrowth: number;
  grossMargin: number;
  operatingMargin: number;
  profitMargin: number;
  returnOnEquity: number;
  debtToEquity: number;
  currentRatio: number;
  freeCashflow: number;
  targetMeanPrice: number;
  targetHighPrice: number;
  targetLowPrice: number;
  recommendationKey: string;
  numberOfAnalystOpinions: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  fiftyDayAverage: number;
  twoHundredDayAverage: number;
  averageVolume: number;
}

function formatNum(n: number, currency = false): string {
  if (!n) return "—";
  if (currency) {
    if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    return `₹${n.toLocaleString("en-IN")}`;
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString("en-IN");
}

export function CompanyProfile({ symbol, onSelectSymbol }: { symbol: string; onSelectSymbol?: (s: string) => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const quotes = useLiveQuotes([symbol], 2500);
  const q = quotes[symbol];

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setProfile(data.profile);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <div className="h-5 w-1/3 rounded bg-[var(--shimmer-bg)]" />
            <div className="mt-3 h-4 w-2/3 rounded bg-[var(--shimmer-bg)]" />
            <div className="mt-2 h-4 w-1/2 rounded bg-[var(--shimmer-bg)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-center">
        <p className="text-sm text-[var(--error-label)]">{error || "Profile not found"}</p>
        <button type="button" onClick={fetchProfile}
          className="mt-3 rounded-xl bg-red-400/20 px-4 py-2 text-xs font-bold text-[var(--error-label)] hover:bg-red-400/30">
          Retry
        </button>
      </div>
    );
  }

  const p = profile;
  const price = q && !q.isLoading && q.price > 0 ? q.price : 0;
  const pct = q && !q.isLoading ? q.changePct : 0;
  const isUp = pct >= 0;

  const stats = [
    { label: "Market Cap", value: formatNum(p.marketCap, true) },
    { label: "P/E Ratio", value: p.pe ? p.pe.toFixed(2) : "—" },
    { label: "Forward P/E", value: p.forwardPE ? p.forwardPE.toFixed(2) : "—" },
    { label: "EPS (TTM)", value: p.eps ? `₹${p.eps.toFixed(2)}` : "—" },
    { label: "Book Value", value: p.bookValue ? `₹${p.bookValue.toFixed(2)}` : "—" },
    { label: "P/B Ratio", value: p.priceToBook ? p.priceToBook.toFixed(2) : "—" },
    { label: "Dividend Yield", value: p.dividendYield ? `${(p.dividendYield * 100).toFixed(2)}%` : "—" },
    { label: "Beta", value: p.beta ? p.beta.toFixed(2) : "—" },
    { label: "52W High", value: p.fiftyTwoWeekHigh ? `₹${p.fiftyTwoWeekHigh.toLocaleString("en-IN")}` : "—" },
    { label: "52W Low", value: p.fiftyTwoWeekLow ? `₹${p.fiftyTwoWeekLow.toLocaleString("en-IN")}` : "—" },
    { label: "50 DMA", value: p.fiftyDayAverage ? `₹${p.fiftyDayAverage.toFixed(2)}` : "—" },
    { label: "200 DMA", value: p.twoHundredDayAverage ? `₹${p.twoHundredDayAverage.toFixed(2)}` : "—" },
    { label: "Avg. Volume", value: p.averageVolume ? formatNum(p.averageVolume) : "—" },
    { label: "Revenue", value: formatNum(p.revenue, true) },
    { label: "Revenue Growth", value: p.revenueGrowth ? `${(p.revenueGrowth * 100).toFixed(1)}%` : "—" },
    { label: "Profit Margin", value: p.profitMargin ? `${(p.profitMargin * 100).toFixed(1)}%` : "—" },
    { label: "ROE", value: p.returnOnEquity ? `${(p.returnOnEquity * 100).toFixed(1)}%` : "—" },
    { label: "D/E Ratio", value: p.debtToEquity ? p.debtToEquity.toFixed(2) : "—" },
  ];

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{p.name}</h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold text-[var(--green)]">
                {symbol}
              </span>
              <span>{p.exchange}</span>
              {p.sector && <span>· {p.sector}</span>}
              {p.industry && <span>· {p.industry}</span>}
            </div>
          </div>
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--green)]">
              <FiExternalLink size={12} /> Website
            </a>
          )}
        </div>

        {/* Live price */}
        {price > 0 && (
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[var(--text-primary)]">
              ₹{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${isUp ? "bg-emerald-400/15 text-[var(--green)]" : "bg-red-400/15 text-[var(--red)]"}`}>
              {isUp ? "+" : ""}{pct.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Meta info */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          {p.country && (
            <span className="flex items-center gap-1"><FiMapPin size={11} /> {p.city ? `${p.city}, ` : ""}{p.country}</span>
          )}
          {p.employees > 0 && (
            <span className="flex items-center gap-1"><FiUsers size={11} /> {p.employees.toLocaleString()} employees</span>
          )}
          {p.currency && (
            <span className="flex items-center gap-1"><FiDollarSign size={11} /> {p.currency}</span>
          )}
        </div>

        {/* View chart */}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => onSelectSymbol?.(symbol)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-400/15 px-4 py-2 text-sm font-bold text-[var(--green)] hover:bg-emerald-400/25">
            <FiBarChart2 size={14} /> Open Chart
          </button>
        </div>
      </div>

      {/* About */}
      {p.description && (
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="mb-3 text-sm font-bold text-[var(--text-primary)]">About {p.shortName}</h3>
          <p className={`text-sm leading-relaxed text-[var(--text-secondary)] ${!showFullDesc ? "line-clamp-4" : ""}`}>
            {p.description}
          </p>
          {p.description.length > 300 && (
            <button type="button" onClick={() => setShowFullDesc(!showFullDesc)}
              className="mt-2 text-xs font-semibold text-[var(--green)] hover:underline">
              {showFullDesc ? "Show Less" : "Read More"}
            </button>
          )}
        </div>
      )}

      {/* Analyst Targets */}
      {p.targetMeanPrice > 0 && (
        <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <FiTarget size={14} /> Analyst Consensus
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Recommendation</p>
              <p className="mt-1 text-sm font-bold text-[var(--green)] uppercase">{p.recommendationKey || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Target (Mean)</p>
              <p className="mt-1 text-sm font-bold text-[var(--text-primary)]">₹{p.targetMeanPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Target High</p>
              <p className="mt-1 text-sm font-bold text-[var(--green)]">₹{p.targetHighPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Target Low</p>
              <p className="mt-1 text-sm font-bold text-[var(--red)]">₹{p.targetLowPrice.toFixed(2)}</p>
            </div>
          </div>
          {p.numberOfAnalystOpinions > 0 && (
            <p className="mt-3 text-[10px] text-[var(--text-muted)]">
              Based on {p.numberOfAnalystOpinions} analyst opinions
            </p>
          )}
        </div>
      )}

      {/* Key Financials */}
      <div className="rounded-[1.5rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <FiTrendingUp size={14} /> Key Statistics
        </h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-[11px] text-[var(--text-muted)]">{s.label}</p>
              <p className="mt-0.5 text-sm font-bold text-[var(--text-primary)]">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
