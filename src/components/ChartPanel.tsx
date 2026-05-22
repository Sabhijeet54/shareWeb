"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
  type HistogramData,
} from "lightweight-charts";
import { FiMaximize2, FiMinimize2, FiRefreshCw, FiArrowLeft } from "react-icons/fi";
import { CHART_INTERVALS, getCurrencySign } from "@/lib/symbolMap";
import { useChartData, type OHLCVBar } from "@/lib/useChartData";
import { useLiveSingleQuote } from "@/lib/useLiveQuotes";

// ---- Indicator math ----
function calcSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(data: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (ema === null) {
      ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      ema = data[i] * k + ema * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(closes.length).fill(null);
  if (closes.length < period + 1) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

function calcMACD(closes: number[]): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = closes.map((_, i) => {
    const a = ema12[i], b = ema26[i];
    return a !== null && b !== null ? a - b : null;
  });
  const validMacd = macd.map((v) => v ?? 0);
  const signalArr = calcEMA(validMacd, 9);
  const signal = signalArr.map((v, i) => (macd[i] !== null ? v : null));
  const hist = macd.map((v, i) => {
    const s = signal[i];
    return v !== null && s !== null ? v - s : null;
  });
  return { macd, signal, hist };
}

function calcBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const sma = calcSMA(closes, period);
  const upper: (number | null)[] = [], lower: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (sma[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = sma[i]!;
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }
  return { sma, upper, lower };
}

function calcVWAP(bars: OHLCVBar[]): (number | null)[] {
  let cumVol = 0, cumPV = 0;
  return bars.map((b) => {
    const tp = (b.high + b.low + b.close) / 3;
    cumVol += b.volume;
    cumPV += tp * b.volume;
    return cumVol > 0 ? cumPV / cumVol : null;
  });
}

// Supertrend
function calcSupertrend(bars: OHLCVBar[], period = 10, multiplier = 3) {
  const result: (number | null)[] = Array(bars.length).fill(null);
  const atr: number[] = Array(bars.length).fill(0);
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i - 1].close), Math.abs(bars[i].low - bars[i - 1].close));
    atr[i] = i < period ? tr : (atr[i - 1] * (period - 1) + tr) / period;
  }
  let trend = 1;
  for (let i = period; i < bars.length; i++) {
    const hl2 = (bars[i].high + bars[i].low) / 2;
    const upperBand = hl2 + multiplier * atr[i];
    const lowerBand = hl2 - multiplier * atr[i];
    result[i] = trend === 1 ? lowerBand : upperBand;
  }
  return result;
}

type IndicatorKey = "EMA20" | "EMA50" | "SMA200" | "VWAP" | "BB" | "RSI" | "MACD" | "SUPERTREND";

const INDICATOR_OPTIONS: Array<{ key: IndicatorKey; label: string }> = [
  { key: "EMA20", label: "EMA 20" },
  { key: "EMA50", label: "EMA 50" },
  { key: "SMA200", label: "SMA 200" },
  { key: "VWAP", label: "VWAP" },
  { key: "BB", label: "BB" },
  { key: "RSI", label: "RSI" },
  { key: "MACD", label: "MACD" },
  { key: "SUPERTREND", label: "Supertrend" },
];

type ChartType = "Candlestick" | "Line" | "Bar";

