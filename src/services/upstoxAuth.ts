import axios from "axios";

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY ?? "";
const UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET ?? "";
const INITIAL_ACCESS_TOKEN = process.env.UPSTOX_ACCESS_TOKEN ?? "";
const INITIAL_REFRESH_TOKEN = process.env.UPSTOX_REFRESH_TOKEN ?? "";

let activeAccessToken = INITIAL_ACCESS_TOKEN;
let activeRefreshToken = INITIAL_REFRESH_TOKEN;
let refreshInFlight: Promise<string> | null = null;

function hasRefreshCredentials(): boolean {
  return Boolean(UPSTOX_API_KEY && UPSTOX_API_SECRET && activeRefreshToken);
}

function decodeJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(parts[1].length / 4) * 4, "=");

    const json = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as { exp?: number };
    if (typeof json.exp !== "number") return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  if (!token) return true;
  const expMs = decodeJwtExpiryMs(token);
  if (!expMs) return false;

  const now = Date.now();
  const bufferMs = 30_000;
  return now >= expMs - bufferMs;
}

function extractAccessToken(payload: unknown): string | undefined {
  const obj = payload as Record<string, unknown> | undefined;
  if (!obj) return undefined;

  const direct = obj.access_token;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const nested = (obj.data as Record<string, unknown> | undefined)?.access_token;
  if (typeof nested === "string" && nested.length > 0) return nested;

  return undefined;
}

function extractRefreshToken(payload: unknown): string | undefined {
  const obj = payload as Record<string, unknown> | undefined;
  if (!obj) return undefined;

  const direct = obj.refresh_token;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const nested = (obj.data as Record<string, unknown> | undefined)?.refresh_token;
  if (typeof nested === "string" && nested.length > 0) return nested;

  return undefined;
}

export function getCachedAccessToken(): string {
  return activeAccessToken;
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  if (!hasRefreshCredentials()) {
    throw new Error("Upstox refresh credentials missing (set UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_REFRESH_TOKEN)");
  }

  refreshInFlight = (async () => {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: activeRefreshToken,
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
        timeout: 10_000,
      },
    );

    const nextAccess = extractAccessToken(data);
    if (!nextAccess) {
      throw new Error("Upstox refresh response missing access_token");
    }

    const nextRefresh = extractRefreshToken(data);
    activeAccessToken = nextAccess;
    if (nextRefresh) {
      activeRefreshToken = nextRefresh;
    }

    return activeAccessToken;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function getValidAccessToken(): Promise<string> {
  if (activeAccessToken && !isTokenExpired(activeAccessToken)) {
    return activeAccessToken;
  }

  if (hasRefreshCredentials()) {
    return refreshAccessToken();
  }

  if (activeAccessToken) {
    return activeAccessToken;
  }

  throw new Error("Upstox access token unavailable. Set UPSTOX_REFRESH_TOKEN with API credentials for auto refresh.");
}

export function isUpstoxConfigured(): boolean {
  return Boolean(activeAccessToken || hasRefreshCredentials());
}

export function getUpstoxApiKey(): string {
  return UPSTOX_API_KEY;
}
