type LogLevel = "info" | "warn" | "error";

function safeMeta(meta?: unknown): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  if (typeof meta === "object" && meta !== null) return meta as Record<string, unknown>;
  return { value: meta };
}

export function logEvent(level: LogLevel, event: string, meta?: unknown): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(safeMeta(meta) ?? {}),
  };

  if (level === "error") {
    console.error("[MarketLog]", JSON.stringify(payload));
    return;
  }
  if (level === "warn") {
    console.warn("[MarketLog]", JSON.stringify(payload));
    return;
  }
  console.log("[MarketLog]", JSON.stringify(payload));
}
