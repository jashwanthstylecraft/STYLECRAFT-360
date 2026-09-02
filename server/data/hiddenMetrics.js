// Admin-removed graphs (Settings → Rename graphs → Delete, for a built-in
// metric). Hiding a metric never touches its historical values/goals — it
// only excludes the slug from sharedRegistry.js's getters (the same seam
// name overrides and custom metrics go through), so a hidden metric
// disappears from every consumer with no special-casing, and reappears with
// full history intact if unhidden. TTL-cached the same way customMetrics.js
// is, refreshed by the same per-request middleware (see app.js).
const supabase = require("./supabaseClient");

const CACHE_TTL_MS = 3000;

let cached = new Set();
let cachedAt = 0;
let hasFetchedOnce = false;

async function ensureFreshHiddenMetrics() {
  if (hasFetchedOnce && Date.now() - cachedAt < CACHE_TTL_MS) return;
  const { data, error } = await supabase.from("hidden_metrics").select("slug");
  if (error) throw new Error(`Failed to read hidden metrics: ${error.message}`);
  cached = new Set((data ?? []).map((row) => row.slug));
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

function isHidden(slug) {
  return cached.has(slug);
}

async function hideMetric(slug) {
  const { error } = await supabase.from("hidden_metrics").upsert({ slug, hidden_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to remove metric: ${error.message}`);
  cachedAt = 0; // force the next read to refetch
}

async function unhideMetric(slug) {
  const { error } = await supabase.from("hidden_metrics").delete().eq("slug", slug);
  if (error) throw new Error(`Failed to restore metric: ${error.message}`);
  cachedAt = 0;
}

module.exports = {
  ensureFreshHiddenMetrics,
  isHidden,
  hideMetric,
  unhideMetric,
};
