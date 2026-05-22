// ─── Dynamic Upstox Instrument Loader ────────────────────────────────────────
// Downloads the Upstox instruments master file at startup and builds
// dynamic maps for instrument resolution. ZERO hardcoded ISINs or keys.
//
// Maps built:
//   symbolMap:      appSymbol → instrumentKey  ("RELIANCE" → "NSE_EQ|INE002A01018")
//   reverseMap:     instrumentKey → appSymbol   (reverse lookup)
//   responseKeyMap: responseKey → appSymbol     ("NSE_EQ:RELIANCE" → "RELIANCE")
//   optionSymbolMap: appSymbol → underlying     ("NIFTY 50" → "NIFTY")
//
// Architecture:
//   toUpstoxKey("RELIANCE") → InstrumentLoader.resolve("RELIANCE")
//     → (map loaded? return "NSE_EQ|INE002A01018")
//     → (cold? download master, build map, return key)
// ─────────────────────────────────────────────────────────────────────────────

import { gunzipSync } from "zlib";

// ── Types ────────────────────────────────────────────────────────────────────

interface UpstoxInstrument {
  instrument_key: string;
  trading_symbol: string;
  name: string;
  instrument_type: string;
  segment: string;
  exchange: string;
  isin?: string;
  lot_size?: number;
  tick_size?: number;
  exchange_token?: string;
  underlying_key?: string;
  underlying_symbol?: string;
}

// ── Master URLs (Upstox publishes daily) ─────────────────────────────────────

const MASTER_URLS: Record<string, string> = {
  NSE: "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
  BSE: "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
};

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// ── Loader ───────────────────────────────────────────────────────────────────

class InstrumentLoader {
  // appSymbol → instrumentKey (e.g. "RELIANCE" → "NSE_EQ|INE002A01018")
  private symbolMap = new Map<string, string>();
  // instrumentKey → appSymbol (reverse, for WebSocket feeds)
  private reverseMap = new Map<string, string>();
  // Upstox response key → appSymbol (e.g. "NSE_EQ:RELIANCE" → "RELIANCE")
  // Upstox returns "EXCHANGE:TRADING_SYMBOL" in responses, NOT the ISIN key
  private responseKeyMap = new Map<string, string>();
  // name → tradingSymbol (for fuzzy search)
  private nameMap = new Map<string, string>();
  // appSymbol → underlying option symbol (e.g. "NIFTY 50" → "NIFTY")
  // Built dynamically from derivative instruments in master file
  private optionSymbolMap = new Map<string, string>();

  private lastLoadTime = 0;
  private loading: Promise<void> | null = null;
  private loaded = false;

  /** Ensure instruments are loaded. Blocks until ready. */
  async ensureLoaded(): Promise<void> {
    const now = Date.now();
    if (this.loaded && now - this.lastLoadTime < REFRESH_INTERVAL) return;
    if (this.loading) { await this.loading; return; }

    this.loading = this.load();
    await this.loading;
    this.loading = null;
  }

  /** Resolve app symbol → Upstox instrument key. Returns undefined if not found. */
  getKey(symbol: string): string | undefined {
    return this.symbolMap.get(symbol);
  }

  /** Resolve Upstox instrument key → app trading symbol. */
  getSymbol(instrumentKey: string): string | undefined {
    return this.reverseMap.get(instrumentKey);
  }

  /**
   * Resolve Upstox response key → app symbol.
   * Upstox returns keys like "NSE_EQ:RELIANCE" in response,
   * but we send "NSE_EQ|INE002A01018" in request.
   */
  getSymbolByResponseKey(responseKey: string): string | undefined {
    return this.responseKeyMap.get(responseKey);
  }

  /** Get the option underlying symbol (e.g. "NIFTY 50" → "NIFTY") */
  getOptionSymbol(symbol: string): string | undefined {
    return this.optionSymbolMap.get(symbol);
  }

  /** Check if an instrument exists in our map. */
  has(symbol: string): boolean {
    return this.symbolMap.has(symbol);
  }

  /** Get all loaded symbols → keys. */
  getAllKeys(): Map<string, string> {
    return new Map(this.symbolMap);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    console.log("[Instruments] Loading Upstox master files...");
    const start = Date.now();

    try {
      // Load NSE + BSE in parallel
      const [nseData, bseData] = await Promise.allSettled([
        this.fetchExchange("NSE"),
        this.fetchExchange("BSE"),
      ]);

      if (nseData.status === "fulfilled") this.indexInstruments(nseData.value);
      if (bseData.status === "fulfilled") this.indexInstruments(bseData.value);

      // Build app-symbol aliases (e.g. "NIFTY 50" → same key as "NIFTY", "BANK NIFTY" → "BANKNIFTY")
      this.buildAliases();

      this.loaded = true;
      this.lastLoadTime = Date.now();

      const eqCount = [...this.symbolMap.values()].filter(k => k.includes("_EQ|")).length;
      const idxCount = [...this.symbolMap.values()].filter(k => k.includes("_INDEX|")).length;
      console.log(
        `[Instruments] Loaded ${this.symbolMap.size} instruments (${eqCount} EQ, ${idxCount} INDEX) in ${Date.now() - start}ms`,
      );
    } catch (err) {
      console.error("[Instruments] Failed to load:", String(err));
      this.loaded = true;
      this.lastLoadTime = Date.now();
    }
  }

