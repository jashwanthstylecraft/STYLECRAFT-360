import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 15000;
const SSE_RECONNECT_MS = 3000;

// SSE-first, polling fallback. Only one transport is ever active at a time —
// a working SSE connection cancels the poll loop, and a dropped/blocked SSE
// connection (proxies, corporate networks) falls back to polling so the
// number never just stops moving.
export function useCounter() {
  const [state, setState] = useState(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let reconnectTimer = null;
    let source = null;

    async function pollOnce() {
      try {
        const res = await fetch("/api/counter");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setState(data);
      } catch {
        // Network hiccup — the next poll or SSE reconnect will catch up.
      }
    }

    function startPolling() {
      if (pollTimer) return;
      setLive(false);
      pollOnce();
      pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      clearInterval(pollTimer);
      pollTimer = null;
    }

    function connectSSE() {
      source = new EventSource("/api/counter/stream");

      source.addEventListener("update", (event) => {
        if (cancelled) return;
        stopPolling();
        setLive(true);
        setState(JSON.parse(event.data));
      });

      source.onerror = () => {
        source.close();
        setLive(false);
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
  }, []);

  return { total: state?.total ?? null, asOf: state?.asOf ?? null, isPlaceholder: state?.isPlaceholder ?? false, live };
}
