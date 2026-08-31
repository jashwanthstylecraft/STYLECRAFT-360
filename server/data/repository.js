// Resolves each department's {WEEKS, WEEK_ENDINGS, AS_OF, METRICS} — in the
// classic POSITIONAL-array shape aggregate.js/services/charts already
// expect — for a requested date range, from whatever the active snapshot
// (or seed) holds. This is the ONE place department services read data
// from; uploadService.js/entryService.js write snapshots here (via
// snapshotService.js).
//
// Storage backend: Supabase (see supabaseClient.js + supabase-schema.sql).
// The active snapshot is kept in a short-TTL (3s) in-memory cache rather
// than fetched on every single call — Supabase's client is async, and this
// module's ~13 downstream consumers (every department service, entryService,
// uploadService, templateService, exportService, detailService,
// homeService, homeInsightsService) all call it SYNCHRONOUSLY. Threading
// async through that whole call graph for a storage-layer swap was judged
// too large/risky; instead, one middleware (see app.js) awaits
// ensureFreshSnapshot() once per request, and everything below keeps
// reading the resulting cache synchronously, unchanged. Worst case a
// request sees data up to 3s stale — bounded, and always correct on a cold
// start (cache starts empty, so the first read is a real fetch) — never
// permanently wrong the way an unbounded in-memory cache would be on a
// serverless platform that can spin up fresh instances at any time.
//
// Storage is sparse (ISO weekEnding -> value) because the real master
// calendar (shared/weekCalendar.mjs) is 231 weeks and almost all of them
// have no data — a 231-slot array of nulls per metric would be wasteful and
// is exactly what the sparse format avoids. The sparse<->positional
// conversion is confined to sparseFormat.js so nothing downstream (services,
// aggregate.js, every chart) had to change for this: they still just see
// "an array of numbers for these weeks."
//
// Seed files, and uploaded/entered snapshots alike, only carry numbers
// (slug + values + goals) — every structural field (chartType,
// goalDirection, format, aggregationMethod, stackKeys/groupKeys,
// headerValues, targetLine, yDomain, description) comes from
// shared/metricRegistry.mjs and is merged in here, on every read.
const sharedRegistry = require("./sharedRegistry");
const { toPositional } = require("./sparseFormat");
const supabase = require("./supabaseClient");

const salesSeed = require("./seed/salesSeed");
const inventorySeed = require("./seed/inventorySeed");
const financeSeed = require("./seed/financeSeed");
const operationsSeed = require("./seed/operationsSeed");
const marketingSeed = require("./seed/marketingSeed");
const customerServiceSeed = require("./seed/customerServiceSeed");

const SEED_BY_DEPARTMENT = {
  sales: salesSeed,
  inventory: inventorySeed,
  finance: financeSeed,
  operations: operationsSeed,
  marketing: marketingSeed,
  "customer-service": customerServiceSeed,
};

const DEFAULT_WINDOW_WEEKS = 12;
const CACHE_TTL_MS = 3000;

// null = "no active snapshot yet" (fresh deployment, falls back to seed
// everywhere below, same as the old file-based "no active.json" case).
let cachedSnapshot = null;
let cachedAt = 0;
let hasFetchedOnce = false;

async function fetchActiveSnapshotFromSupabase() {
  const { data: pointerRow, error: pointerError } = await supabase
    .from("app_state")
    .select("value")
    .eq("key", "active_snapshot")
    .maybeSingle();
  if (pointerError) throw new Error(`Failed to read active snapshot pointer: ${pointerError.message}`);
  const pointer = pointerRow?.value ?? null;
  if (!pointer?.timestamp) return null;

  const { data: snapshotRow, error: snapshotError } = await supabase
    .from("snapshots")
    .select("departments")
    .eq("id", pointer.timestamp)
    .maybeSingle();
  if (snapshotError) throw new Error(`Failed to read snapshot: ${snapshotError.message}`);
  if (!snapshotRow) return null;

  return { departments: snapshotRow.departments, meta: pointer };
}

