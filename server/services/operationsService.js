const repository = require("../data/repository");
const { wowDeltaPct, seriesForKey, sumOrNull, avgOrNull, buildMetric } = require("./metricsHelpers");
const { applyPeriodToDepartment } = require("./aggregate");

// Defective Returns, Repair Rate %, Customer Returns, and NEW Social
// Follow/Subs moved back in from the now-empty Customer Service and
// Marketing departments (kept as real, empty departments for future use —
// see shared/metricRegistry.mjs). This summary still only highlights
// Operations' original 4 metrics — Shipping Time, Invoice Errors &
// Shortages, Artwork Out the Door, and Education Events (Guru Cards Created
// and the newly-moved-in metrics still get a full card on the page, just not
// a summary tile — the same "not every metric needs a summary tile" pattern
// Sales/Inventory already use).
function buildSummary(WEEKS, METRICS) {
  const latestIndex = WEEKS.length - 1;
  const bySlug = (slug) => METRICS.find((m) => m.slug === slug);

  const shipping = bySlug("shipping-time-days");
  const b2bSeries = seriesForKey(shipping, "b2b");
  const b2cSeries = seriesForKey(shipping, "b2c");
  const avgShippingSeries = b2bSeries.map((v, i) => avgOrNull(v, b2cSeries[i]));

  const invoiceErrors = bySlug("invoice-errors-shortages");
  const artwork = bySlug("milkshake-units-prepped");

  const education = bySlug("education-events");
  const requestedSeries = seriesForKey(education, "requested");
  const completedSeries = seriesForKey(education, "completed");

  return {
    avgShippingTime: {
      value: avgShippingSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(avgShippingSeries),
      b2b: b2bSeries[latestIndex],
      b2c: b2cSeries[latestIndex],
    },
    invoiceErrors: {
      result: invoiceErrors.series[latestIndex],
      wowDeltaPct: wowDeltaPct(invoiceErrors.series),
      budget: invoiceErrors.goal,
    },
    artworkOutTheDoor: {
      result: artwork.series[latestIndex],
      wowDeltaPct: wowDeltaPct(artwork.series),
    },
    educationEvents: {
      requested: requestedSeries[latestIndex],
      completed: completedSeries[latestIndex],
      wowDeltaPct: wowDeltaPct(completedSeries),
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
