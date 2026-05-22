import { gunzipSync } from "zlib";

type Exchange = "NSE" | "BSE" | "MCX";

type QuoteType = "EQUITY" | "INDEX" | "OPTION" | "FUTURE" | "OTHER";

interface UpstoxInstrument {
  instrument_key: string;
  trading_symbol: string;
  name?: string;
  instrument_type?: string;
  segment?: string;
  exchange?: string;
  isin?: string;
  exchange_token?: string;
  lot_size?: number;
  tick_size?: number;
  underlying_key?: string;
  underlying_symbol?: string;
  strike_price?: number;
  expiry?: string | number;
}

export interface SearchInstrumentResult {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
  exchDisp: string;
  quoteType: QuoteType;
  industry: string;
  sector: string;
  instrumentKey: string;
  instrumentType: string;
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
  underlyingSymbol?: string;
}

interface SearchDoc {
  symbol: string;
  shortname: string;
  longname: string;
  exchange: string;
  exchDisp: string;
  quoteType: QuoteType;
  industry: string;
  sector: string;
  instrumentKey: string;
  instrumentType: string;
  expiry?: string;
  strike?: number;
  optionType?: "CE" | "PE";
  underlyingSymbol?: string;
  searchBlob: string;
}

const MASTER_URLS: Record<Exchange, string> = {
  NSE: "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz",
  BSE: "https://assets.upstox.com/market-quote/instruments/exchange/BSE.json.gz",
  MCX: "https://assets.upstox.com/market-quote/instruments/exchange/MCX.json.gz",
};

const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

function norm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function uniqTokens(value: string): string[] {
  const parts = norm(value).split(/\s+/).filter(Boolean);
  return [...new Set(parts)];
}

function quoteTypeFromInstrumentType(type: string): QuoteType {
  if (type === "EQ") return "EQUITY";
  if (type === "INDEX") return "INDEX";
  if (type === "CE" || type === "PE") return "OPTION";
  if (type === "FUT") return "FUTURE";
  return "OTHER";
}

function toExpiryDate(expiry?: string | number): Date | null {
  if (!expiry) return null;
  if (typeof expiry === "number") {
    const fromEpoch = expiry > 1e12 ? new Date(expiry) : new Date(expiry * 1000);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }
  const fromText = new Date(`${expiry}T00:00:00Z`);
  if (!Number.isNaN(fromText.getTime())) return fromText;
  const fromDirect = new Date(expiry);
  if (!Number.isNaN(fromDirect.getTime())) return fromDirect;
  return null;
}

