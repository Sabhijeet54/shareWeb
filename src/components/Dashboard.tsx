"use client";

import { useEffect, useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiTrendingDown,
  FiTrendingUp,
  FiZap,
} from "react-icons/fi";
import {
  fetchIndices,
  fetchTopGainers,
  fetchTopLosers,
  fetchSectorPerformance,
  fetchMarketNews,
  getMarketStatus,
  getStaticStockList,
} from "@/lib/api";
import type { IndexData, StockQuote, SectorData, MarketNews } from "@/lib/api";


export function Dashboard({ onNavigate }: { onNavigate?: (tab: string, symbol?: string) => void }) {
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [gainers, setGainers] = useState<StockQuote[]>([]);
  const [losers, setLosers] = useState<StockQuote[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [news, setNews] = useState<MarketNews[]>([]);
  const [mostActive, setMostActive] = useState<StockQuote[]>([]);
  const marketStatus = getMarketStatus();

  useEffect(() => {
    fetchIndices().then(setIndices);
    fetchTopGainers().then(setGainers);
    fetchTopLosers().then(setLosers);
    fetchSectorPerformance().then(setSectors);
    fetchMarketNews().then(setNews);
    // Most active = sorted by volume from static list
    const stocks = getStaticStockList();
    setMostActive([...stocks].sort((a, b) => b.volume - a.volume).slice(0, 5));
  }, []);

  // Refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchIndices().then(setIndices);
      fetchTopGainers().then(setGainers);
      fetchTopLosers().then(setLosers);
    }, 30000);
    return () => clearInterval(interval);
  }, []);


  // Portfolio summary (mock)
  const portfolioValue = 248500;
  const dayPnL = 3420;
  const dayPnLPercent = 1.39;

  return (
    <div className="space-y-5">
      {/* Market Status */}
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${marketStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
          <span className="text-sm font-semibold text-white">{marketStatus.message}</span>
        </div>
        <span className="text-xs text-slate-500">
          {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
        </span>
      </div>

      {/* Live Indices */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2">
          <FiActivity className="text-emerald-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Live Indices</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indices.map((idx) => (
            <div key={idx.symbol} className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs text-slate-500">{idx.name}</p>
              <p className="mt-1 text-lg font-bold text-white">
                {idx.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </p>
              <p className={`mt-1 text-sm font-semibold ${idx.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {idx.changePercent >= 0 ? "+" : ""}{idx.change.toFixed(2)} ({idx.changePercent.toFixed(2)}%)
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* Portfolio Summary */}
      <section className="rounded-[1.5rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-900/20 to-slate-900/50 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300 mb-3">Portfolio Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400">Total Value</p>
            <p className="text-2xl font-bold text-white">Rs. {portfolioValue.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Day P&L</p>
            <p className={`text-2xl font-bold ${dayPnL >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {dayPnL >= 0 ? "+" : ""}Rs. {dayPnL.toLocaleString("en-IN")}
            </p>
            <p className={`text-sm ${dayPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ({dayPnLPercent >= 0 ? "+" : ""}{dayPnLPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </section>

      {/* Top Gainers */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2">
          <FiTrendingUp className="text-emerald-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300">Top Gainers</h2>
        </div>
        <div className="space-y-2">
          {gainers.slice(0, 5).map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => onNavigate?.("chart", stock.symbol)}
              className="flex w-full items-center justify-between rounded-xl bg-black/20 p-3 hover:bg-black/40 transition"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-white">{stock.symbol}</p>
                <p className="text-xs text-slate-500">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Rs. {stock.price.toLocaleString("en-IN")}</p>
                <p className="text-xs font-semibold text-emerald-300">+{stock.changePercent.toFixed(2)}%</p>
              </div>
            </button>
          ))}
        </div>
      </section>


      {/* Top Losers */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2">
          <FiTrendingDown className="text-red-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-red-300">Top Losers</h2>
        </div>
        <div className="space-y-2">
          {losers.slice(0, 5).map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => onNavigate?.("chart", stock.symbol)}
              className="flex w-full items-center justify-between rounded-xl bg-black/20 p-3 hover:bg-black/40 transition"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-white">{stock.symbol}</p>
                <p className="text-xs text-slate-500">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Rs. {stock.price.toLocaleString("en-IN")}</p>
                <p className="text-xs font-semibold text-red-300">{stock.changePercent.toFixed(2)}%</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Most Active by Volume */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2">
          <FiZap className="text-amber-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">Most Active (Volume)</h2>
        </div>
        <div className="space-y-2">
          {mostActive.map((stock) => (
            <button
              key={stock.symbol}
              onClick={() => onNavigate?.("chart", stock.symbol)}
              className="flex w-full items-center justify-between rounded-xl bg-black/20 p-3 hover:bg-black/40 transition"
            >
              <div className="text-left">
                <p className="text-sm font-bold text-white">{stock.symbol}</p>
                <p className="text-xs text-slate-500">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">Rs. {stock.price.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-400">Vol: {(stock.volume / 100000).toFixed(1)}L</p>
              </div>
            </button>
          ))}
        </div>
      </section>


      {/* Sector Performance */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="mb-4 flex items-center gap-2">
          <FiBarChart2 className="text-blue-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-blue-300">Sector Performance</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {sectors.map((sector) => (
            <div
              key={sector.name}
              className={`rounded-xl p-3 text-center ${
                sector.change >= 0 ? "bg-emerald-400/10 border border-emerald-400/20" : "bg-red-400/10 border border-red-400/20"
              }`}
            >
              <p className="text-xs font-bold text-white">{sector.name}</p>
              <p className={`mt-1 text-sm font-bold ${sector.change >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {sector.change >= 0 ? "+" : ""}{sector.change.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Market News */}
      <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-300">Market News</h2>
        <div className="space-y-3">
          {news.slice(0, 5).map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-black/20 p-3 hover:bg-black/40 transition"
            >
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span>{item.source}</span>
                <span>{item.publishedAt}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
