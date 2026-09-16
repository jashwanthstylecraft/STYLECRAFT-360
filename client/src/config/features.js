// Build-time feature flags. Default-on: only an explicit "false" disables a
// feature, so unset env vars (local dev, self-hosted) never silently turn
// something off.
export const ENABLE_EXCEL_EXPORT = import.meta.env.VITE_ENABLE_EXCEL_EXPORT !== "false";

// A real persistent server (local/self-hosted) can hold an SSE connection
// open indefinitely, so useDataUpdatesListener.js/useCounter.js try it
// first and only poll as a fallback. A serverless function (Vercel) can
// NEVER keep one open — it gets killed almost immediately — so those hooks'
// onerror handler just reconnects again 3s later, forever: every open tab
// was opening a brand-new serverless invocation roughly every 3 seconds,
// 24/7, which is real Provisioned Memory (GB-Hrs) for a connection that
// was never going to work. Set VITE_ENABLE_SSE=false in Vercel's project
// env vars to skip the attempt there and go straight to polling-only.
export const ENABLE_SSE = import.meta.env.VITE_ENABLE_SSE !== "false";
