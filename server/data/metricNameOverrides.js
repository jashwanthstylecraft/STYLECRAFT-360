// Admin-set display-name overrides (Settings → Rename graphs) — applied on
// top of the merged registry+custom-metric list in sharedRegistry.js, the
// same seam every consumer already goes through, so a rename shows up
// everywhere (Data Entry, department pages, export, detail pages) with no
// special-casing for whether the metric is a built-in registry entry or an
// admin-added custom metric. TTL-cached the same way customMetrics.js is,
// refreshed by the same per-request middleware (see app.js).
const supabase = require("./supabaseClient");

const CACHE_TTL_MS = 3000;

let cached = new Map();
let cachedAt = 0;
let hasFetchedOnce = false;

async function ensureFreshMetricNameOverrides() {
  if (hasFetchedOnce && Date.now() - cachedAt < CACHE_TTL_MS) return;
  const { data, error } = await supabase.from("metric_name_overrides").select("*");
  if (error) throw new Error(`Failed to read metric name overrides: ${error.message}`);
  cached = new Map((data ?? []).map((row) => [row.slug, row.name]));
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

function applyOverride(metric) {
  const name = cached.get(metric.slug);
  return name ? { ...metric, name } : metric;
}

function applyOverrides(metrics) {
  return metrics.map(applyOverride);
}

function hasOverride(slug) {
  return cached.has(slug);
}

async function setMetricNameOverride(slug, name) {
  const { error } = await supabase.from("metric_name_overrides").upsert({ slug, name, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to rename metric: ${error.message}`);
  cachedAt = 0; // force the next read to refetch
}

async function clearMetricNameOverride(slug) {
  const { error } = await supabase.from("metric_name_overrides").delete().eq("slug", slug);
  if (error) throw new Error(`Failed to reset metric name: ${error.message}`);
  cachedAt = 0;
}

module.exports = {
  ensureFreshMetricNameOverrides,
  applyOverride,
  applyOverrides,
  hasOverride,
  setMetricNameOverride,
  clearMetricNameOverride,
};