export function ChartPanel({ symbol, onBack }: { symbol: string; onBack?: () => void }) {
  const [interval, setInterval] = useState<(typeof CHART_INTERVALS)[number]>(CHART_INTERVALS[1]);
  const [chartType, setChartType] = useState<ChartType>("Candlestick");
  const [indicators, setIndicators] = useState<Set<IndicatorKey>>(new Set(["EMA20", "EMA50"]));
  const [fullscreen, setFullscreen] = useState(false);

  const { bars, isLoading, isError } = useChartData(symbol, interval.value, interval.range);
  const liveQuote = useLiveSingleQuote(symbol, 3000);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Bar"> | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const extraSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);

  // ---- Initialize main chart ----
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#070b10" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: fullscreen ? window.innerHeight - 240 : 380,
    });
    chartRef.current = chart;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // ---- Draw series whenever bars / chartType / indicators change ----
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || bars.length === 0) return;

    // Remove old series
    extraSeriesRefs.current.forEach((s) => { try { chart.removeSeries(s); } catch { /* ignore */ } });
    extraSeriesRefs.current = [];
    if (mainSeriesRef.current) {
      try { chart.removeSeries(mainSeriesRef.current as ISeriesApi<"Candlestick">); } catch { /* ignore */ }
      mainSeriesRef.current = null;
    }

    const times = bars.map((b) => b.time as Time);
    const closes = bars.map((b) => b.close);

    // Main price series
    if (chartType === "Candlestick") {
      const s = chart.addCandlestickSeries({
        upColor: "#34d399",
        downColor: "#f87171",
        borderUpColor: "#34d399",
        borderDownColor: "#f87171",
        wickUpColor: "#34d399",
        wickDownColor: "#f87171",
      });
      s.setData(bars.map((b) => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })) as CandlestickData[]);
      mainSeriesRef.current = s;
    } else if (chartType === "Line") {
      const s = chart.addLineSeries({ color: "#34d399", lineWidth: 2 });
      s.setData(bars.map((b) => ({ time: b.time as Time, value: b.close })) as LineData[]);
      mainSeriesRef.current = s as unknown as ISeriesApi<"Candlestick">;
    } else {
      const s = chart.addBarSeries({ upColor: "#34d399", downColor: "#f87171" });
      s.setData(bars.map((b) => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })) as CandlestickData[]);
      mainSeriesRef.current = s as unknown as ISeriesApi<"Candlestick">;
    }

    // Volume histogram
    const volSeries = chart.addHistogramSeries({
      color: "rgba(52,211,153,0.3)",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volSeries.setData(bars.map((b) => ({
      time: b.time as Time,
      value: b.volume,
      color: b.close >= b.open ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)",
    })) as HistogramData[]);
    extraSeriesRefs.current.push(volSeries as unknown as ISeriesApi<"Line">);

    // Indicators
    if (indicators.has("EMA20")) {
      const ema20 = calcEMA(closes, 20);
      const s = chart.addLineSeries({ color: "#fb923c", lineWidth: 1, priceScaleId: "right" });
      s.setData(ema20.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(s);
    }
    if (indicators.has("EMA50")) {
      const ema50 = calcEMA(closes, 50);
      const s = chart.addLineSeries({ color: "#818cf8", lineWidth: 1, priceScaleId: "right" });
      s.setData(ema50.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(s);
    }
    if (indicators.has("SMA200")) {
      const sma200 = calcSMA(closes, 200);
      const s = chart.addLineSeries({ color: "#e879f9", lineWidth: 1, priceScaleId: "right" });
      s.setData(sma200.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(s);
    }
    if (indicators.has("VWAP")) {
      const vwap = calcVWAP(bars);
      const s = chart.addLineSeries({ color: "#fbbf24", lineWidth: 1, priceScaleId: "right" });
      s.setData(vwap.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(s);
    }
    if (indicators.has("BB")) {
      const bb = calcBollingerBands(closes);
      const sSMA = chart.addLineSeries({ color: "rgba(148,163,184,0.6)", lineWidth: 1, priceScaleId: "right" });
      const sUp = chart.addLineSeries({ color: "rgba(99,102,241,0.7)", lineWidth: 1, priceScaleId: "right" });
      const sLow = chart.addLineSeries({ color: "rgba(99,102,241,0.7)", lineWidth: 1, priceScaleId: "right" });
      sSMA.setData(bb.sma.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      sUp.setData(bb.upper.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      sLow.setData(bb.lower.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(sSMA, sUp, sLow);
    }
    if (indicators.has("SUPERTREND")) {
      const st = calcSupertrend(bars);
      const s = chart.addLineSeries({ color: "#4ade80", lineWidth: 1, priceScaleId: "right" });
      s.setData(st.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
      extraSeriesRefs.current.push(s);
    }

    chart.timeScale().fitContent();
  }, [bars, chartType, indicators]);

  // ---- RSI sub-chart ----
  useEffect(() => {
    if (!rsiContainerRef.current || bars.length === 0 || !indicators.has("RSI")) return;
    const chart = createChart(rsiContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#070b10" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", scaleMargins: { top: 0.1, bottom: 0.1 } },
      timeScale: { visible: false },
      width: rsiContainerRef.current.clientWidth,
      height: 100,
    });
    rsiChartRef.current = chart;
    const rsiSeries = chart.addLineSeries({ color: "#a78bfa", lineWidth: 1 });
    const ob = chart.addLineSeries({ color: "rgba(248,113,113,0.4)", lineWidth: 1 });
    const os = chart.addLineSeries({ color: "rgba(52,211,153,0.4)", lineWidth: 1 });
    const rsi = calcRSI(bars.map((b) => b.close));
    const times = bars.map((b) => b.time as Time);
    rsiSeries.setData(rsi.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
    ob.setData(times.map((t) => ({ time: t, value: 70 })));
    os.setData(times.map((t) => ({ time: t, value: 30 })));
    chart.timeScale().fitContent();
    const handleResize = () => { if (rsiContainerRef.current) chart.applyOptions({ width: rsiContainerRef.current.clientWidth }); };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [bars, indicators]);

  // ---- MACD sub-chart ----
  useEffect(() => {
    if (!macdContainerRef.current || bars.length === 0 || !indicators.has("MACD")) return;
    const chart = createChart(macdContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "#070b10" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { visible: false },
      width: macdContainerRef.current.clientWidth,
      height: 100,
    });
    macdChartRef.current = chart;
    const { macd, signal, hist } = calcMACD(bars.map((b) => b.close));
    const times = bars.map((b) => b.time as Time);
    const histSeries = chart.addHistogramSeries({ priceScaleId: "right" });
    histSeries.setData(hist.map((v, i) => v !== null ? { time: times[i], value: v, color: v >= 0 ? "rgba(52,211,153,0.7)" : "rgba(248,113,113,0.7)" } : null).filter(Boolean) as HistogramData[]);
    const macdLine = chart.addLineSeries({ color: "#60a5fa", lineWidth: 1 });
    const sigLine = chart.addLineSeries({ color: "#f97316", lineWidth: 1 });
    macdLine.setData(macd.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
    sigLine.setData(signal.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean) as LineData[]);
    chart.timeScale().fitContent();
    const handleResize = () => { if (macdContainerRef.current) chart.applyOptions({ width: macdContainerRef.current.clientWidth }); };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [bars, indicators]);

  function toggleIndicator(key: IndicatorKey) {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

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
            {isLoading && <FiRefreshCw className="animate-spin text-[var(--text-secondary)]" />}
            <button type="button" onClick={() => setFullscreen((f) => !f)} className="rounded-xl bg-[var(--hover-bg)] p-2 text-[var(--text-secondary)]">
              {fullscreen ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          </div>
        </div>

        {/* Chart type */}
        <div className="mb-3 flex gap-2">
          {(["Candlestick", "Line", "Bar"] as ChartType[]).map((t) => (
            <button key={t} type="button" onClick={() => setChartType(t)}
              className={`h-8 rounded-xl px-3 text-xs font-bold ${chartType === t ? "bg-emerald-400 text-slate-950" : "bg-[var(--background)]/80 text-[var(--text-secondary)]"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Timeframes */}
        <div className="mb-3 flex flex-wrap gap-2">
          {CHART_INTERVALS.map((tf) => (
            <button key={tf.label} type="button" onClick={() => setInterval(tf)}
              className={`h-8 rounded-xl px-3 text-xs font-bold ${interval.label === tf.label ? "bg-emerald-400 text-slate-950" : "bg-[var(--background)]/80 text-[var(--text-secondary)]"}`}>
              {tf.label}
            </button>
          ))}
        </div>

        {/* Indicators toggle */}
        <div className="mb-4 flex flex-wrap gap-2">
          {INDICATOR_OPTIONS.map((ind) => (
            <button key={ind.key} type="button" onClick={() => toggleIndicator(ind.key)}
              className={`h-7 rounded-lg px-2 text-[11px] font-bold ${indicators.has(ind.key) ? "bg-indigo-500 text-white" : "bg-[var(--background)]/80 text-[var(--text-muted)]"}`}>
              {ind.label}
            </button>
          ))}
        </div>

        {/* Main chart */}
        {isError ? (
          <div className="flex h-48 items-center justify-center text-sm text-[var(--red)]">
            Failed to load chart. Check connection.
          </div>
        ) : (
          <div ref={containerRef} className="w-full" />
        )}

        {/* RSI sub-chart */}
        {indicators.has("RSI") && bars.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-bold text-[var(--info-label)]">RSI (14)</p>
            <div ref={rsiContainerRef} className="w-full" />
          </div>
        )}

        {/* MACD sub-chart */}
        {indicators.has("MACD") && bars.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-[11px] font-bold text-[var(--info-label)]">MACD (12,26,9)</p>
            <div ref={macdContainerRef} className="w-full" />
          </div>
        )}

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
