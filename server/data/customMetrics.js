// Admin-added metrics (Settings → Add Graph) — TTL-cached the same way
// repository.js caches the active snapshot, refreshed by the same per-
// request middleware (see app.js). A custom metric is shaped exactly like a
// built-in shared/metricRegistry.mjs entry so sharedRegistry.js can merge
// the two into one list with no special-casing downstream: every consumer
// (Data Entry, department pages, export, detail pages) just sees one more
// registry metric.
const supabase = require("./supabaseClient");

const CACHE_TTL_MS = 3000;

let cached = [];
let cachedAt = 0;
let hasFetchedOnce = false;

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRegistryShape(row) {
  return {
    slug: row.slug,
    name: row.name,
    department: row.department,
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "",
    isCustom: true,
  };
}

async function ensureFreshCustomMetrics() {
  if (hasFetchedOnce && Date.now() - cachedAt < CACHE_TTL_MS) return;
  const { data, error } = await supabase.from("custom_metrics").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to read custom metrics: ${error.message}`);
  cached = (data ?? []).map(toRegistryShape);
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

function getCustomMetrics() {
  return cached;
}

function getCustomMetricsForDepartment(department) {
  return cached.filter((m) => m.department === department);
}

// Generates a slug from the name, disambiguating with a numeric suffix on
// collision (matches an existing custom metric OR a built-in registry slug
// — the caller passes both to check against).
function slugFor(name, isTaken) {
  const base = slugify(name) || "metric";
  if (!isTaken(base)) return base;
  let n = 2;
  while (isTaken(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

async function addCustomMetric({ name, department }, isSlugTaken) {
  const slug = slugFor(name, isSlugTaken);
  const { error } = await supabase.from("custom_metrics").insert({ slug, name, department });
  if (error) throw new Error(`Failed to add metric: ${error.message}`);
  cachedAt = 0; // force the next read to refetch
  return { slug, name, department };
}

async function removeCustomMetric(slug) {
  const { error } = await supabase.from("custom_metrics").delete().eq("slug", slug);
  if (error) throw new Error(`Failed to remove metric: ${error.message}`);
  cachedAt = 0;
}

module.exports = {
  ensureFreshCustomMetrics,
  getCustomMetrics,
  getCustomMetricsForDepartment,
  addCustomMetric,
  removeCustomMetric,
};
