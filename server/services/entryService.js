// Data Entry's server side: builds the editable grid for ANY of the 231
// master-calendar weeks (every registry metric, grouped by department, with
// that week's current value(s) and the prior week's value(s) for ghost
// text) and saves a week's edits through the SAME commitSnapshot() path the
// XLSX upload uses — one store, two doors.
//
// Sparse-native: a week is just an ISO date key. There's no positional
// array to extend or index into — editing week #3 or week #229 is the same
// operation (read the metric's sparse {values,goals}, set one key, write
// the whole department back).
const repository = require("../data/repository");
const sharedRegistry = require("../data/sharedRegistry");
const snapshotService = require("./snapshotService");
const { validateCellValue } = require("./metricValidation");

const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations"];

function entryKeyFor(slug, subkey) {
  return subkey ? `${slug}.${subkey}` : slug;
}

function findWeek(allWeeks, weekEnding) {
  return allWeeks.find((w) => w.weekEnding === weekEnding);
}

// No week requested: suggest the week right after the latest real data —
// "what should I fill in next" — but never suggest into the future beyond
// today's real calendar week.
function defaultWeekEnding(allWeeks) {
  const current = sharedRegistry.currentWeek(new Date());
  const latestData = repository.getLatestDataWeekEndingAcrossDepartments();
  if (!latestData) return current;

  const latestIndex = allWeeks.findIndex((w) => w.weekEnding === latestData);
  const next = allWeeks[latestIndex + 1];
  if (!next) return latestData;
  return next.weekEnding <= current ? next.weekEnding : current;
}

function buildMetricRow(registryMetric, sparseMetrics, weekEnding, priorWeekEnding) {
  const metric = sparseMetrics.find((m) => m.slug === registryMetric.slug);
  const seriesKeys = sharedRegistry.seriesKeysFor(registryMetric);
  const hasGoal = Boolean(metric?.goals);
  const goalEntryKey = entryKeyFor(registryMetric.slug);

  const base = {
    slug: registryMetric.slug,
    name: registryMetric.name,
    chartType: registryMetric.chartType,
    goalDirection: registryMetric.goalDirection ?? "higher",
    format: registryMetric.format || "currency",
    goalLabel: registryMetric.goalLabel || "Goal",
    description: registryMetric.description,
    hasGoal,
    goalEntryKey,
    goal: metric?.goals?.[weekEnding] ?? null,
    priorGoal: priorWeekEnding ? metric?.goals?.[priorWeekEnding] ?? null : null,
  };

  if (seriesKeys) {
    const weekPoint = metric?.values?.[weekEnding] ?? null;
    const priorPoint = priorWeekEnding ? metric?.values?.[priorWeekEnding] ?? null : null;
    const subRows = seriesKeys.map((key, i) => ({
      key,
      label: registryMetric.headerValues?.[i]?.label ?? key,
      entryKey: entryKeyFor(registryMetric.slug, key),
      value: weekPoint?.[key] ?? null,
      priorValue: priorPoint?.[key] ?? null,
    }));
    return { ...base, isMulti: true, subRows };
  }

  return {
    ...base,
    isMulti: false,
    entryKey: entryKeyFor(registryMetric.slug),
    value: metric?.values?.[weekEnding] ?? null,
    priorValue: priorWeekEnding ? metric?.values?.[priorWeekEnding] ?? null : null,
  };
}

// weekEnding: an ISO date (e.g. "2026-06-19"). Any Friday in the master
// calendar (2022-10-14 .. 2027-03-12) is valid, not just weeks with data —
// that's the whole point of click-to-edit-any-week.
function getEntryData(weekEnding) {
  const allWeeks = sharedRegistry.generateWeeks();
  const resolved = (weekEnding && findWeek(allWeeks, weekEnding)) || findWeek(allWeeks, defaultWeekEnding(allWeeks));
  const resolvedIndex = allWeeks.findIndex((w) => w.weekEnding === resolved.weekEnding);
  const prior = allWeeks[resolvedIndex - 1] ?? null;
  const next = allWeeks[resolvedIndex + 1] ?? null;
  const currentWeekEnding = sharedRegistry.currentWeek(new Date());

  const departments = DEPARTMENT_KEYS.map((departmentKey) => {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    const metrics = sharedRegistry
      .getDepartmentMetrics(departmentKey)
      .map((registryMetric) => buildMetricRow(registryMetric, sparse.METRICS, resolved.weekEnding, prior?.weekEnding ?? null));
    return { key: departmentKey, metrics };
  });

  return {
    weekEnding: resolved.weekEnding,
    weekLabel: resolved.label,
    month: resolved.month,
    quarter: resolved.quarter,
    year: resolved.year,
    priorWeekEnding: prior?.weekEnding ?? null,
    nextWeekEnding: next?.weekEnding ?? null,
    isFuture: resolved.weekEnding > currentWeekEnding,
    calendarStart: sharedRegistry.CALENDAR_START,
    calendarEnd: sharedRegistry.CALENDAR_END,
    departments,
  };
}

