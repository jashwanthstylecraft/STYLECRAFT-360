// Bridges the true-ESM shared/metricRegistry.mjs + shared/weeks.mjs +
// shared/weekCalendar.mjs into this CommonJS server. Node can't `require()`
// an ESM file synchronously, so we dynamic-import once at boot and cache the
// result; every consumer below this point calls the synchronous getters,
// which are safe to use anywhere AFTER server/index.js has awaited `ready`
// (before it calls app.listen — see there).
const path = require("path");
const customMetrics = require("./customMetrics");
const metricNameOverrides = require("./metricNameOverrides");
const hiddenMetrics = require("./hiddenMetrics");

let registry = null;
let weeks = null;
let calendar = null;
let homeInsights = null;

function fileUrl(...segments) {
  return "file://" + path.join(__dirname, "..", "..", ...segments).replace(/\\/g, "/");
}

const ready = (async () => {
  registry = await import(fileUrl("shared", "metricRegistry.mjs"));
  weeks = await import(fileUrl("shared", "weeks.mjs"));
  calendar = await import(fileUrl("shared", "weekCalendar.mjs"));
  homeInsights = await import(fileUrl("shared", "homeInsights.mjs"));
})();

function assertReady(mod, name) {
  if (!mod) {
    throw new Error(`sharedRegistry: ${name} accessed before the async import finished — server/index.js must await \`ready\` before app.listen.`);
  }
  return mod;
}

// Registry + custom metrics, name-overridden, WITHOUT the hidden-metric
// filter — the raw material every getter below (and the admin "including
// hidden" accessors) is built from.
function rawMetrics() {
  return metricNameOverrides.applyOverrides([...assertReady(registry, "METRICS").METRICS, ...customMetrics.getCustomMetrics()]);
}

function rawDepartmentMetrics(department) {
  return metricNameOverrides.applyOverrides([
    ...assertReady(registry, "getDepartmentMetrics").getDepartmentMetrics(department),
    ...customMetrics.getCustomMetricsForDepartment(department),
  ]);
}

module.exports = {
  ready,
  // Admin-added metrics (Settings → Add Graph, see data/customMetrics.js)
  // are merged in here — the one seam every consumer (Data Entry, export,
  // detail pages, department services) goes through, so nothing downstream
  // needs to know a metric came from a database row instead of the static
  // shared/metricRegistry.mjs file. Admin-hidden metrics (Settings → Rename
  // graphs → Delete, on a built-in metric) are filtered out at this same
  // seam — see data/hiddenMetrics.js and the *IncludingHidden accessors
  // below, used only by the admin Settings UI itself.
  get METRICS() {
    return rawMetrics().filter((m) => !hiddenMetrics.isHidden(m.slug));
  },
  getMetric(slug) {
    if (hiddenMetrics.isHidden(slug)) return null;
    return rawMetrics().find((m) => m.slug === slug) ?? null;
  },
  getDepartmentMetrics(department) {
    return rawDepartmentMetrics(department).filter((m) => !hiddenMetrics.isHidden(m.slug));
  },
  // Bypasses the hidden filter — for the Settings "Rename graphs" picker
  // (which needs to list removed built-in graphs so they can be restored)
  // and for validating a hide/unhide/rename request against a metric that
  // may currently be hidden.
  getAllDepartmentMetricsIncludingHidden(department) {
    return rawDepartmentMetrics(department).map((m) => ({ ...m, isHidden: hiddenMetrics.isHidden(m.slug) }));
  },
  getMetricIncludingHidden(slug) {
    return rawMetrics().find((m) => m.slug === slug) ?? null;
  },
  isMetricHidden(slug) {
    return hiddenMetrics.isHidden(slug);
  },
  seriesKeysFor(metric) {
    return assertReady(registry, "seriesKeysFor").seriesKeysFor(metric);
  },
  get WEEK_LABELS() {
    return assertReady(weeks, "WEEK_LABELS").WEEK_LABELS;
  },
  get WEEK_ENDINGS() {
    return assertReady(weeks, "WEEK_ENDINGS").WEEK_ENDINGS;
  },
  get LAST_WEEK_ENDING() {
    return assertReady(weeks, "LAST_WEEK_ENDING").LAST_WEEK_ENDING;
  },
  computeWeekEndings(labels, lastEnding) {
    return assertReady(weeks, "computeWeekEndings").computeWeekEndings(labels, lastEnding);
  },
  get CALENDAR_START() {
    return assertReady(calendar, "CALENDAR_START").CALENDAR_START;
  },
  get CALENDAR_END() {
    return assertReady(calendar, "CALENDAR_END").CALENDAR_END;
  },
  generateWeeks(startISO, endISO) {
    return assertReady(calendar, "generateWeeks").generateWeeks(startISO, endISO);
  },
  formatWeekLabel(date) {
    return assertReady(calendar, "formatWeekLabel").formatWeekLabel(date);
  },
  currentWeek(today) {
    return assertReady(calendar, "currentWeek").currentWeek(today);
  },
  get HOME_INSIGHTS() {
    return assertReady(homeInsights, "HOME_INSIGHTS").HOME_INSIGHTS;
  },
};
