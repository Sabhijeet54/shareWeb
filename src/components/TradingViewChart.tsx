"use client";

import { useEffect, useMemo, useRef } from "react";

declare global {
  interface Window {
    TradingView?: {
      widget: new (options: Record<string, unknown>) => unknown;
    };
    __tvScriptPromise?: Promise<void>;
  }
}

type TradingViewChartProps = {
  symbol: string;
  theme?: "dark" | "light";
  height?: number;
  className?: string;
};

const TV_SCRIPT_SRC = "https://s3.tradingview.com/tv.js";

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.TradingView?.widget) {
    return Promise.resolve();
  }

  if (window.__tvScriptPromise) {
    return window.__tvScriptPromise;
  }

  window.__tvScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TV_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TradingView script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = TV_SCRIPT_SRC;
    script.async = true;
    script.type = "text/javascript";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load TradingView script"));
    document.head.appendChild(script);
  });

  return window.__tvScriptPromise;
}

export function TradingViewChart({
  symbol,
  theme = "dark",
  height = 420,
  className,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const wrapperStyle = useMemo(() => ({ height: `${height}px` }), [height]);

  useEffect(() => {
    let cancelled = false;

    async function initWidget() {
      try {
        await loadTradingViewScript();
        if (cancelled || !containerRef.current || !window.TradingView?.widget) return;

        containerRef.current.innerHTML = "";
        const widgetContainer = document.createElement("div");
        const containerId = `tv-widget-${Math.random().toString(36).slice(2)}`;
        widgetContainer.id = containerId;
        widgetContainer.style.height = "100%";
        widgetContainer.style.width = "100%";
        containerRef.current.appendChild(widgetContainer);

        new window.TradingView.widget({
          container_id: containerId,
          symbol,
          interval: "D",
          timezone: "Asia/Kolkata",
          theme,
          style: "1",
          locale: "en",
          autosize: true,
          withdateranges: true,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          allow_symbol_change: true,
          save_image: true,
          enable_publishing: false,
          studies: [],
        });
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    }

    void initWidget();

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, theme]);

  return (
    <div className={className} style={wrapperStyle}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
