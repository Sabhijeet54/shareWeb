"use client";
// ─── News Section ────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from "react";
import { FiClock, FiExternalLink, FiRefreshCw } from "react-icons/fi";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  publishedAt: number;
  category: string;
  relatedSymbols: string[];
}

export function NewsSection({ symbol }: { symbol?: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ count: "20" });
      if (symbol) params.set("symbol", symbol);
      else params.set("category", "general");
      const resp = await fetch(`/api/news?${params}`);
      const data = await resp.json();
      setNews(data.news ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  function timeAgo(ts: number) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          {symbol ? `${symbol} News` : "Market News"}
        </h2>
        <button type="button" onClick={fetchNews}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <FiRefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && news.length === 0 && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="h-4 w-3/4 rounded bg-[var(--shimmer-bg)]" />
              <div className="mt-2 h-3 w-1/2 rounded bg-[var(--shimmer-bg)]" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-[var(--error-label)]">
          {error}
        </div>
      )}

      {!loading && news.length === 0 && !error && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No news available right now.</p>
        </div>
      )}

      <div className="space-y-3">
        {news.map((item) => (
          <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
            className="group flex gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition hover:border-emerald-400/30">
            {item.image && (
              <div className="hidden h-20 w-28 flex-shrink-0 overflow-hidden rounded-xl sm:block">
                <img src={item.image} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--green)] line-clamp-2">
                {item.title}
              </h3>
              {item.summary && (
                <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{item.summary}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                <span className="font-semibold text-[var(--text-secondary)]">{item.source}</span>
                <span className="flex items-center gap-1"><FiClock size={10} /> {timeAgo(item.publishedAt)}</span>
                <FiExternalLink size={10} className="ml-auto opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
