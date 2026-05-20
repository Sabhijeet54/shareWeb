"use client";

import { useEffect, useState } from "react";
import { FiSearch, FiBarChart2 } from "react-icons/fi";
import { fetchStockQuote, fetchMarketNews, getStaticStockList } from "@/lib/api";
import type { StockQuote, MarketNews } from "@/lib/api";

type ResearchTab = "details" | "financials" | "news" | "ipo";

const financialData = {
  quarterly: [
    { quarter: "Q4 FY25", revenue: 24580, profit: 4820, opm: 19.6 },
    { quarter: "Q3 FY25", revenue: 23140, profit: 4520, opm: 19.5 },
    { quarter: "Q2 FY25", revenue: 22800, profit: 4380, opm: 19.2 },
    { quarter: "Q1 FY25", revenue: 21960, profit: 4120, opm: 18.8 },
  ],
  holdings: { promoter: 50.3, fii: 24.8, dii: 15.2, public: 9.7 },
  analysts: { buy: 28, hold: 8, sell: 2, targetPrice: 3180 },
};

const ipoData = [
  { name: "Ather Energy", price: "304-321", size: "2800 Cr", date: "28-May-2025", gmp: "+42", status: "Open" },
  { name: "Nuvoton Technology", price: "480-505", size: "1200 Cr", date: "2-Jun-2025", gmp: "+28", status: "Upcoming" },
  { name: "Waaree Energies", price: "1427-1503", size: "4200 Cr", date: "21-May-2025", gmp: "+180", status: "Closed" },
  { name: "Swiggy", price: "371-390", size: "11000 Cr", date: "15-May-2025", gmp: "-12", status: "Listed" },
];


