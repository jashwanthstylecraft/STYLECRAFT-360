import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAllDataQueries } from "./dataQueryKeys";

const POLL_INTERVAL_MS = 8000;
const SSE_RECONNECT_MS = 3000;

// SSE-first, polling fallback — same transport pattern as useCounter.js.
// Mounted once at the app root. When an upload is applied (or a version is
// restored) anywhere, every open tab's charts re-fetch and animate to the
// new values — no reload, no per-page wiring needed. Polling exists so this
// keeps working on platforms (serverless) where a long-lived SSE connection
// gets killed after a short timeout.
export function useDataUpdatesListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let reconnectTimer = null;
    let source = null;
    let lastTimestamp; // undefined until the first status fetch establishes a baseline

    async function pollOnce() {
      try {
        const res = await fetch("/api/data/status");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const timestamp = data.active?.timestamp ?? null;
        if (lastTimestamp === undefined) {
          lastTimestamp = timestamp;
          return;
        }
        if (timestamp !== lastTimestamp) {
          lastTimestamp = timestamp;
          invalidateAllDataQueries(queryClient);
        }
      } catch {
        // Network hiccup — the next poll or SSE reconnect will catch up.
      }
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    function connectSSE() {
      source = new EventSource("/api/data/stream");

      source.addEventListener("data-updated", (event) => {
        if (cancelled) return;
        stopPolling();
        try {
          lastTimestamp = JSON.parse(event.data)?.timestamp ?? lastTimestamp;
        } catch {
          // Meta wasn't parseable — invalidate anyway; a stale baseline just
          // means a harmless redundant invalidate if polling ever kicks in.
        }
        invalidateAllDataQueries(queryClient);
      });

      source.onerror = () => {
        source.close();
        startPolling();
        reconnectTimer = setTimeout(connectSSE, SSE_RECONNECT_MS);
      };
    }

    pollOnce();
    connectSSE();

    return () => {
      cancelled = true;
      source?.close();
      stopPolling();
      clearTimeout(reconnectTimer);
    };
  }, [queryClient]);
}
