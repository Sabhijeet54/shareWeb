// ─── Upstox API Client ───────────────────────────────────────────────────────
// Centralized Axios instance for all Upstox API calls.
// - Reads credentials from environment variables
// - Adds Authorization header automatically
// - Configures base URL, timeout, and retry logic
// - Never exposed to the frontend (server-side only)
//
// Upstox API Docs: https://upstox.com/developer/api-documentation
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

// ── Environment Variables (loaded from .env.local) ──
const UPSTOX_API_KEY    = process.env.UPSTOX_API_KEY ?? "";
const UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET ?? "";
const UPSTOX_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN ?? "";
const UPSTOX_REFRESH_TOKEN = process.env.UPSTOX_REFRESH_TOKEN ?? "";

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

let currentAccessToken = UPSTOX_ACCESS_TOKEN;
let currentRefreshToken = UPSTOX_REFRESH_TOKEN;
let refreshInFlight: Promise<string> | null = null;

function canRefreshToken(): boolean {
  return Boolean(UPSTOX_API_KEY && UPSTOX_API_SECRET && currentRefreshToken);
}

function extractAccessToken(payload: unknown): string | undefined {
  const p = payload as Record<string, unknown> | undefined;
  if (!p) return undefined;
  const direct = p.access_token;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const nested = (p.data as Record<string, unknown> | undefined)?.access_token;
  if (typeof nested === "string" && nested.length > 0) return nested;
  return undefined;
}

function extractRefreshToken(payload: unknown): string | undefined {
  const p = payload as Record<string, unknown> | undefined;
  if (!p) return undefined;
  const direct = p.refresh_token;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const nested = (p.data as Record<string, unknown> | undefined)?.refresh_token;
  if (typeof nested === "string" && nested.length > 0) return nested;
  return undefined;
}

export function getUpstoxAccessToken(): string {
  return currentAccessToken;
}

export async function refreshUpstoxAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  if (!canRefreshToken()) {
    throw new Error("Upstox refresh credentials missing (set UPSTOX_REFRESH_TOKEN, UPSTOX_API_KEY, UPSTOX_API_SECRET)");
  }

  refreshInFlight = (async () => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      client_id: UPSTOX_API_KEY,
      client_secret: UPSTOX_API_SECRET,
    });

    const { data } = await axios.post(
      `${UPSTOX_BASE_URL}/login/authorization/token`,
      body.toString(),
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      },
    );

    const nextAccess = extractAccessToken(data);
    if (!nextAccess) {
      throw new Error("Upstox token refresh succeeded without access_token in response");
    }

    const nextRefresh = extractRefreshToken(data);
    currentAccessToken = nextAccess;
    if (nextRefresh) currentRefreshToken = nextRefresh;

    console.log("[Upstox] Access token refreshed automatically.");
    return currentAccessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

// ── Create reusable Axios instance ──
const upstoxClient: AxiosInstance = axios.create({
  baseURL: UPSTOX_BASE_URL,
  timeout: 10000, // 10s timeout
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ── Request interceptor: inject Authorization header ──
upstoxClient.interceptors.request.use(
  async (config) => {
    // Use the current in-memory token; if missing and refresh creds exist, try to refresh.
    let token = currentAccessToken;
    if (!token && canRefreshToken()) {
      try {
        token = await refreshUpstoxAccessToken();
      } catch {
        // fall through; request may fail with 401 and be handled in response interceptor
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add API key header for endpoints that need it
    if (UPSTOX_API_KEY) {
      config.headers["Api-Key"] = UPSTOX_API_KEY;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: standardize error handling ──
upstoxClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`[Upstox API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status}`, data);

    const originalRequest = error.config as (typeof error.config & { _upstoxRetry?: boolean }) | undefined;

    if (status === 401 && originalRequest && !originalRequest._upstoxRetry) {
      if (canRefreshToken()) {
        try {
          const nextToken = await refreshUpstoxAccessToken();
          originalRequest._upstoxRetry = true;
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${nextToken}`;
          return upstoxClient.request(originalRequest);
        } catch (refreshErr) {
          console.error("[Upstox] Auto-refresh failed:", String(refreshErr));
        }
      }

      console.error("[Upstox] Access token expired/invalid and refresh is unavailable. Update .env.local token values.");
    }
    if (status === 429) {
      console.error("[Upstox] Rate limit exceeded. Backing off.");
    }

    return Promise.reject(error);
  },
);

export default upstoxClient;

// ── Re-export credentials check ──
export function isUpstoxConfigured(): boolean {
  return Boolean(currentAccessToken || canRefreshToken());
}

// ── Dynamic Instrument Key Resolution ────────────────────────────────────────
// All instrument keys are resolved dynamically via the InstrumentLoader.
// ZERO hardcoded ISINs. The loader downloads the Upstox master file at startup.

import { instrumentLoader } from "@/lib/instruments";

/**
 * Resolve app symbol → Upstox instrument key.
 * Uses the dynamic InstrumentLoader (downloads master file at startup).
 * Returns undefined if symbol is not found in master file.
 */
export function toUpstoxKey(symbol: string): string | undefined {
  return instrumentLoader.getKey(symbol);
}

/**
 * Async version — ensures the loader is ready before resolving.
 * Use this for API route handlers where you can await.
 * Returns undefined if symbol not found (instead of generating invalid fallback keys).
 */
export async function resolveUpstoxKey(symbol: string): Promise<string | undefined> {
  await instrumentLoader.ensureLoaded();
  return instrumentLoader.getKey(symbol);
}

/**
 * Resolve Upstox instrument key back to app trading symbol.
 * Used by WebSocket feed handler to map incoming data.
 */
export function fromUpstoxKey(instrumentKey: string): string | undefined {
  return instrumentLoader.getSymbol(instrumentKey);
}

/**
 * Resolve Upstox response key back to app trading symbol.
 * Upstox response keys use ":" separator and trading symbol (not ISIN).
 * e.g. "NSE_EQ:RELIANCE" → "RELIANCE"
 */
export function fromUpstoxResponseKey(responseKey: string): string | undefined {
  return instrumentLoader.getSymbolByResponseKey(responseKey);
}

/**
 * Resolve app symbol → Upstox option underlying symbol.
 * Dynamically built from derivative instruments in master file.
 * e.g. "NIFTY" → "NIFTY", "BANKNIFTY" → "BANKNIFTY"
 * For indices like "NIFTY 50", returns the underlying_symbol from F&O instruments.
 */
export function toUpstoxOptionSymbol(symbol: string): string {
  // Dynamic lookup from master file's derivative instruments
  const optSym = instrumentLoader.getOptionSymbol(symbol);
  if (optSym) return optSym;
  // For equities, the option symbol is the trading symbol itself
  return symbol;
}
