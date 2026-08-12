// Converts between sparse storage ({ values: {isoDate: v}, goals: {isoDate:
// v} }, keyed by weekEnding ISO date — what's actually written to disk) and
// the positional-array shape ({ series: [...], goalSeries: [...] }) that
// aggregate.js, the department services, and every chart component already
// expect for a given list of weeks. Confining the sparse/positional
// conversion to this one module means none of that downstream code had to
// change for Phase 5 — it still just sees "an array of numbers for these
// weeks," never knowing whether the underlying week list is 10 or 231 long.
//
// A missing key means "no data that week" — converts to `null`, never `0`.
function toPositional(sparseMetric, weekEndings) {
  const series = weekEndings.map((iso) => sparseMetric.values?.[iso] ?? null);
  const goalSeries = sparseMetric.goals
    ? weekEndings.map((iso) => (Object.prototype.hasOwnProperty.call(sparseMetric.goals, iso) ? sparseMetric.goals[iso] : null))
    : undefined;
  const goal = goalSeries ? lastNonNull(goalSeries) : null;

  const { values, goals, ...structural } = sparseMetric;
  return { ...structural, series, goalSeries, goal };
}

function lastNonNull(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null && arr[i] !== undefined) return arr[i];
  }
  return null;
}

// A multi-series point (stacked/grouped metric) counts as "no data" if every
// sub-series is null/undefined — a positional array always carries an object
// at each index (built from a fixed set of series keys), so a genuinely
// blank week looks like `{requested: null, completed: null}`, not `null`
// itself. Without this check that object would get stored as if it were
// real data, permanently turning "no data reported" into a phantom entry.
function isEmptyPoint(v) {
  if (v === null || v === undefined) return true;
  if (typeof v !== "object") return false;
  return Object.values(v).every((x) => x === null || x === undefined);
}

// The same "missing key, not a null value" rule applies WITHIN a partially-
// reported point too — e.g. a metric whose two series started being tracked
// on different dates can have a real early week like {backorder: 0} with no
// `preorder` key at all yet. A positional array can't represent "this one
// sub-series wasn't reported" any way other than null, so toSparse must
// strip those nulls back out rather than writing them as if they were real
// (round-tripping such a week through export/re-import would otherwise turn
// "not yet tracked" into a phantom explicit null forever).
function stripNullSubKeys(v) {
  if (v === null || v === undefined || typeof v !== "object") return v;
  const cleaned = {};
  for (const [key, value] of Object.entries(v)) {
    if (value !== null && value !== undefined) cleaned[key] = value;
  }
  return cleaned;
}

// The inverse — given a positional metric and the weekEnding each array
// index corresponds to, builds the sparse map (skipping null/missing
// positions, since those aren't "data," they're absence of data).
function toSparse(positionalMetric, weekEndings) {
  const values = {};
  const goals = {};

  weekEndings.forEach((iso, i) => {
    const v = positionalMetric.series?.[i];
    if (!isEmptyPoint(v)) values[iso] = stripNullSubKeys(v);
    const g = positionalMetric.goalSeries?.[i];
    if (g !== null && g !== undefined) goals[iso] = g;
  });

  const { series, goalSeries, goal, ...structural } = positionalMetric;
  return { ...structural, values, ...(Object.keys(goals).length ? { goals } : {}) };
}

// Every weekEnding key present across a sparse metric's values/goals — used
// to find "the latest week with any data" for default range resolution and
// for coverage counts.
function sparseMetricWeeks(sparseMetric) {
  const keys = new Set([...Object.keys(sparseMetric.values ?? {}), ...Object.keys(sparseMetric.goals ?? {})]);
  return [...keys];
}

module.exports = { toPositional, toSparse, sparseMetricWeeks };
