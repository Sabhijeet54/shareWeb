import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Use Yahoo Finance news for Indian market
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=indian+stock+market&newsCount=10&quotesCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error("Failed");
    const data = await res.json();
    const news = (data?.news || []).map((n: Record<string, unknown>) => ({
      title: n.title || "",
      description: n.title || "",
      url: n.link || "#",
      source: (n.publisher as string) || "Market News",
      publishedAt: new Date((n.providerPublishTime as number) * 1000).toLocaleString(),
    }));
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
