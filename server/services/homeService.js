const { getSalesMetrics } = require("./salesService");
const { getInventoryMetrics } = require("./inventoryService");
const { getFinanceMetrics } = require("./financeService");
const { getOperationsMetrics } = require("./operationsService");
const { getMarketingMetrics } = require("./marketingService");
const { getCustomerServiceMetrics } = require("./customerServiceService");
const counterService = require("./counterService");

// Which metric each department leads with on the 360 home page. Configurable
// here rather than hardcoded per-card on the client, so changing a
// department's headline is a one-line server change.
const HEADLINE_METRIC_SLUG = {
  sales: "us-b2b-invoiced",
  inventory: "inventory-level",
  finance: "weekly-gross-margin",
  operations: "shipping-time-days",
  marketing: "new-social-follow-subs",
  "customer-service": "customer-returns",
};

const BUILT_DEPARTMENTS = [
  { key: "sales", label: "Sales", path: "/sales", getMetrics: getSalesMetrics },
  { key: "inventory", label: "Inventory & Purchasing", path: "/inventory", getMetrics: getInventoryMetrics },
  { key: "finance", label: "Finance", path: "/finance", getMetrics: getFinanceMetrics },
  { key: "operations", label: "Operations", path: "/operations", getMetrics: getOperationsMetrics },
  { key: "marketing", label: "Marketing", path: "/marketing", getMetrics: getMarketingMetrics },
  { key: "customer-service", label: "Customer Service", path: "/customer-service", getMetrics: getCustomerServiceMetrics },
];

const COMING_SOON_DEPARTMENTS = [{ key: "manufacturing", label: "Manufacturing", path: "/manufacturing" }];

// The health strip needs one higher-is-better 0-100+ score per department,
// but headline metrics don't all carry attainmentPct in the same shape
// (Operations' headline is a dual-value chart with no single goal ratio) —
// so Operations gets a synthetic target/actual score instead.
function healthAttainmentPct(deptKey, data, headlineMetric) {
  if (deptKey === "sales") return data.summary.overallAttainmentPct.value;
  if (deptKey === "inventory") return data.summary.inventoryLevelAttainmentPct.value;
  if (deptKey === "finance") return headlineMetric?.attainmentPct ?? null;
  if (deptKey === "operations") {
    const { value } = data.summary.avgShippingTime;
    const target = headlineMetric?.targetLine;
    if (!value || !target) return null;
    return (target / value) * 100;
  }
  return null;
}

function buildHeadline(dept, period, range) {
  const data = dept.getMetrics(period, range);
  const slug = HEADLINE_METRIC_SLUG[dept.key];
  const metric = data.metrics.find((m) => m.slug === slug) ?? null;

  return {
    key: dept.key,
    label: dept.label,
    path: dept.path,
    built: true,
    weeks: data.weeks,
    period: data.period,
    isSampleData: data.isSampleData,
    headlineMetric: metric,
    healthAttainmentPct: healthAttainmentPct(dept.key, data, metric),
  };
}

async function getHomeSummary(period, range) {
  const { total, asOf } = await counterService.getState();

  return {
    counter: { total, asOf },
    departments: [
      ...BUILT_DEPARTMENTS.map((dept) => buildHeadline(dept, period, range)),
      ...COMING_SOON_DEPARTMENTS.map((dept) => ({ ...dept, built: false })),
    ],
  };
}

module.exports = { getHomeSummary };
