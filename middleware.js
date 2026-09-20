// Vercel Edge Middleware — runs on Vercel's edge network BEFORE a request
// ever reaches the Node serverless function (api/index.js), so matching
// requests never invoke Fluid Compute at all: zero Provisioned Memory,
// not just a fast one.
//
// /api/data/stream and /api/counter/stream are SSE endpoints that can
// never actually work on serverless (a connection can't be held open) —
// see the matching comments in server/routes/data.js and
// server/routes/counter.js, which already close the connection instantly
// if a request DOES reach them. This is the stronger version of the same
// fix: a browser tab that's been open since before SSE was disabled
// client-side (VITE_ENABLE_SSE=false) keeps retrying these paths every
// few seconds forever, and every retry now gets turned away here, at the
// edge, before costing anything server-side.
export const config = {
  matcher: ["/api/data/stream", "/api/counter/stream"],
};

export default function middleware() {
  return new Response(null, { status: 204 });
}
