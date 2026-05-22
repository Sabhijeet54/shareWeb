// ─── Server-Side Data Pump (Upstox WebSocket v3 + REST) ──────────────────────
// Centralized pump that streams live market data via Upstox WebSocket v3.
// Falls back to REST polling if WebSocket is unavailable.
//
// Architecture:
//   SSE clients → subscribe(symbols, callback)
//   DataPump    → Upstox WebSocket v3 → broadcast to all SSE clients
//                 (REST fallback every 5s if WS not connected yet)
//
// HMR-safe: uses globalThis so the singleton survives hot-module reload.
// ─────────────────────────────────────────────────────────────────────────────

import { getQuotes, type NormalizedQuote } from "@/services/market";
import {
  resolveUpstoxKey,
  fromUpstoxKey,
  fromUpstoxResponseKey,
  getUpstoxAccessToken,
  refreshUpstoxAccessToken,
} from "@/lib/upstox";
import { instrumentLoader } from "@/lib/instruments";

const REST_INTERVAL = 5_000; // REST poll interval

type Callback = (data: Record<string, NormalizedQuote>) => void;

interface Client {
  symbols: Set<string>;
  callback: Callback;
}

class DataPump {
  private clients = new Map<string, Client>();
  private latestData = new Map<string, NormalizedQuote>();

  // WebSocket state
  private ws: WebSocket | null = null;
  private wsConnecting = false;
  private wsConnected = false;
  private wsGaveUp = false; // true if WS failed permanently — don't retry
  private subscribedKeys = new Set<string>();

  // REST polling
  private restTimer: ReturnType<typeof setInterval> | null = null;
  private pumping = false;

  // Reverse map: Upstox key → app symbol
  private keyToSymbol = new Map<string, string>();

  /** Register an SSE client. */
  subscribe(id: string, symbols: string[], callback: Callback): void {
    this.clients.set(id, { symbols: new Set(symbols), callback });

    // Send cached data immediately
    const immediate: Record<string, NormalizedQuote> = {};
    for (const sym of symbols) {
      const cached = this.latestData.get(sym);
      if (cached) immediate[sym] = cached;
    }
    if (Object.keys(immediate).length > 0) {
      try { callback(immediate); } catch { /* closed */ }
    }

    // Build reverse mapping async, then start streaming
    this.buildReverseMap(symbols).then(() => this.ensureStreaming());
  }

  /** Build reverse mapping for symbols (async because key resolution is async). */
  private async buildReverseMap(symbols: string[]): Promise<void> {
    await instrumentLoader.ensureLoaded();
    for (const sym of symbols) {
      const key = await resolveUpstoxKey(sym);
      if (key) this.keyToSymbol.set(key, sym);
    }
  }

  /** Remove an SSE client. */
  unsubscribe(id: string): void {
    this.clients.delete(id);
    if (this.clients.size === 0) {
      this.stopAll();
      console.log("[DataPump] All clients disconnected — stopped.");
    }
  }

  get clientCount(): number {
    return this.clients.size;
  }

  // ── Streaming Logic ────────────────────────────────────────────────────────

  private ensureStreaming(): void {
    // Always start REST polling to get data immediately
    if (!this.restTimer) {
      console.log("[DataPump] Starting REST polling (5s interval).");
      this.restPump(); // immediate first fetch
      this.restTimer = setInterval(() => this.restPump(), REST_INTERVAL);
    }

    // Try WebSocket for real-time (if not already given up)
    if (!this.wsGaveUp && !this.wsConnected && !this.wsConnecting) {
      this.connectWebSocket().catch(() => {});
    } else if (this.wsConnected) {
      this.updateWsSubscriptions().catch(() => {});
    }
  }

  private stopAll(): void {
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.wsConnected = false;
    this.wsConnecting = false;
    this.subscribedKeys.clear();

    if (this.restTimer) {
      clearInterval(this.restTimer);
      this.restTimer = null;
    }
  }

  // ── Upstox WebSocket v3 ───────────────────────────────────────────────────

