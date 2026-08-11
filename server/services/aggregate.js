// Aggregates a weekly series into Monthly/Quarterly/Yearly buckets using
// the metric-correct method — see shared/metricRegistry.mjs's
// `aggregationMethod` field.
//
// Why this can't default to "sum": these seed weeks are FLOWS (revenue,
// units — add them up over a month and you get a real monthly total),
// RATES (gross margin %, shipping days — average them, because a "monthly
// margin" of 220% from summing four ~55% weeks is nonsense), or
// STOCKS/BALANCES (inventory on hand, A/R outstanding — take the last
// week's snapshot, because summing four weekly inventory snapshots doesn't
// produce a real quantity, it produces a meaningless 4x-inflated number).
// Every metric MUST declare which one it is; there is no safe default.

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toUTCDate(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`);
}

function periodKeyAndLabel(dateStr, period) {
  const d = toUTCDate(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth(); // 0-11

  if (period === "monthly") {
    return { key: `${year}-${String(month + 1).padStart(2, "0")}`, label: MONTH_ABBR[month] };
  }
  if (period === "quarterly") {
    const q = Math.floor(month / 3) + 1;
    return { key: `${year}-Q${q}`, label: `Q${q}-${String(year).slice(2)}` };
  }
  if (period === "yearly") {
    return { key: `${year}`, label: `${year}` };
  }
  throw new Error(`aggregate: unknown period "${period}" — expected "monthly", "quarterly", or "yearly".`);
}

// The calendar [start, end] a period key covers — used only to count how
// many Fridays (this business's week-ending day) SHOULD fall in it, so a
// still-in-progress current month/quarter/year can be flagged partial even
// though every week the data actually has is present.
function rangeForKey(key, period) {
  if (period === "monthly") {
    const [year, month] = key.split("-").map(Number);
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 0)) };
  }
  if (period === "quarterly") {
    const [year, qPart] = key.split("-");
    const q = Number(qPart.slice(1));
    const startMonth = (q - 1) * 3;
    return { start: new Date(Date.UTC(Number(year), startMonth, 1)), end: new Date(Date.UTC(Number(year), startMonth + 3, 0)) };
  }
  if (period === "yearly") {
    const year = Number(key);
    return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year, 11, 31)) };
  }
  throw new Error(`aggregate: unknown period "${period}".`);
}

function countFridaysInRange(start, end) {
  let count = 0;
  const d = new Date(start);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  while (d.getTime() <= end.getTime()) {
    count++;
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return count;
}

function expectedWeekCountFor(key, period) {
  const { start, end } = rangeForKey(key, period);
  return countFridaysInRange(start, end);
}

// Missing weeks are excluded, not counted as zero — averaging [null, 0.5]
// must give 0.5, not 0.25, and summing [null, 100] must give 100, not fail.
// A group with NO real values anywhere returns null (never a fabricated 0).
function reduceValues(values, method) {
  const present = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (present.length === 0) return null;
  if (method === "sum") return present.reduce((a, b) => a + b, 0);
  if (method === "average") return present.reduce((a, b) => a + b, 0) / present.length;
  if (method === "last") return present[present.length - 1];
  throw new Error(`aggregate: unknown aggregationMethod "${method}" — expected "sum", "average", or "last".`);
}

// aggregate(series, weekEndings, period, method) -> [{ label, value, weekCount, expectedWeekCount, partial }]
// `series` and `weekEndings` must be the same length, in chronological order.
function aggregate(series, weekEndings, period, method) {
  if (!Array.isArray(series) || !Array.isArray(weekEndings) || series.length !== weekEndings.length) {
    throw new Error("aggregate: series and weekEndings must be same-length arrays.");
  }
  if (!method) {
    throw new Error('aggregate: "method" is required — never silently default to sum.');
  }

  if (period === "weekly") {
    return series.map((value, i) => ({
      label: weekEndings[i],
      value: value ?? null,
      weekCount: 1,
      expectedWeekCount: 1,
      partial: false,
    }));
  }

  const order = [];
  const groups = new Map();
  weekEndings.forEach((dateStr, i) => {
    const { key, label } = periodKeyAndLabel(dateStr, period);
    if (!groups.has(key)) {
      groups.set(key, { key, label, values: [] });
      order.push(key);
    }
    groups.get(key).values.push(series[i] ?? null);
  });

  return order.map((key) => {
    const group = groups.get(key);
    const expectedWeekCount = expectedWeekCountFor(key, period);
    const weekCount = group.values.length;
    return {
      label: group.label,
      value: reduceValues(group.values, method),
      weekCount,
      expectedWeekCount,
      partial: weekCount < expectedWeekCount,
    };
  });
}

// One metric's series/goalSeries (and, for multi-series metrics, each named
// sub-series) aggregated into the given period. Goals aggregate by the same
// method as the metric's own values, per spec. Returns a shape ready to
// hand straight to the existing per-department buildMetric()/buildSummary()
// functions — they don't need to know the period was anything but weekly.
function aggregateMetricSeries(metric, weeks, weekEndings, period) {
  if (period === "weekly" || !period) {
    return { weeks, series: metric.series, goalSeries: metric.goalSeries, partials: weeks.map(() => false) };
  }

  const method = metric.aggregationMethod;
  if (!method) {
    throw new Error(`aggregate: metric "${metric.slug}" has no aggregationMethod in the registry — refusing to guess.`);
  }

  const seriesKeys = metric.stackKeys || metric.groupKeys;

  if (seriesKeys) {
    const perKeyGroups = seriesKeys.map((key) => {
      const rawSeries = metric.series.map((point) => point?.[key] ?? null);
      return aggregate(rawSeries, weekEndings, period, method);
    });
    const periodLabels = perKeyGroups[0].map((g) => g.label);
    const partials = perKeyGroups[0].map((g) => g.partial);
    const series = periodLabels.map((_, i) => {
      const point = {};
      seriesKeys.forEach((key, k) => {
        point[key] = perKeyGroups[k][i].value;
      });
      return point;
    });
    const goalSeries = metric.goalSeries
      ? aggregate(metric.goalSeries, weekEndings, period, method).map((g) => g.value)
      : undefined;
    return { weeks: periodLabels, series, goalSeries, partials };
  }

  const valueGroups = aggregate(metric.series, weekEndings, period, method);
  const goalSeries = metric.goalSeries
    ? aggregate(metric.goalSeries, weekEndings, period, method).map((g) => g.value)
    : undefined;
  return {
    weeks: valueGroups.map((g) => g.label),
    series: valueGroups.map((g) => g.value),
    goalSeries,
    partials: valueGroups.map((g) => g.partial),
  };
}

const VALID_PERIODS = new Set(["weekly", "monthly", "quarterly", "yearly"]);

// Applies a period to an entire department's {WEEKS, WEEK_ENDINGS, AS_OF,
// METRICS} — the one function department services call. Every metric ends
// up with a `series`/`goalSeries` in the new granularity (and a `partials`
// flag array) while staying otherwise untouched, so the existing
// buildMetric()/buildSummary() functions run unmodified: they only ever see
// "a series of numbers," never "weekly" vs "monthly."
function applyPeriodToDepartment(departmentData, period) {
  const resolvedPeriod = period && VALID_PERIODS.has(period) ? period : "weekly";
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS } = departmentData;

  if (resolvedPeriod === "weekly") {
    return { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod };
  }

  let periodWeeks = null;
  const aggregatedMetrics = METRICS.map((metric) => {
    const result = aggregateMetricSeries(metric, WEEKS, WEEK_ENDINGS, resolvedPeriod);
    if (!periodWeeks) periodWeeks = result.weeks;
    return { ...metric, series: result.series, goalSeries: result.goalSeries, partials: result.partials };
  });

  return { WEEKS: periodWeeks, AS_OF, METRICS: aggregatedMetrics, period: resolvedPeriod };
}

module.exports = { aggregate, aggregateMetricSeries, applyPeriodToDepartment, periodKeyAndLabel, expectedWeekCountFor, VALID_PERIODS };
