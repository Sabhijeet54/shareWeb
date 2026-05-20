"use client";

import { useEffect, useRef, useState } from "react";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
import {
  fetchChartData,
  fetchStockQuote,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVWAP,
  calculateSupertrend,
} from "@/lib/api";
import type { CandleData, StockQuote } from "@/lib/api";

type ChartType = "candle" | "line" | "bar" | "heikinashi";
type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "1d" | "1wk" | "1mo";
type Indicator = "sma" | "ema" | "rsi" | "macd" | "bollinger" | "volume" | "supertrend" | "vwap";

const timeframes: { key: Timeframe; label: string; range: string }[] = [
  { key: "1m", label: "1m", range: "1d" },
  { key: "5m", label: "5m", range: "5d" },
  { key: "15m", label: "15m", range: "5d" },
  { key: "30m", label: "30m", range: "1mo" },
  { key: "1h", label: "1H", range: "1mo" },
  { key: "1d", label: "1D", range: "6mo" },
  { key: "1wk", label: "1W", range: "1y" },
  { key: "1mo", label: "1M", range: "5y" },
];


export function ChartPage({ symbol: initialSymbol }: { symbol?: string }) {
  const [symbol, setSymbol] = useState(initialSymbol || "RELIANCE");
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [indicators, setIndicators] = useState<Indicator[]>(["volume"]);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchStockQuote(symbol).then(setQuote);
    const tf = timeframes.find((t) => t.key === timeframe)!;
    fetchChartData(symbol, tf.key, tf.range).then(setCandles);
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;
    drawChart();
  }, [candles, chartType, indicators, fullscreen]);

  function toggleIndicator(ind: Indicator) {
    setIndicators((prev) => prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]);
  }

  function toHeikinAshi(data: CandleData[]): CandleData[] {
    const ha: CandleData[] = [];
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const prevHA = ha[i - 1];
      const close = (c.open + c.high + c.low + c.close) / 4;
      const open = prevHA ? (prevHA.open + prevHA.close) / 2 : (c.open + c.close) / 2;
      ha.push({ time: c.time, open, high: Math.max(c.high, open, close), low: Math.min(c.low, open, close), close, volume: c.volume });
    }
    return ha;
  }


  function drawChart() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    ctx.fillStyle = "#070b10";
    ctx.fillRect(0, 0, W, H);

    const data = chartType === "heikinashi" ? toHeikinAshi(candles) : candles;
    const closes = data.map((c) => c.close);
    const highs = data.map((c) => c.high);
    const lows = data.map((c) => c.low);

    const mainH = indicators.includes("rsi") || indicators.includes("macd") ? H * 0.6 : (indicators.includes("volume") ? H * 0.75 : H * 0.9);
    const padding = { top: 20, bottom: 30, left: 10, right: 60 };

    const allPrices = [...highs, ...lows];
    let minPrice = Math.min(...allPrices);
    let maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;

    const candleW = Math.max(2, (W - padding.left - padding.right) / data.length - 1);
    const barW = candleW * 0.8;

    function priceToY(price: number): number {
      return padding.top + ((maxPrice - price) / (maxPrice - minPrice)) * (mainH - padding.top - padding.bottom);
    }
    function indexToX(i: number): number {
      return padding.left + i * candleW + candleW / 2;
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = padding.top + (i / 4) * (mainH - padding.top - padding.bottom);
      ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(W - padding.right, y); ctx.stroke();
      const price = maxPrice - (i / 4) * (maxPrice - minPrice);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px sans-serif";
      ctx.fillText(price.toFixed(1), W - padding.right + 5, y + 4);
    }


    // Draw candles/bars/line
    if (chartType === "line") {
      ctx.beginPath();
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      data.forEach((c, i) => {
        const x = indexToX(i);
        const y = priceToY(c.close);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      // Fill gradient
      ctx.lineTo(indexToX(data.length - 1), mainH);
      ctx.lineTo(indexToX(0), mainH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padding.top, 0, mainH);
      grad.addColorStop(0, "rgba(52,211,153,0.15)");
      grad.addColorStop(1, "rgba(52,211,153,0)");
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      data.forEach((c, i) => {
        const x = indexToX(i);
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#34d399" : "#f87171";

        if (chartType === "bar") {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, priceToY(c.high));
          ctx.lineTo(x, priceToY(c.low));
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x - barW / 3, priceToY(c.open)); ctx.lineTo(x, priceToY(c.open)); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, priceToY(c.close)); ctx.lineTo(x + barW / 3, priceToY(c.close)); ctx.stroke();
        } else {
          // Candlestick
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, priceToY(c.high));
          ctx.lineTo(x, priceToY(c.low));
          ctx.stroke();
          const bodyTop = priceToY(Math.max(c.open, c.close));
          const bodyH = Math.max(1, priceToY(Math.min(c.open, c.close)) - bodyTop);
          ctx.fillStyle = isGreen ? color : color;
          if (isGreen) {
            ctx.strokeRect(x - barW / 2, bodyTop, barW, bodyH);
          } else {
            ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
          }
        }
      });
    }


    // Overlays - SMA/EMA/Bollinger/VWAP/Supertrend
    if (indicators.includes("sma")) {
      const sma20 = calculateSMA(closes, 20);
      drawOverlay(ctx, sma20, "#f59e0b", indexToX, priceToY);
    }
    if (indicators.includes("ema")) {
      const ema9 = calculateEMA(closes, 9);
      drawOverlay(ctx, ema9, "#8b5cf6", indexToX, priceToY);
    }
    if (indicators.includes("bollinger")) {
      const bb = calculateBollingerBands(closes);
      drawOverlay(ctx, bb.upper, "#60a5fa", indexToX, priceToY);
      drawOverlay(ctx, bb.middle, "#94a3b8", indexToX, priceToY);
      drawOverlay(ctx, bb.lower, "#60a5fa", indexToX, priceToY);
    }
    if (indicators.includes("vwap")) {
      const vwap = calculateVWAP(data);
      drawOverlay(ctx, vwap, "#ec4899", indexToX, priceToY);
    }
    if (indicators.includes("supertrend")) {
      const st = calculateSupertrend(data);
      st.value.forEach((val, i) => {
        if (i === 0) return;
        const color = st.direction[i] === 1 ? "#34d399" : "#f87171";
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(indexToX(i - 1), priceToY(st.value[i - 1]));
        ctx.lineTo(indexToX(i), priceToY(val));
        ctx.stroke();
      });
    }

    // Volume bars
    if (indicators.includes("volume")) {
      const volH = H * 0.15;
      const volTop = mainH + 5;
      const maxVol = Math.max(...data.map((c) => c.volume));
      data.forEach((c, i) => {
        const x = indexToX(i);
        const h = (c.volume / maxVol) * volH;
        ctx.fillStyle = c.close >= c.open ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)";
        ctx.fillRect(x - barW / 2, volTop + volH - h, barW, h);
      });
    }


    // RSI sub-panel
    if (indicators.includes("rsi")) {
      const rsi = calculateRSI(closes);
      const rsiTop = mainH + (indicators.includes("volume") ? H * 0.18 : 10);
      const rsiH = H * 0.18;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.moveTo(padding.left, rsiTop + rsiH * 0.3); ctx.lineTo(W - padding.right, rsiTop + rsiH * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(padding.left, rsiTop + rsiH * 0.7); ctx.lineTo(W - padding.right, rsiTop + rsiH * 0.7); ctx.stroke();
      ctx.fillStyle = "#64748b"; ctx.font = "9px sans-serif";
      ctx.fillText("70", W - padding.right + 5, rsiTop + rsiH * 0.3 + 3);
      ctx.fillText("30", W - padding.right + 5, rsiTop + rsiH * 0.7 + 3);

      ctx.beginPath(); ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 1.5;
      rsi.forEach((val, i) => {
        if (val === null) return;
        const x = indexToX(i);
        const y = rsiTop + ((100 - val) / 100) * rsiH;
        i === 0 || rsi[i - 1] === null ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // MACD sub-panel
    if (indicators.includes("macd")) {
      const { macd, signal, histogram } = calculateMACD(closes);
      const macdTop = mainH + (indicators.includes("volume") ? H * 0.18 : 10) + (indicators.includes("rsi") ? H * 0.2 : 0);
      const macdH = H * 0.18;
      const validH = histogram.filter((v) => v !== null) as number[];
      const maxH = Math.max(...validH.map(Math.abs)) || 1;

      histogram.forEach((val, i) => {
        if (val === null) return;
        const x = indexToX(i);
        const h = (Math.abs(val) / maxH) * (macdH / 2);
        ctx.fillStyle = val >= 0 ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.5)";
        const y = val >= 0 ? macdTop + macdH / 2 - h : macdTop + macdH / 2;
        ctx.fillRect(x - barW / 3, y, barW * 0.6, h);
      });

      ctx.beginPath(); ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1;
      macd.forEach((val, i) => { if (val === null) return; const x = indexToX(i); const y = macdTop + macdH / 2 - (val / maxH) * (macdH / 3); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1;
      signal.forEach((val, i) => { if (val === null) return; const x = indexToX(i); const y = macdTop + macdH / 2 - (val / maxH) * (macdH / 3); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    }
  }

  function drawOverlay(ctx: CanvasRenderingContext2D, values: (number | null)[], color: string, indexToX: (i: number) => number, priceToY: (p: number) => number) {
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    let started = false;
    values.forEach((val, i) => {
      if (val === null) return;
      const x = indexToX(i); const y = priceToY(val);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }


  return (
    <div className={`space-y-3 ${fullscreen ? "fixed inset-0 z-50 bg-[#070b10] p-4 overflow-y-auto" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">{symbol}</h2>
          {quote && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-white">Rs. {quote.price.toLocaleString("en-IN")}</span>
              <span className={`text-sm font-bold ${quote.changePercent >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                {quote.changePercent >= 0 ? "+" : ""}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
        <button onClick={() => setFullscreen(!fullscreen)} className="rounded-xl bg-white/10 p-2 text-slate-400 hover:text-white">
          {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
        </button>
      </div>

      {/* Chart Type */}
      <div className="flex gap-1">
        {(["candle", "line", "bar", "heikinashi"] as ChartType[]).map((t) => (
          <button
            key={t}
            onClick={() => setChartType(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${chartType === t ? "bg-emerald-400 text-slate-950" : "bg-black/30 text-slate-400"}`}
          >
            {t === "heikinashi" ? "Heikin-Ashi" : t}
          </button>
        ))}
      </div>

      {/* Timeframes */}
      <div className="flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${timeframe === tf.key ? "bg-blue-500 text-white" : "bg-black/30 text-slate-400"}`}
          >
            {tf.label}
          </button>
        ))}
      </div>


      {/* Indicators */}
      <div className="flex flex-wrap gap-1">
        {(["sma", "ema", "rsi", "macd", "bollinger", "volume", "supertrend", "vwap"] as Indicator[]).map((ind) => (
          <button
            key={ind}
            onClick={() => toggleIndicator(ind)}
            className={`rounded-lg px-2 py-1 text-xs font-bold uppercase ${indicators.includes(ind) ? "bg-purple-500/30 text-purple-300 border border-purple-400/30" : "bg-black/30 text-slate-500"}`}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* Canvas Chart */}
      <div className={`rounded-2xl border border-white/10 bg-black/30 overflow-hidden ${fullscreen ? "h-[60vh]" : "h-80"}`}>
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ display: "block" }}
        />
      </div>

      {/* Stock Info */}
      {quote && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Open</p>
            <p className="text-sm font-bold text-white">Rs. {quote.open.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">High</p>
            <p className="text-sm font-bold text-white">Rs. {quote.high.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Low</p>
            <p className="text-sm font-bold text-white">Rs. {quote.low.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Prev Close</p>
            <p className="text-sm font-bold text-white">Rs. {quote.prevClose.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">52W High</p>
            <p className="text-sm font-bold text-emerald-300">Rs. {quote.week52High.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">52W Low</p>
            <p className="text-sm font-bold text-red-300">Rs. {quote.week52Low.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Volume</p>
            <p className="text-sm font-bold text-white">{(quote.volume / 100000).toFixed(1)}L</p>
          </div>
          <div className="rounded-xl bg-black/20 p-3">
            <p className="text-xs text-slate-500">Mkt Cap</p>
            <p className="text-sm font-bold text-white">Rs. {quote.marketCap.toLocaleString("en-IN")} Cr</p>
          </div>
        </div>
      )}
    </div>
  );
}