  private async connectWebSocket(): Promise<void> {
    if (this.wsConnecting) return;
    this.wsConnecting = true;

    try {
      let accessToken = getUpstoxAccessToken();
      if (!accessToken) {
        try {
          accessToken = await refreshUpstoxAccessToken();
        } catch {
          console.warn("[DataPump] No usable Upstox access token for WebSocket.");
          this.wsConnecting = false;
          this.wsGaveUp = true;
          return;
        }
      }

      // v3 endpoint: GET /v3/feed/market-data-feed → 302 redirect to wss://
      // We need to follow the redirect to get the WebSocket URL
      let resp = await fetch("https://api.upstox.com/v3/feed/market-data-feed", {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        redirect: "manual", // Don't follow redirect — we need the Location header
      });

      // Retry once with refreshed token if access token expired
      if (resp.status === 401) {
        try {
          accessToken = await refreshUpstoxAccessToken();
          resp = await fetch("https://api.upstox.com/v3/feed/market-data-feed", {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            redirect: "manual",
          });
        } catch {
          // keep original response path below
        }
      }

      let wsUrl: string | null = null;

      if (resp.status === 302 || resp.status === 301) {
        // v3 returns 302 redirect to wss:// URL
        wsUrl = resp.headers.get("location");
      } else if (resp.ok) {
        // Fallback: maybe they return JSON with the URL
        const json = await resp.json();
        wsUrl = json?.data?.authorizedRedirectUri;
      } else {
        const body = await resp.text().catch(() => "");
        console.warn(`[DataPump] WebSocket auth failed: HTTP ${resp.status}`, body.substring(0, 200));
        this.wsConnecting = false;
        this.wsGaveUp = true; // Don't keep retrying — REST is working
        return;
      }

      if (!wsUrl) {
        console.warn("[DataPump] No WebSocket URL received — using REST only");
        this.wsConnecting = false;
        this.wsGaveUp = true;
        return;
      }

      console.log("[DataPump] WebSocket v3 URL obtained, connecting...");

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[DataPump] Upstox WebSocket v3 connected ✓");
        this.ws = ws;
        this.wsConnected = true;
        this.wsConnecting = false;
        this.updateWsSubscriptions();

        // Once WS is delivering data, stop REST polling (wait 15s to confirm)
        setTimeout(() => {
          if (this.wsConnected && this.restTimer) {
            clearInterval(this.restTimer);
            this.restTimer = null;
            console.log("[DataPump] REST polling stopped — WebSocket active");
          }
        }, 15_000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(typeof event.data === "string" ? event.data : "{}");
          this.handleWsMessage(msg);
        } catch {
          // binary protobuf or parse error - ignore
        }
      };

      ws.onerror = () => {
        console.warn("[DataPump] WebSocket error — REST is still active");
      };

      ws.onclose = () => {
        console.log("[DataPump] WebSocket closed");
        this.ws = null;
        this.wsConnected = false;
        this.wsConnecting = false;
        this.subscribedKeys.clear();

        // Restart REST polling
        if (this.clients.size > 0 && !this.restTimer) {
          this.restTimer = setInterval(() => this.restPump(), REST_INTERVAL);
          console.log("[DataPump] REST polling resumed");
        }

        // Try reconnecting after 10s (if not given up)
        if (this.clients.size > 0 && !this.wsGaveUp) {
          setTimeout(() => {
            if (this.clients.size > 0 && !this.wsConnected) {
              this.connectWebSocket().catch(() => {});
            }
          }, 10_000);
        }
      };
    } catch (err) {
      console.warn("[DataPump] WebSocket setup error:", String(err));
      this.wsConnecting = false;
      // Don't give up — might be a transient network error
    }
  }

  private async updateWsSubscriptions(): Promise<void> {
    if (!this.ws || !this.wsConnected) return;

    // Ensure loader is ready
    await instrumentLoader.ensureLoaded();

    // Collect all instrument keys
    const allSymbols = new Set<string>();
    for (const client of this.clients.values()) {
      for (const sym of client.symbols) allSymbols.add(sym);
    }

    const newKeys: string[] = [];
    for (const sym of allSymbols) {
      const key = await resolveUpstoxKey(sym);
      if (!key) continue;
      this.keyToSymbol.set(key, sym);
      if (!this.subscribedKeys.has(key)) {
        newKeys.push(key);
        this.subscribedKeys.add(key);
      }
    }

    if (newKeys.length === 0) return;

    // Upstox WebSocket subscribe message
    const subscribeMsg = JSON.stringify({
      guid: "datapump",
      method: "sub",
      data: {
        mode: "full",
        instrumentKeys: newKeys,
      },
    });

    try {
      this.ws.send(subscribeMsg);
      console.log(`[DataPump] Subscribed to ${newKeys.length} instruments via WebSocket`);
    } catch (err) {
      console.warn("[DataPump] WebSocket subscribe error:", String(err));
    }
  }

  private handleWsMessage(msg: Record<string, unknown>): void {
    // Upstox WebSocket sends feeds in `feeds` object
    const feeds = msg.feeds as Record<string, Record<string, unknown>> | undefined;
    if (!feeds) return;

    const updatedQuotes: Record<string, NormalizedQuote> = {};

    for (const [instrumentKey, feedData] of Object.entries(feeds)) {
      // Upstox WS may use ":" or "|" as separator — normalize
      const normalizedKey = instrumentKey.replace(":", "|");
      const appSymbol = this.keyToSymbol.get(normalizedKey)
        ?? this.keyToSymbol.get(instrumentKey)
        ?? fromUpstoxResponseKey(instrumentKey) // response key uses ":" + trading symbol
        ?? fromUpstoxKey(normalizedKey);
      if (!appSymbol) continue;

      // Extract market data from feed (full mode)
      const ff = (feedData as Record<string, unknown>).ff as Record<string, unknown> | undefined;
      const ltpc = (feedData as Record<string, unknown>).ltpc as Record<string, unknown> | undefined;
      const marketFF = ff?.marketFF as Record<string, unknown> | undefined;

      let ltp = 0, open = 0, high = 0, low = 0, close = 0, volume = 0;
      let weekHigh52 = 0, weekLow52 = 0;

      if (marketFF) {
        // Full feed mode
        const ltpc2 = marketFF.ltpc as Record<string, number> | undefined;
        const ohlc = marketFF.marketOHLC as Record<string, unknown> | undefined;
        const ohlcArr = ohlc?.ohlc as Array<Record<string, number>> | undefined;

        ltp = ltpc2?.ltp ?? 0;
        close = ltpc2?.cp ?? 0;

        // Day's OHLC is typically the first element with interval "1d"
        if (ohlcArr && ohlcArr.length > 0) {
          const day = ohlcArr.find((o) => (o as unknown as { interval: string }).interval === "1d") ?? ohlcArr[0];
          open = day.open ?? 0;
          high = day.high ?? 0;
          low = day.low ?? 0;
          volume = day.volume ?? 0;
        }

        weekHigh52 = (marketFF as Record<string, number>).wk52h ?? 0;
        weekLow52 = (marketFF as Record<string, number>).wk52l ?? 0;
      } else if (ltpc) {
        // LTPC mode (lighter)
        ltp = (ltpc as Record<string, number>).ltp ?? 0;
        close = (ltpc as Record<string, number>).cp ?? 0;
      }

      if (ltp <= 0) continue;

      const change = parseFloat((ltp - close).toFixed(2));
      const changePct = close > 0 ? parseFloat(((change / close) * 100).toFixed(2)) : 0;

      const existing = this.latestData.get(appSymbol);

      const quote: NormalizedQuote = {
        symbol: appSymbol,
        shortName: existing?.shortName ?? appSymbol,
        regularMarketPrice: ltp,
        regularMarketChange: change,
        regularMarketChangePercent: changePct,
        regularMarketVolume: volume || existing?.regularMarketVolume || 0,
        regularMarketDayHigh: high || existing?.regularMarketDayHigh || ltp,
        regularMarketDayLow: low || existing?.regularMarketDayLow || ltp,
        regularMarketOpen: open || existing?.regularMarketOpen || ltp,
        regularMarketPreviousClose: close || existing?.regularMarketPreviousClose || 0,
        fiftyTwoWeekHigh: weekHigh52 || existing?.fiftyTwoWeekHigh || 0,
        fiftyTwoWeekLow: weekLow52 || existing?.fiftyTwoWeekLow || 0,
        marketCap: existing?.marketCap || 0,
        trailingPE: existing?.trailingPE || 0,
        epsTrailingTwelveMonths: existing?.epsTrailingTwelveMonths || 0,
      };

      this.latestData.set(appSymbol, quote);
      updatedQuotes[appSymbol] = quote;
    }

    if (Object.keys(updatedQuotes).length > 0) {
      this.broadcastToClients(updatedQuotes);
    }
  }

  // ── REST Fallback ──────────────────────────────────────────────────────────

  private async restPump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;

    try {
      const allSymbols = new Set<string>();
      for (const client of this.clients.values()) {
        for (const sym of client.symbols) allSymbols.add(sym);
      }
      if (allSymbols.size === 0) return;

      const quotes = await getQuotes([...allSymbols]);

      const bySymbol: Record<string, NormalizedQuote> = {};
      for (const q of quotes) {
        this.latestData.set(q.symbol, q);
        bySymbol[q.symbol] = q;
      }

      this.broadcastToClients(bySymbol);
    } catch (err) {
      console.error("[DataPump] REST pump error:", String(err));
    } finally {
      this.pumping = false;
    }
  }

  // ── Broadcast ──────────────────────────────────────────────────────────────

  private broadcastToClients(data: Record<string, NormalizedQuote>): void {
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      const payload: Record<string, NormalizedQuote> = {};
      for (const sym of client.symbols) {
        const q = data[sym] ?? this.latestData.get(sym);
        if (q) payload[sym] = q;
      }
      if (Object.keys(payload).length === 0) continue;

      try {
        client.callback(payload);
      } catch {
        deadClients.push(clientId);
      }
    }

    for (const id of deadClients) {
      this.clients.delete(id);
    }
  }
}

// ── Singleton (survives Next.js HMR in dev mode) ─────────────────────────────
const g = globalThis as unknown as { __dataPump?: DataPump };
export const dataPump = (g.__dataPump ??= new DataPump());
