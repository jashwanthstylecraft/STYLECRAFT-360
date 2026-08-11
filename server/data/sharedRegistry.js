// Bridges the true-ESM shared/metricRegistry.mjs + shared/weeks.mjs +
// shared/weekCalendar.mjs into this CommonJS server. Node can't `require()`
// an ESM file synchronously, so we dynamic-import once at boot and cache the
// result; every consumer below this point calls the synchronous getters,
// which are safe to use anywhere AFTER server/index.js has awaited `ready`
// (before it calls app.listen — see there).
const path = require("path");

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

module.exports = {
  ready,
  get METRICS() {
    return assertReady(registry, "METRICS").METRICS;
  },
  getMetric(slug) {
    return assertReady(registry, "getMetric").getMetric(slug);
  },
  getDepartmentMetrics(department) {
    return assertReady(registry, "getDepartmentMetrics").getDepartmentMetrics(department);
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
