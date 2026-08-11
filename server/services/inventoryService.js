const repository = require("../data/repository");
const { attainmentPct, wowDeltaPct, wowPointDelta, seriesForKey, sumOrNull, buildMetric } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const inventoryLevel = bySlug("inventory-level");
  const attainmentSeries = inventoryLevel.series.map((v) => attainmentPct(v, inventoryLevel.goal));

  const openPos = bySlug("open-factory-pos");
  const paidSeries = seriesForKey(openPos, "paid");
  const unpaidSeries = seriesForKey(openPos, "unpaid");
  const openPoTotalSeries = paidSeries.map((paid, i) => sumOrNull(paid, unpaidSeries[i]));

  const orderFillSeries = seriesForKey(bySlug("in-stock-percentage"), "orderFill");

  const discrepancy = bySlug("inventory-discrepancy");
  const discrepancyMagnitudeSeries = discrepancy.series.map((v) => (v === null || v === undefined ? null : Math.abs(v)));

  return {
    inventoryLevelAttainmentPct: {
      value: attainmentSeries[latestIndex],
      wowPointDelta: wowPointDelta(attainmentSeries),
    },
    openPoTotal: {
      result: openPoTotalSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(openPoTotalSeries),
      paid: paidSeries[latestIndex],
      unpaid: unpaidSeries[latestIndex],
    },
    orderFillPct: {
      value: orderFillSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(orderFillSeries),
    },
    discrepancy: {
      result: discrepancy.series[latestIndex],
      magnitudeWowDeltaPct: wowDeltaPct(discrepancyMagnitudeSeries),
    },
  };
}

function getInventoryMetrics(period, range) {
  const raw = repository.getDepartmentData("inventory", range);
  const { WEEKS, WEEK_ENDINGS, AS_OF, METRICS, period: resolvedPeriod } = applyPeriodToDepartment(raw, period);
  return {
    asOf: AS_OF,
    weeks: WEEKS,
    weekEndings: WEEK_ENDINGS,
    period: resolvedPeriod,
    metrics: METRICS.map(buildMetric),
    summary: buildSummary(WEEKS, METRICS),
    isSampleData: repository.isUsingSampleData(),
  };
}

module.exports = { getInventoryMetrics };
