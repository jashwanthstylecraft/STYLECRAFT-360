// Read-only scan for the two data-corruption patterns this project has hit
// by hand this year: a metric quietly flatlining (SKU Avail % has sat at
// exactly 91.0% for 2+ months, still unconfirmed either way) and a value
// silently duplicating its own goal (the Open Factory P.O.s unpaid-figure
// bug). Never writes anything — this only surfaces candidates for a human
// to look at; nothing here changes what the dashboard shows.
const sharedRegistry = require("../data/sharedRegistry");
const repository = require("../data/repository");

// How many of the MOST RECENT real (non-blank) weeks must share the exact
// same number before it's worth a human's attention. 3 is deliberately low
// — this is a review list, not an auto-applied rule, so a false positive
// just costs someone a glance.
const FLATLINE_MIN_RUN = 3;

// weekEnding-sorted {weekEnding, value} pairs for one series, real data
// only — a missing week (no key at all) breaks the run rather than
// counting as "still flat," since sparse storage's own invariant is that a
// missing key means "not reported," not "same as last time."
function seriesPoints(sparseMetric, key) {
  const weeks = Object.keys(sparseMetric.values ?? {}).sort();
  return weeks
    .map((weekEnding) => ({ weekEnding, value: key ? sparseMetric.values[weekEnding]?.[key] : sparseMetric.values[weekEnding] }))
    .filter((p) => p.value !== null && p.value !== undefined);
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
function isConsecutiveWeek(earlierISO, laterISO) {
  return new Date(`${laterISO}T00:00:00Z`) - new Date(`${earlierISO}T00:00:00Z`) === ONE_WEEK_MS;
}

// Counts backward from the newest entered week only — an old flat streak
// that's since moved on is no longer actionable, so this only reports
// "still flat as of the latest data," not "was flat at some point." Also
// requires actual calendar adjacency between the two weeks being compared,
// not just adjacency in the gap-filtered points list — three same-valued
// weeks with a real reporting gap in between are three separate, unrelated
// coincidences, not one three-week streak.
function trailingFlatlineRun(points) {
  if (points.length < FLATLINE_MIN_RUN) return 0;
  let run = 1;
  for (let i = points.length - 2; i >= 0; i--) {
    const next = points[i + 1];
    if (points[i].value === next.value && isConsecutiveWeek(points[i].weekEnding, next.weekEnding)) run++;
    else break;
  }
  return run;
}

function labelFor(registryMetric, seriesKeys, key) {
  if (!key) return registryMetric.name;
  const i = seriesKeys.indexOf(key);
  const subLabel = registryMetric.headerValues?.[i]?.label ?? key;
  return `${registryMetric.name} — ${subLabel}`;
}

// Some multi-series metrics (In-Stock %, Shipping Time, Education Events)
// carry NO top-level `format` at all — only a per-sub-series one in
// headerValues (e.g. In-Stock %'s "SKU Avail %" is "percent", not
// whatever the metric-level fallback would guess). Falling back to
// `registryMetric.format` only makes sense for a single-series metric or a
// key with no more specific entry.
function formatFor(registryMetric, seriesKeys, key) {
  if (key) {
    const i = seriesKeys.indexOf(key);
    return registryMetric.headerValues?.[i]?.format ?? registryMetric.format ?? "currency";
  }
  return registryMetric.format ?? "currency";
}

// Pure — takes plain data (a list of registry metric definitions, plus a
// (metric) => sparseMetricOrUndefined lookup) so it's fully unit-testable
// without a live Supabase-backed repository. checkDataHealth() below is the
// real entry point the route uses.
function computeFindings(registryMetrics, findSparseMetric, seriesKeysFor) {
  const findings = [];

  for (const registryMetric of registryMetrics) {
    const metric = findSparseMetric(registryMetric);
    if (!metric) continue;

    const seriesKeys = seriesKeysFor(registryMetric);
    const keys = seriesKeys ?? [null];

    for (const key of keys) {
      const points = seriesPoints(metric, key);
      const name = labelFor(registryMetric, seriesKeys ?? [], key);
      const format = formatFor(registryMetric, seriesKeys ?? [], key);

      const run = trailingFlatlineRun(points);
      if (run >= FLATLINE_MIN_RUN) {
        const latest = points[points.length - 1];
        findings.push({
          type: "flatlined",
          department: registryMetric.department,
          slug: registryMetric.slug,
          subKey: key,
          name,
          format,
          value: latest.value,
          weeks: run,
          latestWeekEnding: latest.weekEnding,
        });
      }

      // A goal of 0 is either unset or a legitimate target (e.g. a metric
      // whose ideal is zero) — either way, value === 0 === goal is a
      // normal "on target" week, not a sign of corruption, so it's
      // excluded here. Same for small integer "count" metrics (e.g. a
      // goal of 2 or 5) — an exact coincidental match there is common and
      // meaningless; the real bug this hunts for (Open Factory P.O.s'
      // unpaid figure copying its multi-million-dollar goal) only shows up
      // in currency/percent/decimal figures precise enough that an exact
      // match is actually surprising.
      if (format === "count") continue;
      const matches = [];
      for (const p of points) {
        const goal = metric.goals?.[p.weekEnding];
        if (goal !== undefined && goal !== null && goal !== 0 && p.value === goal) {
          matches.push({ weekEnding: p.weekEnding, value: p.value });
        }
      }
      // One finding per metric, not one per week — Weekly Gross Margin
      // hitting its own goal on 16 separate weeks over 3 years is one
      // pattern for a human to judge, not 16 rows to scroll past.
      if (matches.length > 0) {
        findings.push({
          type: "matchesGoal",
          department: registryMetric.department,
          slug: registryMetric.slug,
          subKey: key,
          name,
          format,
          occurrences: matches,
        });
      }
    }
  }

  return findings;
}

function checkDataHealth() {
  return computeFindings(
    sharedRegistry.METRICS,
    (registryMetric) => repository.getSparseDepartmentData(registryMetric.department).METRICS.find((m) => m.slug === registryMetric.slug),
    (registryMetric) => sharedRegistry.seriesKeysFor(registryMetric)
  );
}

module.exports = { checkDataHealth, computeFindings, FLATLINE_MIN_RUN };