// Called by app.js's middleware on (almost) every request. A cache hit is a
// synchronous-feeling no-op; a miss/stale cache does one real fetch.
async function ensureFreshSnapshot() {
  if (hasFetchedOnce && Date.now() - cachedAt < CACHE_TTL_MS) return;
  cachedSnapshot = await fetchActiveSnapshotFromSupabase();
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

// Called by snapshotService.js immediately after a successful write, so the
// request that just wrote sees its own write instantly — never waits out
// the TTL to see its own change.
function setCachedSnapshot(snapshot) {
  cachedSnapshot = snapshot;
  cachedAt = Date.now();
  hasFetchedOnce = true;
}

function getActiveSnapshot() {
  return cachedSnapshot;
}

function mergeWithRegistry(metric) {
  const registryEntry = sharedRegistry.getMetric(metric.slug);
  if (!registryEntry) return metric; // unknown slug (e.g. a brand-new upload metric) — numbers only, no structure to merge
  return { ...registryEntry, ...metric };
}

// The raw sparse {METRICS: [{slug, values, goals}]} for a department —
// active snapshot if it covers this department, else seed. Used directly by
// entryService.js/uploadService.js, which read and write sparse data; never
// converted to positional (that only happens for chart-facing reads below).
function getSparseDepartmentData(departmentKey) {
  const snapshot = getActiveSnapshot();
  return snapshot?.departments?.[departmentKey] ?? SEED_BY_DEPARTMENT[departmentKey];
}

const STRAGGLER_TOLERANCE_WEEKS = 4;

function weeksBetween(isoA, isoB) {
  return Math.abs(new Date(`${isoA}T00:00:00Z`) - new Date(`${isoB}T00:00:00Z`)) / (7 * 86400000);
}

// The latest of each metric's own last-reported week, EXCLUDING stragglers
// more than STRAGGLER_TOLERANCE_WEEKS beyond the pack's median — reported
// actuals only (`values`), never `goals` (goals are frequently pre-set weeks
// or months ahead of any real activity).
//
// Plain max is wrong: a metric on a genuinely different, much-longer-ahead
// reporting cadence (e.g. a system-derived figure tracked for months past
// when every manually-reported metric stopped) would single-handedly drag
// "the current view" out to a week where everything else is empty.
//
// Plain median is ALSO wrong, for the opposite reason: mid-week Data Entry
// naturally updates one metric at a time, so a just-saved current week
// looks statistically identical to a straggler until enough OTHER metrics
// catch up — which could take days, during which the new week silently
// never appears on any dashboard.
//
// Trimming outliers relative to the median gets both right: a save that's
// a week or two ahead of the pack (normal, expected, ongoing entry) still
// wins as the anchor; a metric that's months ahead on an unrelated cadence
// (Phase 6's real case) still gets excluded.
function latestDataWeekEnding(sparseSource) {
  const lastPerMetric = sparseSource.METRICS.map((metric) => {
    const keys = Object.keys(metric.values ?? {});
    return keys.length ? keys.sort().at(-1) : null;
  }).filter(Boolean);
  if (lastPerMetric.length === 0) return null;

  const sorted = lastPerMetric.sort();
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const withinTolerance = sorted.filter((iso) => weeksBetween(iso, median) <= STRAGGLER_TOLERANCE_WEEKS);
  return withinTolerance.at(-1) ?? median;
}

// No explicit range requested: the last DEFAULT_WINDOW_WEEKS calendar weeks
// ending at the latest week with any real data (falling back to "today's"
// current week if there's no data anywhere yet).
function defaultRange(sparseSource) {
  const allWeeks = sharedRegistry.generateWeeks();
  const latest = latestDataWeekEnding(sparseSource) ?? sharedRegistry.currentWeek(new Date());
  const endIndex = Math.max(0, allWeeks.findIndex((w) => w.weekEnding === latest));
  const startIndex = Math.max(0, endIndex - (DEFAULT_WINDOW_WEEKS - 1));
  return allWeeks.slice(startIndex, endIndex + 1);
}

function resolveRange(sparseSource, { from, to } = {}) {
  if (from && to) return sharedRegistry.generateWeeks(from, to);
  return defaultRange(sparseSource);
}

// A label like "Jul-31" is ambiguous once the calendar spans multiple
// years; the year suffix ("Jul-31-26") only earns its place on the axis
// when the resolved window actually crosses a year boundary.
function smartLabels(weeks) {
  const years = new Set(weeks.map((w) => w.year));
  if (years.size <= 1) {
    return weeks.map((w) => w.label.split("-").slice(0, 2).join("-"));
  }
  return weeks.map((w) => w.label);
}

function toPositionalDepartment(sparseSource, weeks) {
  const weekEndings = weeks.map((w) => w.weekEnding);
  const METRICS = sparseSource.METRICS.map((m) => mergeWithRegistry(toPositional(m, weekEndings)));
  return {
    WEEKS: smartLabels(weeks),
    WEEK_ENDINGS: weekEndings,
    AS_OF: weekEndings[weekEndings.length - 1] ?? null,
    METRICS,
  };
}

function getDepartmentData(departmentKey, options = {}) {
  const sparseSource = getSparseDepartmentData(departmentKey);
  const weeks = resolveRange(sparseSource, options);
  return toPositionalDepartment(sparseSource, weeks);
}

function isUsingSampleData() {
  return !getActiveSnapshot();
}

// The single latest ISO weekEnding with any real data anywhere across all
// departments — the anchor date-range presets (Last 26 weeks, YTD, etc.)
// are computed from. Shared with entryService.js's default-week logic so
// there's one definition of "latest data" in the app, not two.
function getLatestDataWeekEndingAcrossDepartments() {
  let latest = null;
  for (const departmentKey of Object.keys(SEED_BY_DEPARTMENT)) {
    const l = latestDataWeekEnding(getSparseDepartmentData(departmentKey));
    if (l && (!latest || l > latest)) latest = l;
  }
  return latest;
}

function getActiveSnapshotMeta() {
  return getActiveSnapshot()?.meta ?? null;
}

// The seed's own data (never the active snapshot) in the same positional
// shape — used as a structural/numeric fallback when an upload doesn't
// touch a given metric.
function getSeedCatalog(departmentKey, options = {}) {
  const seedSource = SEED_BY_DEPARTMENT[departmentKey];
  const weeks = resolveRange(seedSource, options);
  return toPositionalDepartment(seedSource, weeks);
}

module.exports = {
  SEED_BY_DEPARTMENT,
  getDepartmentData,
  getSparseDepartmentData,
  isUsingSampleData,
  getActiveSnapshot,
  getActiveSnapshotMeta,
  getSeedCatalog,
  getLatestDataWeekEndingAcrossDepartments,
  ensureFreshSnapshot,
  setCachedSnapshot,
};