  private async fetchExchange(exchange: string): Promise<UpstoxInstrument[]> {
    const url = MASTER_URLS[exchange];
    if (!url) return [];

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${exchange}`);

    const buffer = Buffer.from(await resp.arrayBuffer());

    // Try gunzip (the file is .json.gz)
    let jsonStr: string;
    try {
      jsonStr = gunzipSync(buffer).toString("utf-8");
    } catch {
      // Maybe it was already decompressed by fetch
      jsonStr = buffer.toString("utf-8");
    }

    return JSON.parse(jsonStr) as UpstoxInstrument[];
  }

  private indexInstruments(instruments: UpstoxInstrument[]): void {
    // Track underlying symbols for building optionSymbolMap
    const underlyingSymbols = new Map<string, string>(); // underlying_key → underlying_symbol

    for (const inst of instruments) {
      const ts = inst.trading_symbol;
      const key = inst.instrument_key;
      if (!ts || !key) continue;

      const type = inst.instrument_type;

      // Index equities (EQ) and indices (INDEX) from master file
      if (type === "EQ" || type === "INDEX") {
        this.symbolMap.set(ts, key);
        this.reverseMap.set(key, ts);

        // Build response key mappings.
        // Upstox response keys use ":" separator, format varies:
        //   Equities: "NSE_EQ:RELIANCE" (uses trading_symbol)
        //   Indices:  "NSE_INDEX:Nifty 50" (uses display name from instrument_key)
        const segment = key.split("|")[0]; // e.g. "NSE_EQ" or "NSE_INDEX"
        const displayName = key.split("|")[1]; // e.g. "INE002A01018" or "Nifty 50"
        if (segment) {
          // Map by trading symbol (works for equities)
          this.responseKeyMap.set(`${segment}:${ts}`, ts);
          // Also map by display name from key (works for indices)
          if (displayName && displayName !== ts) {
            this.responseKeyMap.set(`${segment}:${displayName}`, ts);
          }
        }

        // Also index by name for fuzzy lookup
        if (inst.name) {
          this.nameMap.set(inst.name.toUpperCase(), ts);
        }
      }

      // Collect underlying symbols from derivative instruments for option chain mapping
      if ((type === "CE" || type === "PE" || type === "FUT") && inst.underlying_key && inst.underlying_symbol) {
        underlyingSymbols.set(inst.underlying_key, inst.underlying_symbol);
      }
    }

    // Build optionSymbolMap: app symbol (trading_symbol of underlying) → underlying_symbol
    // e.g. "NIFTY" (trading_symbol for NSE_INDEX|Nifty 50) → "NIFTY" (underlying_symbol from options)
    for (const [underlyingKey, underlyingSym] of underlyingSymbols) {
      // Find the app trading symbol for this underlying key
      const appSymbol = this.reverseMap.get(underlyingKey);
      if (appSymbol) {
        this.optionSymbolMap.set(appSymbol, underlyingSym);
      }
    }
  }

  /**
   * Build aliases so the app can use friendly names like "NIFTY 50", "BANK NIFTY"
   * while the master file uses "NIFTY", "BANKNIFTY" as trading symbols.
   * 
   * This reads the instrument_key's display name to create aliases.
   * e.g. instrument_key "NSE_INDEX|Nifty 50" with trading_symbol "NIFTY"
   *   → alias "NIFTY 50" → same key
   */
  private buildAliases(): void {
    // For INDEX instruments, the instrument_key contains the display name after "|"
    // e.g. "NSE_INDEX|Nifty 50" — extract "Nifty 50" → "NIFTY 50" as alias
    for (const [ts, key] of this.symbolMap) {
      if (!key.includes("_INDEX|")) continue;

      const displayName = key.split("|")[1]; // e.g. "Nifty 50", "Nifty Bank"
      if (!displayName) continue;

      const upperDisplay = displayName.toUpperCase(); // "NIFTY 50"

      // Add alias if different from trading symbol
      if (upperDisplay !== ts && !this.symbolMap.has(upperDisplay)) {
        this.symbolMap.set(upperDisplay, key);
        this.reverseMap.set(key, ts); // Keep reverse pointing to original trading_symbol
        // Response key for alias
        const segment = key.split("|")[0];
        if (segment) {
          this.responseKeyMap.set(`${segment}:${ts}`, ts);
        }
      }
    }

    // Common app aliases that may not match index display names exactly
    // e.g. "BANK NIFTY" → same as "BANKNIFTY" or "NIFTY BANK"
    const aliasPatterns: [string, string[]][] = [
      // [masterTradingSymbol, [...appAliases]]
      ["BANKNIFTY", ["BANK NIFTY"]],
      ["FINNIFTY", ["NIFTY FINSERV", "FIN NIFTY"]],
      ["MIDCPNIFTY", ["MIDCAP NIFTY"]],
    ];

    for (const [masterTs, aliases] of aliasPatterns) {
      const key = this.symbolMap.get(masterTs);
      if (!key) continue;
      for (const alias of aliases) {
        if (!this.symbolMap.has(alias)) {
          this.symbolMap.set(alias, key);
        }
      }
    }
  }
}

// ── Singleton (HMR-safe) ─────────────────────────────────────────────────────
const g = globalThis as unknown as { __instrumentLoader?: InstrumentLoader };
export const instrumentLoader = (g.__instrumentLoader ??= new InstrumentLoader());
