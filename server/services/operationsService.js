const repository = require("../data/repository");
const { wowDeltaPct, seriesForKey, sumOrNull, avgOrNull, buildMetric } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const shipping = bySlug("shipping-time-days");
  const b2bSeries = seriesForKey(shipping, "b2b");
  const b2cSeries = seriesForKey(shipping, "b2c");
  const avgShippingSeries = b2bSeries.map((v, i) => avgOrNull(v, b2cSeries[i]));

  const defective = bySlug("defective-returns");
  const invoiceErrors = bySlug("invoice-errors-shortages");
  const customerReturns = bySlug("customer-returns");
  const qualitySeries = defective.series.map((v, i) =>
    sumOrNull(v, invoiceErrors.series[i], customerReturns.series[i])
  );
  const qualityBudget = sumOrNull(defective.goal, invoiceErrors.goal, customerReturns.goal);

  const repairRate = bySlug("repair-rate");

  const social = bySlug("new-social-follow-subs");
  const socialSeries = seriesForKey(social, "social");
  const klaviyoSeries = seriesForKey(social, "klaviyo");
  const combinedSocialSeries = socialSeries.map((v, i) => sumOrNull(v, klaviyoSeries[i]));

  return {
    avgShippingTime: {
      value: avgShippingSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(avgShippingSeries),
      b2b: b2bSeries[latestIndex],
      b2c: b2cSeries[latestIndex],
    },
    qualityDollars: {
      result: qualitySeries[latestIndex],
      wowDeltaPct: wowDeltaPct(qualitySeries),
      budget: qualityBudget,
    },
    repairRatePct: {
      value: repairRate.series[latestIndex],
      wowDeltaPct: wowDeltaPct(repairRate.series),
    },
    newSocialAdds: {
      result: combinedSocialSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(combinedSocialSeries),
      social: socialSeries[latestIndex],
      klaviyo: klaviyoSeries[latestIndex],
    },
  };
}

function getOperationsMetrics(period, range) {
  const raw = repository.getDepartmentData("operations", range);
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

module.exports = { getOperationsMetrics };
