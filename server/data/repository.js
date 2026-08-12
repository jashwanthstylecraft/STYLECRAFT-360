// Resolves each department's {WEEKS, WEEK_ENDINGS, AS_OF, METRICS} — in the
// classic POSITIONAL-array shape aggregate.js/services/charts already
// expect — for a requested date range, from whatever is stored SPARSELY on
// disk (seed or the active uploaded/entered snapshot). This is the ONE
// place department services read data from; uploadService.js/
// entryService.js write snapshots here. Read fresh on every call (not
// cached at require-time) since a snapshot can change while the server is
// running.
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
const fs = require("fs");
const path = require("path");
const sharedRegistry = require("./sharedRegistry");
const { toPositional } = require("./sparseFormat");

const salesSeed = require("./seed/salesSeed");
const inventorySeed = require("./seed/inventorySeed");
const financeSeed = require("./seed/financeSeed");
const operationsSeed = require("./seed/operationsSeed");

const SEED_BY_DEPARTMENT = {
  sales: salesSeed,
  inventory: inventorySeed,
  finance: financeSeed,
  operations: operationsSeed,
};

const UPLOADS_DIR = path.join(__dirname, "uploads");
const ACTIVE_POINTER_FILE = path.join(UPLOADS_DIR, "active.json");
const DEFAULT_WINDOW_WEEKS = 12;

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getActivePointer() {
  return readJson(ACTIVE_POINTER_FILE);
}

function getActiveSnapshot() {
  const pointer = getActivePointer();
  if (!pointer?.file) return null;
  const snapshot = readJson(path.join(UPLOADS_DIR, pointer.file));
  if (!snapshot) return null;
  return { ...snapshot, meta: pointer };
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

// The single latest ISO weekEnding with any real data anywhere across all 4
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
  UPLOADS_DIR,
  ACTIVE_POINTER_FILE,
  SEED_BY_DEPARTMENT,
  getDepartmentData,
  getSparseDepartmentData,
  isUsingSampleData,
  getActiveSnapshot,
  getActiveSnapshotMeta,
  getSeedCatalog,
  getLatestDataWeekEndingAcrossDepartments,
};
