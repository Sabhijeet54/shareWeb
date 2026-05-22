// ─── SSE Streaming Endpoint ──────────────────────────────────────────────────
// Server-Sent Events stream for live market quotes.
// Replaces the old pattern where frontend polled /api/quote every 3 seconds.
//
// How it works:
//   1. Client opens EventSource('/api/stream?symbols=RELIANCE,TCS,...')
//   2. Server subscribes to the DataPump singleton
//   3. DataPump fetches all symbols every 5s (one NSE call for ALL clients)
//   4. Server pushes updates to client via SSE
//   5. Client disconnects → cleanup
//
// GET /api/stream?symbols=RELIANCE,TCS,NIFTY+50
// Response: text/event-stream
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { dataPump } from "@/lib/dataPump";
import { instrumentManager } from "@/lib/instruments";
import { logEvent } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return new Response("Missing ?symbols= parameter", { status: 400 });
  }

  await instrumentManager.ensureLoaded();
  const validSymbols = symbols.filter((s) => instrumentManager.has(s));
  const invalidSymbols = symbols.filter((s) => !instrumentManager.has(s));
  if (invalidSymbols.length > 0) {
    logEvent("warn", "ws.stream_invalid_symbols", { invalidSymbols, total: symbols.length });
  }
  if (validSymbols.length === 0) {
    return new Response("No valid symbols for streaming", { status: 400 });
  }

  const encoder = new TextEncoder();
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      // SSE comment to confirm connection alive
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Subscribe to the singleton data pump
      dataPump.subscribe(clientId, validSymbols, (data) => {
        try {
          const payload = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed, clean up
          dataPump.unsubscribe(clientId);
        }
      });

      // Clean up when client disconnects (browser closes, tab navigated away)
      req.signal.addEventListener("abort", () => {
        dataPump.unsubscribe(clientId);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      dataPump.unsubscribe(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