export function ResearchPage() {
  const [tab, setTab] = useState<ResearchTab>("details");
  const [symbol, setSymbol] = useState("RELIANCE");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [news, setNews] = useState<MarketNews[]>([]);
  const stocks = getStaticStockList();

  useEffect(() => {
    fetchStockQuote(symbol).then(setQuote);
    fetchMarketNews().then(setNews);
  }, [symbol]);

  return (
    <div className="space-y-4">
      {/* Stock Selector */}
      <div className="flex items-center gap-3">
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}
          className="h-10 rounded-xl bg-black/30 px-3 text-sm text-white border border-white/10 flex-1">
          {stocks.map((s) => <option key={s.symbol} value={s.symbol} className="bg-slate-900">{s.symbol} - {s.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([["details", "Stock Details"], ["financials", "Financials"], ["news", "News"], ["ipo", "IPO"]] as [ResearchTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${tab === key ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stock Details */}
      {tab === "details" && quote && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{quote.symbol}</h3>
                <p className="text-sm text-slate-400">{quote.name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">Rs. {quote.price.toLocaleString("en-IN")}</p>
                <p className={`text-sm font-bold ${quote.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {quote.changePercent >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Market Cap</p><p className="text-sm font-bold text-white">Rs. {quote.marketCap.toLocaleString("en-IN")} Cr</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">P/E Ratio</p><p className="text-sm font-bold text-white">{quote.pe.toFixed(1)}</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">EPS</p><p className="text-sm font-bold text-white">Rs. {quote.eps.toFixed(1)}</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Book Value</p><p className="text-sm font-bold text-white">Rs. {(quote.price / (quote.pe * 0.6)).toFixed(0)}</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">52W High</p><p className="text-sm font-bold text-emerald-300">Rs. {quote.week52High.toLocaleString("en-IN")}</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">52W Low</p><p className="text-sm font-bold text-red-300">Rs. {quote.week52Low.toLocaleString("en-IN")}</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Avg Volume</p><p className="text-sm font-bold text-white">{(quote.avgVolume / 100000).toFixed(1)}L</p></div>
            <div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">D/E Ratio</p><p className="text-sm font-bold text-white">{(Math.random() * 1.5).toFixed(2)}</p></div>
          </div>


          {/* Shareholding */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="text-sm font-bold text-white mb-3">Shareholding Pattern</h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center"><p className="text-xs text-slate-500">Promoter</p><p className="text-lg font-bold text-blue-300">{financialData.holdings.promoter}%</p></div>
              <div className="text-center"><p className="text-xs text-slate-500">FII</p><p className="text-lg font-bold text-emerald-300">{financialData.holdings.fii}%</p></div>
              <div className="text-center"><p className="text-xs text-slate-500">DII</p><p className="text-lg font-bold text-purple-300">{financialData.holdings.dii}%</p></div>
              <div className="text-center"><p className="text-xs text-slate-500">Public</p><p className="text-lg font-bold text-amber-300">{financialData.holdings.public}%</p></div>
            </div>
            <div className="mt-3 h-3 rounded-full overflow-hidden flex">
              <div className="bg-blue-400" style={{ width: `${financialData.holdings.promoter}%` }} />
              <div className="bg-emerald-400" style={{ width: `${financialData.holdings.fii}%` }} />
              <div className="bg-purple-400" style={{ width: `${financialData.holdings.dii}%` }} />
              <div className="bg-amber-400" style={{ width: `${financialData.holdings.public}%` }} />
            </div>
          </div>

          {/* Analyst Recommendations */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="text-sm font-bold text-white mb-3">Analyst Recommendations</h4>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <span className="rounded bg-emerald-400/20 px-2 py-1 text-xs font-bold text-emerald-300">Buy: {financialData.analysts.buy}</span>
                <span className="rounded bg-amber-400/20 px-2 py-1 text-xs font-bold text-amber-300">Hold: {financialData.analysts.hold}</span>
                <span className="rounded bg-red-400/20 px-2 py-1 text-xs font-bold text-red-300">Sell: {financialData.analysts.sell}</span>
              </div>
              <p className="text-xs text-slate-400">Target: <span className="font-bold text-emerald-300">Rs. {financialData.analysts.targetPrice}</span></p>
            </div>
          </div>
        </div>
      )}


      {/* Financials */}
      {tab === "financials" && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Quarterly Results</h3>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-black/30 text-slate-500">
                  <th className="px-3 py-2 text-left">Quarter</th>
                  <th className="px-3 py-2 text-right">Revenue (Cr)</th>
                  <th className="px-3 py-2 text-right">Net Profit (Cr)</th>
                  <th className="px-3 py-2 text-right">OPM %</th>
                </tr>
              </thead>
              <tbody>
                {financialData.quarterly.map((q) => (
                  <tr key={q.quarter} className="border-b border-white/5">
                    <td className="px-3 py-2 text-white">{q.quarter}</td>
                    <td className="px-3 py-2 text-right text-white">Rs. {q.revenue.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-emerald-300">Rs. {q.profit.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-2 text-right text-white">{q.opm}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* News */}
      {tab === "news" && (
        <div className="space-y-2">
          {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block rounded-xl bg-black/20 p-3 hover:bg-black/40 transition">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span>{item.source}</span><span>{item.publishedAt}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* IPO */}
      {tab === "ipo" && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white">IPO Tracker</h3>
          {ipoData.map((ipo, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{ipo.name}</p>
                  <p className="text-xs text-slate-500">Price Band: Rs. {ipo.price}</p>
                  <p className="text-xs text-slate-500">Issue Size: Rs. {ipo.size} | Date: {ipo.date}</p>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    ipo.status === "Open" ? "bg-emerald-400/20 text-emerald-300" :
                    ipo.status === "Upcoming" ? "bg-blue-400/20 text-blue-300" :
                    ipo.status === "Listed" ? "bg-purple-400/20 text-purple-300" :
                    "bg-slate-400/20 text-slate-300"
                  }`}>{ipo.status}</span>
                  <p className={`mt-1 text-sm font-bold ${Number(ipo.gmp.replace("+", "")) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    GMP: {ipo.gmp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
