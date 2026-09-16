// Builds the weekly dashboard-overview email — a curated subset of metrics
// (not the whole app), each shown at its latest real week. Reuses the exact
// same department services + withLatestWeekSummary math the app itself
// renders from, so the numbers in the email always match the live app.
const repository = require("../data/repository");
const sharedRegistry = require("../data/sharedRegistry");
const { getSalesMetrics } = require("./salesService");
const { getInventoryMetrics } = require("./inventoryService");
const { getFinanceMetrics } = require("./financeService");
const { getOperationsMetrics } = require("./operationsService");
const { getMarketingMetrics } = require("./marketingService");
const { getCustomerServiceMetrics } = require("./customerServiceService");

const DEPARTMENT_SERVICES = {
  sales: getSalesMetrics,
  inventory: getInventoryMetrics,
  finance: getFinanceMetrics,
  operations: getOperationsMetrics,
  marketing: getMarketingMetrics,
  "customer-service": getCustomerServiceMetrics,
};

// Mirrors client/src/utils/format.js's formatValue — kept as its own small
// copy (not shared) since the two run in different module systems (ESM
// client vs. CJS server) and this is the only server-side consumer.
function formatValue(value, format = "currency") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  switch (format) {
    case "percent":
      return `${(value * 100).toFixed(0)}%`;
    case "decimal":
      return value.toFixed(2);
    case "count":
      return Math.round(value).toLocaleString("en-US");
    case "currency":
    default: {
      const abs = Math.abs(value);
      const sign = value < 0 ? "-" : "";
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
      return `${sign}$${abs.toLocaleString("en-US")}`;
    }
  }
}

function formatPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

// Looks a single metric up by slug: finds its department via the shared
// registry, calls that department's own getMetrics() (default period/range
// — withLatestWeekSummary inside it overrides result/goal/etc. to the true
// latest week regardless), and returns null if the slug doesn't resolve
// rather than guessing.
function getMetricSummary(slug) {
  const def = sharedRegistry.getMetricIncludingHidden(slug);
  if (!def) return null;
  const getMetrics = DEPARTMENT_SERVICES[def.department];
  if (!getMetrics) return null;
  const data = getMetrics();
  const metric = data.metrics.find((m) => m.slug === slug);
  if (!metric) return null;
  return metric;
}

function metricRowHtml(metric) {
  const name = metric.name ?? metric.slug;
  if (Array.isArray(metric.headerValues)) {
    const parts = metric.headerValues
      .map((h) => `${h.label ?? h.key}: <strong>${formatValue(h.value, h.format)}</strong>`)
      .join(" &nbsp;·&nbsp; ");
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">
      <div style="font-weight:600;">${name}</div>
      <div style="color:#444;font-size:14px;">${parts}</div>
    </td></tr>`;
  }

  const result = formatValue(metric.result, metric.format);
  const goal = metric.goal !== null && metric.goal !== undefined ? formatValue(metric.goal, metric.format) : null;
  const attainment = metric.attainmentPct !== null && metric.attainmentPct !== undefined ? formatPct(metric.attainmentPct) : null;
  const wow = metric.wowDeltaPct !== null && metric.wowDeltaPct !== undefined ? formatPct(metric.wowDeltaPct) : null;

  return `<tr><td style="padding:10px 0;border-bottom:1px solid #e5e5e5;">
    <div style="font-weight:600;">${name}</div>
    <div style="color:#444;font-size:14px;">
      Result: <strong>${result}</strong>
      ${goal ? ` &nbsp;·&nbsp; Goal: ${goal}` : ""}
      ${attainment ? ` &nbsp;·&nbsp; Attainment: ${attainment}` : ""}
      ${wow ? ` &nbsp;·&nbsp; WoW: ${wow}` : ""}
    </div>
  </td></tr>`;
}

// slugs: array of metric slugs to include, in the order they should appear.
// Placeholder layout — expect to redo this once real sample emails are
// provided to match the wanted look.
function buildWeeklyReport(slugs) {
  const weekEnding = repository.getLatestDataWeekEndingAcrossDepartments();
  const found = [];
  const missing = [];

  for (const slug of slugs) {
    const metric = getMetricSummary(slug);
    if (metric) found.push(metric);
    else missing.push(slug);
  }

  const subject = `StyleCraft 360 — Weekly Overview${weekEnding ? ` (week of ${weekEnding})` : ""}`;
  const rows = found.map(metricRowHtml).join("\n");
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="margin-bottom:4px;">StyleCraft 360 — Weekly Overview</h2>
      <p style="color:#666;margin-top:0;">${weekEnding ? `Week ending ${weekEnding}` : "Latest data"}</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <p style="color:#999;font-size:12px;margin-top:24px;">Automated summary from StyleCraft 360.</p>
    </div>
  `;
  const text = found
    .map((m) => {
      if (Array.isArray(m.headerValues)) {
        return `${m.name}: ${m.headerValues.map((h) => `${h.label ?? h.key}=${formatValue(h.value, h.format)}`).join(", ")}`;
      }
      return `${m.name}: Result=${formatValue(m.result, m.format)}${m.goal != null ? `, Goal=${formatValue(m.goal, m.format)}` : ""}`;
    })
    .join("\n");

  return { subject, html, text, weekEnding, found: found.map((m) => m.slug), missing };
}

module.exports = { buildWeeklyReport, getMetricSummary };
