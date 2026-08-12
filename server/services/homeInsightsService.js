// Data for the Phase 7 home page's six "best-fit visualization" cards
// (shared/homeInsights.mjs). Every card reuses the department's existing
// getXMetrics() — no aggregation/attainment logic is duplicated here, only
// the NEW shapes these specific chart types need (cumulative running totals,
// a moving average + goal band, brand-mix shares, a full-history heatmap
// bucketing, and a per-department scoreboard variance).
const sharedRegistry = require("../data/sharedRegistry");
const { getSalesMetrics } = require("./salesService");
const { getInventoryMetrics } = require("./inventoryService");
const { getFinanceMetrics } = require("./financeService");
const { getOperationsMetrics } = require("./operationsService");
const { movingAverageSeries } = require("./detailStats");

const DEPARTMENT_SERVICES = {
  sales: getSalesMetrics,
  inventory: getInventoryMetrics,
  finance: getFinanceMetrics,
  operations: getOperationsMetrics,
};

function findMetric(department, metricSlug, range) {
  const data = DEPARTMENT_SERVICES[department]("weekly", range);
  return { data, metric: data.metrics.find((m) => m.slug === metricSlug) };
}

function buildCumulativeArea(card, range) {
  const { data, metric } = findMetric(card.department, card.metricSlug, range);
  let runningValue = 0;
  let runningGoal = 0;
  let anyValue = false;
  let anyGoal = false;

  const points = data.weekEndings.map((weekEnding, i) => {
    const v = metric.series[i];
    const g = metric.goalSeries?.[i];
    if (v !== null && v !== undefined) {
      runningValue += v;
      anyValue = true;
    }
    if (g !== null && g !== undefined) {
      runningGoal += g;
      anyGoal = true;
    }
    return {
      weekEnding,
      week: data.weeks[i],
      cumulativeValue: anyValue ? runningValue : null,
      cumulativeGoal: anyGoal ? runningGoal : null,
    };
  });

  return { metricName: metric.name, format: metric.format, points };
}

function buildTrendLine(card, range) {
  const { data, metric } = findMetric(card.department, card.metricSlug, range);
  const ma = movingAverageSeries(metric.series);
  const tolerance = card.goalBandTolerance ?? 0;

  const points = data.weekEndings.map((weekEnding, i) => {
    const goal = metric.goalSeries?.[i] ?? null;
    return {
      weekEnding,
      week: data.weeks[i],
      value: metric.series[i] ?? null,
      goal,
      movingAverage: ma[i],
      goalBandLow: goal !== null ? goal - tolerance : null,
      goalBandHigh: goal !== null ? goal + tolerance : null,
    };
  });

  return { metricName: metric.name, format: metric.format, points };
}

function buildShareDonutComposition(card, range) {
  const { data, metric } = findMetric(card.department, card.metricSlug, range);
  const keys = metric.stackKeys;

  const points = data.weekEndings.map((weekEnding, i) => {
    const point = { weekEnding, week: data.weeks[i] };
    keys.forEach((key) => {
      point[key] = metric.series[i]?.[key] ?? null;
    });
    return point;
  });

  const totals = Object.fromEntries(
    keys.map((key) => [key, points.reduce((sum, p) => sum + (p[key] ?? 0), 0)])
  );
  const combined = Object.values(totals).reduce((a, b) => a + b, 0);
  const shares = Object.fromEntries(keys.map((key) => [key, combined ? (totals[key] / combined) * 100 : null]));

  return { metricName: metric.name, format: metric.format, stackKeys: keys, points, totals, shares, combined };
}

function buildLevelArea(card, range) {
  return card.metrics.map(({ department, metricSlug }) => {
    const { data, metric } = findMetric(department, metricSlug, range);
    const points = data.weekEndings.map((weekEnding, i) => ({
      weekEnding,
      week: data.weeks[i],
      value: metric.series[i] ?? null,
      goal: metric.goalSeries?.[i] ?? null,
    }));
    return { department, metricSlug, metricName: metric.name, format: metric.format, points };
  });
}

// `visibleFrom` is the Settings-page visibility floor (see
// client/src/utils/dataVisibility.js) — this card ignores the normal
// from/to range on purpose (it always wants full real history), so
// visibleFrom is the one way to tell it "hide before this date too."
// Nothing about the underlying stored data changes either way.
function buildMonthHeatmap(card, visibleFrom) {
  const from = visibleFrom && visibleFrom > sharedRegistry.CALENDAR_START ? visibleFrom : sharedRegistry.CALENDAR_START;
  const range = { from, to: sharedRegistry.CALENDAR_END };
  const { data, metric } = findMetric(card.department, card.metricSlug, range);

  const cells = data.weekEndings.map((weekEnding, i) => {
    const d = new Date(`${weekEnding}T00:00:00Z`);
    return {
      weekEnding,
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      value: metric.series[i] ?? null,
    };
  });

  return { metricName: metric.name, format: metric.format, cells };
}

// Operations' headline (Shipping Time) has no single result/goal — average
// its two series against the fixed targetLine, the same reading
// operationsService.js's own buildSummary() already uses for "avg shipping
// time" elsewhere, so the scoreboard agrees with the department page.
function buildScoreboard(card) {
  return card.metrics.map(({ department, metricSlug }) => {
    const { metric } = findMetric(department, metricSlug, {});
    const latestIndex = metric.series.length - 1;

    if (metric.groupKeys) {
      const point = metric.series[latestIndex] ?? {};
      const vals = metric.groupKeys.map((k) => point[k]).filter((v) => v !== null && v !== undefined);
      const value = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      const goal = metric.targetLine ?? null;
      const variance = value !== null && goal !== null ? value - goal : null;
      return {
        department,
        metricSlug,
        metricName: metric.name,
        format: metric.headerValues?.[0]?.format ?? "decimal",
        goalDirection: metric.goalDirection,
        value,
        goal,
        variance,
        variancePct: variance !== null && goal ? (variance / goal) * 100 : null,
      };
    }

    const value = metric.result ?? null;
    const goal = metric.goal ?? null;
    const variance = value !== null && goal !== null && goal !== undefined ? value - goal : null;
    return {
      department,
      metricSlug,
      metricName: metric.name,
      format: metric.format,
      goalDirection: metric.goalDirection,
      value,
      goal,
      variance,
      variancePct: variance !== null && goal ? (variance / goal) * 100 : null,
    };
  });
}

const BUILDERS = {
  CumulativeArea: buildCumulativeArea,
  TrendLine: buildTrendLine,
  ShareDonutComposition: buildShareDonutComposition,
  LevelArea: buildLevelArea,
  MonthHeatmap: buildMonthHeatmap,
  VarianceColumns: buildScoreboard,
};

function getHomeInsights({ from, to, visibleFrom } = {}) {
  const range = { from, to };
  const cards = sharedRegistry.HOME_INSIGHTS.map((card) => {
    const builder = BUILDERS[card.chart];
    // MonthHeatmap ignores `range` on purpose (see buildMonthHeatmap) — it
    // takes visibleFrom instead, the only thing that should ever narrow it.
    const data = !builder ? null : card.chart === "MonthHeatmap" ? builder(card, visibleFrom) : builder(card, range);
    return {
      key: card.key,
      title: card.title,
      caption: card.caption,
      chart: card.chart,
      department: card.department ?? null,
      metricSlug: card.metricSlug ?? null,
      data,
    };
  });
  return { cards };
}

module.exports = { getHomeInsights };
