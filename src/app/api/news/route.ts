// ─── Market News API ──────────────────────────────────────────────────────
// Uses Finnhub news endpoint + Yahoo Finance news as fallback
// GET /api/news?category=general&count=20
// GET /api/news?symbol=RELIANCE&count=10

import { NextRequest, NextResponse } from "next/server";
import { toYahoo } from "@/lib/symbolMap";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

async function fetchFinnhubNews(category: string, symbol?: string): Promise<NewsItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  try {
    let url: string;
    if (symbol) {
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${key}`;
    } else {
      url = `https://finnhub.io/api/v1/news?category=${category}&token=${key}`;
    }
    const resp = await fetch(url, { next: { revalidate: 300 } });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, 30).map((n: {
      id?: number;
      headline?: string;
      summary?: string;
      source?: string;
      url?: string;
      image?: string;
      datetime?: number;
      category?: string;
      related?: string;
    }) => ({
      id: String(n.id ?? Math.random()),
      title: n.headline ?? "",
      summary: n.summary ?? "",
      source: n.source ?? "",
      url: n.url ?? "",
      image: n.image ?? "",
      publishedAt: (n.datetime ?? 0) * 1000,
      category: n.category ?? category,
      relatedSymbols: n.related ? n.related.split(",") : [],
    }));
  } catch {
    return [];
  }
}

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  try {
    const yahooSymbol = toYahoo(symbol);
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSymbol)}&newsCount=20&quotesCount=0`;
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      next: { revalidate: 300 },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const news = data?.news;
    if (!Array.isArray(news)) return [];
    return news.map((n: {
      uuid?: string;
      title?: string;
      publisher?: string;
      link?: string;
      providerPublishTime?: number;
      thumbnail?: { resolutions?: { url: string }[] };
    }) => ({
      id: n.uuid ?? String(Math.random()),
      title: n.title ?? "",
      summary: "",
      source: n.publisher ?? "",
      url: n.link ?? "",
      image: n.thumbnail?.resolutions?.[0]?.url ?? "",
      publishedAt: (n.providerPublishTime ?? 0) * 1000,
      category: "market",
      relatedSymbols: [symbol],
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const category = sp.get("category") ?? "general";
  const count = parseInt(sp.get("count") ?? "20", 10);

  let news: NewsItem[] = [];

  if (symbol) {
    // Symbol-specific news
    const [finnhub, yahoo] = await Promise.allSettled([
      fetchFinnhubNews(category, symbol),
      fetchYahooNews(symbol),
    ]);
    const fNews = finnhub.status === "fulfilled" ? finnhub.value : [];
    const yNews = yahoo.status === "fulfilled" ? yahoo.value : [];
    // Merge and deduplicate by title similarity (simple approach)
    const seen = new Set<string>();
    news = [...fNews, ...yNews].filter((n) => {
      const key = n.title.toLowerCase().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } else {
    // General market news
    news = await fetchFinnhubNews(category);
    if (news.length === 0) {
      // Try Yahoo with a general Indian market query
      news = await fetchYahooNews("NIFTY 50");
    }
  }

  // Sort by date, newest first
  news.sort((a, b) => b.publishedAt - a.publishedAt);
  news = news.slice(0, count);

  return NextResponse.json(
    { news },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
