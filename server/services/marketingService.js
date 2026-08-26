const repository = require("../data/repository");
const { wowDeltaPct, buildMetric } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const reviews = bySlug("product-reviews");
  const social = bySlug("new-social-follow-subs");
  const socialTotalSeries = social.series.map((point) =>
    point?.social === null || point?.social === undefined ? null : point.social + (point.klaviyo ?? 0)
  );

  return {
    productReviews: {
      result: reviews.series[latestIndex],
      wowDeltaPct: wowDeltaPct(reviews.series),
    },
    socialFollowSubs: {
      result: socialTotalSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(socialTotalSeries),
    },
  };
}

function getMarketingMetrics(period, range) {
  const raw = repository.getDepartmentData("marketing", range);
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

module.exports = { getMarketingMetrics };
