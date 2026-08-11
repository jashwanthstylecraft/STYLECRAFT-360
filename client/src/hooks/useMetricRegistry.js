import registry, { METRICS, BY_SLUG, BY_DEPARTMENT, getMetric, getDepartmentMetrics, seriesKeysFor } from "../../../shared/metricRegistry.mjs";
import weeks, { WEEK_LABELS, WEEK_ENDINGS, LAST_WEEK_ENDING } from "../../../shared/weeks.mjs";

// Client-side access to the shared registry/week model — true ESM, so this
// is a plain, direct import of the exact same source the server bridges via
// server/data/sharedRegistry.js. No duplication, no build step.
export const METRIC_REGISTRY = registry;
export const WEEK_MODEL = weeks;
export { METRICS, BY_SLUG, BY_DEPARTMENT, getMetric, getDepartmentMetrics, seriesKeysFor, WEEK_LABELS, WEEK_ENDINGS, LAST_WEEK_ENDING };