// entries: { [entryKey]: { value?: raw, goal?: raw } } — entryKey is
// "slug" for single-series metrics/metric-level goals, "slug.subkey" for a
// multi-series metric's own sub-row.
function validateEntries(entries) {
  const errors = [];
  const validated = {};

  for (const [entryKey, payload] of Object.entries(entries || {})) {
    const [slug] = entryKey.split(".");
    const registryMetric = sharedRegistry.getMetric(slug);
    if (!registryMetric) {
      errors.push({ entryKey, message: `Unknown metric "${slug}".` });
      continue;
    }

    if (payload.value !== undefined) {
      const { value, error } = validateCellValue(payload.value, registryMetric);
      if (error) errors.push({ entryKey, field: "value", message: error });
      else validated[entryKey] = { ...validated[entryKey], value };
    }
    if (payload.goal !== undefined) {
      const { value, error } = validateCellValue(payload.goal, registryMetric);
      if (error) errors.push({ entryKey, field: "goal", message: error });
      else validated[entryKey] = { ...validated[entryKey], goal: value };
    }
  }

  return { errors, validated };
}

function saveWeek({ weekEnding, entries, note }) {
  if (!weekEnding) {
    return { ok: false, errors: [{ message: "A weekEnding (ISO date) is required." }] };
  }
  const allWeeks = sharedRegistry.generateWeeks();
  if (!findWeek(allWeeks, weekEnding)) {
    return { ok: false, errors: [{ message: `"${weekEnding}" is not a Friday in the master calendar (${sharedRegistry.CALENDAR_START} – ${sharedRegistry.CALENDAR_END}).` }] };
  }

  const { errors, validated } = validateEntries(entries);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const departments = {};
  for (const departmentKey of DEPARTMENT_KEYS) {
    const sparse = repository.getSparseDepartmentData(departmentKey);

    const METRICS = sharedRegistry.getDepartmentMetrics(departmentKey).map((registryMetric) => {
      const existing = sparse.METRICS.find((m) => m.slug === registryMetric.slug);
      const values = { ...(existing?.values ?? {}) };
      const goals = { ...(existing?.goals ?? {}) };
      const seriesKeys = sharedRegistry.seriesKeysFor(registryMetric);
      const goalEntryKey = entryKeyFor(registryMetric.slug);

      if (validated[goalEntryKey]?.goal !== undefined) {
        if (validated[goalEntryKey].goal === null) delete goals[weekEnding];
        else goals[weekEnding] = validated[goalEntryKey].goal;
      }

      // A validated value of `null` means the user cleared the cell — the
      // ISO key must be DELETED, not set to null, or the sparse-storage
      // invariant ("key present = real data") breaks: coverage counts and
      // latest-data detection would still see the key and think this week
      // has data for this metric.
      if (seriesKeys) {
        const point = { ...(values[weekEnding] ?? {}) };
        let touched = false;
        for (const key of seriesKeys) {
          const entryKey = entryKeyFor(registryMetric.slug, key);
          if (validated[entryKey]?.value !== undefined) {
            if (validated[entryKey].value === null) delete point[key];
            else point[key] = validated[entryKey].value;
            touched = true;
          }
        }
        if (touched) {
          if (Object.keys(point).length > 0) values[weekEnding] = point;
          else delete values[weekEnding];
        }
      } else {
        const entryKey = entryKeyFor(registryMetric.slug);
        if (validated[entryKey]?.value !== undefined) {
          if (validated[entryKey].value === null) delete values[weekEnding];
          else values[weekEnding] = validated[entryKey].value;
        }
      }

      const clean = { slug: registryMetric.slug, values };
      if (Object.keys(goals).length > 0) clean.goals = goals;
      return clean;
    });

    departments[departmentKey] = { METRICS };
  }

  const meta = snapshotService.commitSnapshot(departments, {
    filename: `Week ${weekEnding}`,
    note: note || "",
    source: "Manual entry",
  });

  return { ok: true, meta };
}

// Aggregate-only view of every calendar week's data coverage — just a count
// of how many metrics (across all departments) have a value that week, not
// the values themselves. Powers the /data-entry week list's coverage dots
// without shipping 231 weeks x 25 metrics of real numbers on every load. A
// week with 0 is a truthful count of "nothing recorded yet," never treated
// as a metric actually being zero.
function getCoverage() {
  const allWeeks = sharedRegistry.generateWeeks();
  const totalMetrics = DEPARTMENT_KEYS.reduce((sum, key) => sum + sharedRegistry.getDepartmentMetrics(key).length, 0);

  const countsByWeek = new Map();
  for (const departmentKey of DEPARTMENT_KEYS) {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    for (const metric of sparse.METRICS) {
      for (const iso of Object.keys(metric.values ?? {})) {
        countsByWeek.set(iso, (countsByWeek.get(iso) ?? 0) + 1);
      }
    }
  }

  return {
    totalMetrics,
    calendarStart: sharedRegistry.CALENDAR_START,
    calendarEnd: sharedRegistry.CALENDAR_END,
    currentWeekEnding: sharedRegistry.currentWeek(new Date()),
    weeks: allWeeks.map((w) => ({
      weekEnding: w.weekEnding,
      metricsWithData: countsByWeek.get(w.weekEnding) ?? 0,
    })),
  };
}

module.exports = { getEntryData, saveWeek, getCoverage };
