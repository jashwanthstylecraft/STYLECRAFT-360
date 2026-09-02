// The Phase 7 metric detail page's one data source — reuses each
// department's existing, already-tested getXMetrics() (no aggregation or
// attainment/wow logic is duplicated here), fetched twice: once at the
// caller's requested period (for the hero chart, which should look exactly
// like the card at that period) and once forced to weekly (for the stats
// strip and data table — moving averages, streaks, and "42 of 48 weeks
// entered" are inherently weekly concepts, and the table has to show real
// weeks to link into Data Entry, so it never follows the period selector).
const sharedRegistry = require("../data/sharedRegistry");
const repository = require("../data/repository");
const { getSalesMetrics } = require("./salesService");
const { getInventoryMetrics } = require("./inventoryService");
const { getFinanceMetrics } = require("./financeService");
const { getOperationsMetrics } = require("./operationsService");
const { getMarketingMetrics } = require("./marketingService");
const { getCustomerServiceMetrics } = require("./customerServiceService");
const { buildDetailStats, buildYtdStats, goalHit, humanizeKey } = require("./detailStats");

// The fullscreen YTD bar is always "this calendar year so far," independent
// of whatever range the page's own date-range selector is currently set to.
// "So far" stops at the latest week with any real data (the same anchor the
// client's own "Year to date" preset and the server's default range use —
// see rangeForPreset in datePresets.js and getLatestDataWeekEndingAcrossDepartments)
// rather than the end of the calendar year: goals are typically pre-filled
// for the whole year up front, so summing straight through December would
// count months of not-yet-happened goal targets that have no matching
// result to compare against, making ytdGoal look far larger than it should.
function currentYearRange() {
  const anchor = repository.getLatestDataWeekEndingAcrossDepartments() ?? sharedRegistry.currentWeek(new Date());
  const currentYear = new Date(`${anchor}T00:00:00Z`).getUTCFullYear();
  const yearWeeks = sharedRegistry.generateWeeks().filter((w) => w.year === currentYear);
  if (!yearWeeks.length) return null;
  const to = yearWeeks.some((w) => w.weekEnding === anchor) ? anchor : yearWeeks[yearWeeks.length - 1].weekEnding;
  return { from: yearWeeks[0].weekEnding, to };
}

const DEPARTMENT_SERVICES = {
  sales: getSalesMetrics,
  inventory: getInventoryMetrics,
  finance: getFinanceMetrics,
  operations: getOperationsMetrics,
  marketing: getMarketingMetrics,
  "customer-service": getCustomerServiceMetrics,
};

function buildTableRow(metric, week, weekEnding, index) {
  if (metric.groupKeys) {
    const point = metric.series[index] ?? {};
    const perSeries = metric.groupKeys.map((key, ki) => ({
      key,
      label: metric.headerValues?.[ki]?.label ?? humanizeKey(key),
      value: point[key] ?? null,
    }));
    return { week, weekEnding, perSeries, total: null, goal: null, variance: null, variancePct: null, hit: null };
  }

  const point = metric.stackKeys ? metric.series[index] ?? {} : null;
  const perSeries = metric.stackKeys
    ? metric.stackKeys.map((key, ki) => ({ key, label: metric.headerValues?.[ki]?.label ?? humanizeKey(key), value: point[key] ?? null }))
    : null;

  const value = metric.stackKeys
    ? (() => {
        const values = metric.stackKeys.map((k) => point[k]).filter((v) => v !== null && v !== undefined);
        return values.length ? values.reduce((a, b) => a + b, 0) : null;
      })()
    : metric.series[index] ?? null;

  const goal = metric.goalSeries?.[index] ?? null;
  const hasBoth = value !== null && value !== undefined && goal !== null && goal !== undefined;
  const variance = hasBoth ? value - goal : null;
  const variancePct = hasBoth && goal !== 0 ? (variance / goal) * 100 : null;

  return {
    week,
    weekEnding,
    perSeries,
    value: metric.stackKeys ? undefined : value,
    total: metric.stackKeys ? value : undefined,
    goal,
    variance,
    variancePct,
    hit: goalHit(value, goal, metric.goalDirection),
  };
}

function buildTable(metric, weeks, weekEndings) {
  const rows = weeks.map((week, i) => buildTableRow(metric, week, weekEndings?.[i] ?? null, i));
  return rows.slice().reverse(); // newest first, per spec
}

function getMetricDetail(department, slug, period, range) {
  const getMetrics = DEPARTMENT_SERVICES[department];
  if (!getMetrics) return null;

  const hero = getMetrics(period, range);
  const raw = hero.period === "weekly" ? hero : getMetrics("weekly", range);

  const heroMetric = hero.metrics.find((m) => m.slug === slug);
  const rawMetric = raw.metrics.find((m) => m.slug === slug);
  if (!heroMetric || !rawMetric) return null;

  const ytdRange = currentYearRange();
  const ytdMetric = ytdRange ? getMetrics("weekly", ytdRange).metrics.find((m) => m.slug === slug) : null;

  const departmentMetrics = sharedRegistry.getDepartmentMetrics(department);
  const orderIndex = departmentMetrics.findIndex((m) => m.slug === slug);
  const prev = orderIndex > 0 ? departmentMetrics[orderIndex - 1] : null;
  const next = orderIndex >= 0 && orderIndex < departmentMetrics.length - 1 ? departmentMetrics[orderIndex + 1] : null;

  return {
    department,
    slug,
    hero: { weeks: hero.weeks, period: hero.period, metric: heroMetric },
    stats: buildDetailStats(rawMetric, raw.weeks, raw.weekEndings),
    ytd: ytdMetric ? buildYtdStats(ytdMetric) : null,
    table: buildTable(rawMetric, raw.weeks, raw.weekEndings),
    isSampleData: hero.isSampleData,
    prev: prev ? { slug: prev.slug, name: prev.name } : null,
    next: next ? { slug: next.slug, name: next.name } : null,
  };
}

module.exports = { getMetricDetail };
