// ─── Market News API ──────────────────────────────────────────────────────
// Returns market news. Currently uses NSE/RSS feeds.
// Will be replaced with Upstox news or dedicated news API later.
//
// GET /api/news?category=general&count=20
// GET /api/news?symbol=RELIANCE&count=10
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

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

/** Placeholder news — will be replaced with real news API (Upstox/NewsAPI) */
function getPlaceholderNews(symbol?: string, count = 20): NewsItem[] {
  const headlines = [
    { title: "Markets close higher on strong FII inflows", summary: "Indian equity markets ended the session higher, driven by foreign institutional investor buying." },
    { title: "RBI keeps repo rate unchanged at 6.5%", summary: "The Reserve Bank of India maintained the repo rate, citing stable inflation outlook." },
    { title: "IT sector sees fresh buying interest", summary: "IT stocks rallied as global tech demand shows signs of recovery." },
    { title: "NIFTY crosses key resistance level", summary: "The benchmark NIFTY 50 surpassed important technical levels, indicating bullish momentum." },
    { title: "Banking stocks lead market rally", summary: "Bank Nifty surged on positive credit growth data and improving asset quality." },
    { title: "Auto sector steady on strong monthly sales", summary: "Automobile stocks held gains after major manufacturers reported robust monthly sales figures." },
    { title: "FII activity turns positive in Indian markets", summary: "Foreign institutional investors turned net buyers in Indian equities after weeks of selling." },
    { title: "Pharma stocks gain on US FDA approvals", summary: "Pharmaceutical companies saw buying interest after regulatory approvals for key drugs." },
    { title: "Metal stocks rise on global commodity rally", summary: "Metal and mining stocks advanced tracking higher base metal prices globally." },
    { title: "FMCG sector under pressure on rural demand concerns", summary: "Fast-moving consumer goods stocks declined on worries over rural consumption slowdown." },
    { title: "Oil prices impact Indian markets", summary: "Crude oil price movements continue to influence energy and airline stocks." },
    { title: "Indian GDP growth beats estimates", summary: "India's quarterly GDP growth exceeded analyst expectations, boosting market sentiment." },
    { title: "PSU banks rally on strong earnings", summary: "Public sector bank stocks surged after reporting better-than-expected quarterly results." },
    { title: "Defence stocks in focus on new orders", summary: "Defence sector companies gained momentum on fresh government procurement orders." },
    { title: "Real estate stocks rise on sector reforms", summary: "Real estate companies advanced following positive regulatory developments." },
  ];

  const now = Date.now();
  const news: NewsItem[] = headlines.slice(0, count).map((h, i) => ({
    id: `news-${i}-${now}`,
    title: symbol ? `${symbol}: ${h.title}` : h.title,
    summary: h.summary,
    source: "Market Watch",
    url: "#",
    image: "",
    publishedAt: now - i * 3600_000,
    category: "market",
    relatedSymbols: symbol ? [symbol] : [],
  }));

  return news;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const symbol = sp.get("symbol") ?? "";
  const count = parseInt(sp.get("count") ?? "20", 10);

  const news = getPlaceholderNews(symbol || undefined, count);

  return NextResponse.json(
    { news },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