function normalizedExpiry(expiry?: string | number): string | undefined {
  const d = toExpiryDate(expiry);
  if (!d) return undefined;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isExpired(expiry?: string | number): boolean {
  const d = toExpiryDate(expiry);
  if (!d) return false;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return d.getTime() < todayUtc;
}

class InstrumentManager {
  private symbolToKey = new Map<string, string>();
  private upperSymbolToSymbol = new Map<string, string>();
  private keyToSymbol = new Map<string, string>();
  private responseKeyToSymbol = new Map<string, string>();
  private optionSymbolMap = new Map<string, string>();

  private searchDocs: SearchDoc[] = [];
  private tokenIndex = new Map<string, number[]>();

  private loaded = false;
  private lastLoadedAt = 0;
  private loading: Promise<void> | null = null;

  async ensureLoaded(): Promise<void> {
    const now = Date.now();
    if (this.loaded && now - this.lastLoadedAt < REFRESH_INTERVAL) return;
    if (this.loading) {
      await this.loading;
      return;
    }
    this.loading = this.loadAll();
    await this.loading;
    this.loading = null;
  }

  getKey(symbol: string): string | undefined {
    const direct = this.symbolToKey.get(symbol);
    if (direct) return direct;
    const canonical = this.upperSymbolToSymbol.get(symbol.toUpperCase());
    if (!canonical) return undefined;
    return this.symbolToKey.get(canonical);
  }

  getSymbol(instrumentKey: string): string | undefined {
    return this.keyToSymbol.get(instrumentKey);
  }

  getSymbolByResponseKey(responseKey: string): string | undefined {
    return this.responseKeyToSymbol.get(responseKey);
  }

  getOptionSymbol(symbol: string): string | undefined {
    const direct = this.optionSymbolMap.get(symbol);
    if (direct) return direct;
    const canonical = this.upperSymbolToSymbol.get(symbol.toUpperCase());
    if (!canonical) return undefined;
    return this.optionSymbolMap.get(canonical);
  }

  has(symbol: string): boolean {
    return Boolean(this.getKey(symbol));
  }

  getAllKeys(): Map<string, string> {
    return new Map(this.symbolToKey);
  }

  search(query: string, limit = 20): SearchInstrumentResult[] {
    const q = query.trim();
    if (!q) return [];

    const qNorm = norm(q);
    const qCompact = compact(q);
    const qTokens = uniqTokens(q);
    const qHasStrike = /\b\d{3,6}(?:\.\d+)?\b/.test(qNorm);
    const qWantsCall = /\bce\b|\bcall\b/.test(qNorm);
    const qWantsPut = /\bpe\b|\bput\b/.test(qNorm);

    const candidates = this.getCandidateIndexes(qTokens, qNorm);
    const scored: Array<{ index: number; score: number }> = [];

    for (const idx of candidates) {
      const doc = this.searchDocs[idx];
      if (!doc) continue;

      let score = 0;
      const symbolNorm = norm(doc.symbol);
      const symbolCompact = compact(doc.symbol);

      if (symbolCompact === qCompact) score += 120;
      else if (symbolCompact.startsWith(qCompact)) score += 90;
      else if (symbolCompact.includes(qCompact)) score += 55;

      if (doc.searchBlob.includes(qNorm)) score += 45;

      if (qTokens.length > 0) {
        const matched = qTokens.filter((t) => doc.searchBlob.includes(t)).length;
        score += matched * 12;
        if (matched === qTokens.length) score += 20;
      }

      if (doc.quoteType === "OPTION") {
        score += 8;
        if (qHasStrike && doc.strike != null && qNorm.includes(String(Math.trunc(doc.strike)))) score += 30;
        if (qWantsCall && doc.optionType === "CE") score += 22;
        if (qWantsPut && doc.optionType === "PE") score += 22;
      }

      if (doc.quoteType === "EQUITY" && !qHasStrike) score += 5;
      if (doc.quoteType === "INDEX") score += 3;

      if (score > 0) scored.push({ index: idx, score });
    }

    scored.sort((a, b) => b.score - a.score);

    const out: SearchInstrumentResult[] = [];
    const seen = new Set<string>();
    for (const { index } of scored) {
      if (out.length >= limit) break;
      const doc = this.searchDocs[index];
      if (!doc || seen.has(doc.instrumentKey)) continue;
      seen.add(doc.instrumentKey);
      out.push({
        symbol: doc.symbol,
        shortname: doc.shortname,
        longname: doc.longname,
        exchange: doc.exchange,
        exchDisp: doc.exchDisp,
        quoteType: doc.quoteType,
        industry: doc.industry,
        sector: doc.sector,
        instrumentKey: doc.instrumentKey,
        instrumentType: doc.instrumentType,
        expiry: doc.expiry,
        strike: doc.strike,
        optionType: doc.optionType,
        underlyingSymbol: doc.underlyingSymbol,
      });
    }

    return out;
  }

  private getCandidateIndexes(tokens: string[], qNorm: string): Set<number> {
    const candidates = new Set<number>();

    for (const token of tokens) {
      const arr = this.tokenIndex.get(token);
      if (!arr) continue;
      for (const idx of arr) candidates.add(idx);
    }

    if (candidates.size === 0) {
      const fallbackToken = qNorm.split(/\s+/)[0];
      if (fallbackToken) {
        const arr = this.tokenIndex.get(fallbackToken);
        if (arr) for (const idx of arr) candidates.add(idx);
      }
    }

    if (candidates.size === 0) {
      const max = Math.min(this.searchDocs.length, 5000);
      for (let i = 0; i < max; i++) candidates.add(i);
    }

    return candidates;
  }

  private async loadAll(): Promise<void> {
    const start = Date.now();
    const exchanges: Exchange[] = ["NSE", "BSE", "MCX"];

    this.symbolToKey.clear();
    this.upperSymbolToSymbol.clear();
    this.keyToSymbol.clear();
    this.responseKeyToSymbol.clear();
    this.optionSymbolMap.clear();
    this.searchDocs = [];
    this.tokenIndex.clear();

    const all: UpstoxInstrument[] = [];
    const loadedExchanges: string[] = [];

    await Promise.all(exchanges.map(async (ex) => {
      try {
        const items = await this.fetchExchange(ex);
        all.push(...items);
        loadedExchanges.push(ex);
      } catch (err) {
        console.warn(`[Instruments] ${ex} master load failed: ${String(err)}`);
      }
    }));

    const underlyingByKey = new Map<string, string>();

    for (const inst of all) {
      const symbol = inst.trading_symbol?.trim();
      const key = inst.instrument_key?.trim();
      if (!symbol || !key) continue;

      const type = (inst.instrument_type ?? "").toUpperCase();
      const quoteType = quoteTypeFromInstrumentType(type);
      const exchange = (inst.exchange ?? key.split("_")[0] ?? "NSE").toUpperCase();
      const segment = key.split("|")[0];
      const displayFromKey = key.includes("|") ? key.split("|")[1] : "";

      if (!this.symbolToKey.has(symbol)) this.symbolToKey.set(symbol, key);
      if (!this.upperSymbolToSymbol.has(symbol.toUpperCase())) this.upperSymbolToSymbol.set(symbol.toUpperCase(), symbol);
      if (!this.keyToSymbol.has(key)) this.keyToSymbol.set(key, symbol);

      this.responseKeyToSymbol.set(`${segment}:${symbol}`, symbol);
      if (displayFromKey && displayFromKey !== symbol) {
        this.responseKeyToSymbol.set(`${segment}:${displayFromKey}`, symbol);
      }

      // Dynamic alias from index display names (e.g. NIFTY 50, NIFTY BANK)
      if (type === "INDEX" && displayFromKey) {
        const alias = displayFromKey.toUpperCase();
        if (!this.symbolToKey.has(alias)) this.symbolToKey.set(alias, key);
        if (!this.upperSymbolToSymbol.has(alias)) this.upperSymbolToSymbol.set(alias, alias);

        // Additional dynamic alias: BANKNIFTY -> BANK NIFTY, FINNIFTY -> FIN NIFTY
        if (/^[A-Z]+NIFTY$/.test(symbol)) {
          const spaced = `${symbol.replace(/NIFTY$/, "")} NIFTY`.trim();
          if (!this.symbolToKey.has(spaced)) this.symbolToKey.set(spaced, key);
          if (!this.upperSymbolToSymbol.has(spaced.toUpperCase())) this.upperSymbolToSymbol.set(spaced.toUpperCase(), spaced);
        }
      }

      if (inst.underlying_key && inst.underlying_symbol) {
        underlyingByKey.set(inst.underlying_key, inst.underlying_symbol);
      }

      const strike = typeof inst.strike_price === "number" ? inst.strike_price : undefined;
      const expiry = normalizedExpiry(inst.expiry);
      const optionType = type === "CE" || type === "PE" ? type : undefined;
      const underlyingSymbol = inst.underlying_symbol;

      if ((type === "CE" || type === "PE" || type === "FUT") && isExpired(expiry)) {
        continue;
      }

      const searchableParts = [
        symbol,
        inst.name ?? "",
        exchange,
        type,
        displayFromKey,
        underlyingSymbol ?? "",
        expiry ?? "",
        strike != null ? String(Math.trunc(strike)) : "",
        optionType ?? "",
      ].filter(Boolean);

      const searchBlob = norm(searchableParts.join(" "));

      const doc: SearchDoc = {
        symbol,
        shortname: inst.name?.trim() || symbol,
        longname: inst.name?.trim() || symbol,
        exchange,
        exchDisp: `${exchange} ${type}`,
        quoteType,
        industry: "",
        sector: "",
        instrumentKey: key,
        instrumentType: type,
        expiry,
        strike,
        optionType,
        underlyingSymbol,
        searchBlob,
      };

      const idx = this.searchDocs.push(doc) - 1;
      for (const token of uniqTokens(searchableParts.join(" "))) {
        const arr = this.tokenIndex.get(token);
        if (arr) arr.push(idx);
        else this.tokenIndex.set(token, [idx]);
      }
    }

    // Build option underlying map for option chain lookups.
    // Map all aliases that point to same underlying key.
    for (const [underlyingKey, underlyingSymbol] of underlyingByKey) {
      const canonical = this.keyToSymbol.get(underlyingKey);
      if (!canonical) continue;

      for (const [aliasSymbol, aliasKey] of this.symbolToKey) {
        if (aliasKey === underlyingKey) {
          this.optionSymbolMap.set(aliasSymbol, underlyingSymbol);
        }
      }
      this.optionSymbolMap.set(canonical, underlyingSymbol);
    }

    this.loaded = true;
    this.lastLoadedAt = Date.now();

    console.log(
      `[Instruments] Loaded ${this.searchDocs.length} contracts from ${loadedExchanges.join(",")} in ${Date.now() - start}ms`,
    );
  }

  private async fetchExchange(exchange: Exchange): Promise<UpstoxInstrument[]> {
    const url = MASTER_URLS[exchange];
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept-Encoding": "gzip" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const rawBuffer = Buffer.from(await resp.arrayBuffer());
    let jsonString = "";
    try {
      jsonString = gunzipSync(rawBuffer).toString("utf-8");
    } catch {
      jsonString = rawBuffer.toString("utf-8");
    }
    return JSON.parse(jsonString) as UpstoxInstrument[];
  }
}

const g = globalThis as unknown as {
  __instrumentManager?: InstrumentManager;
};

export const instrumentManager = (g.__instrumentManager ??= new InstrumentManager());

// Backward-compatible export name for existing imports.
export const instrumentLoader = instrumentManager;
