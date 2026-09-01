// Single source of truth for every metric's structure: department, chart
// type, goal direction, aggregation method, format, and a one-line
// description. Consumed by both the server (services, aggregation,
// validation) and the client (labels, tooltips, glossary hovers). NEVER
// define chartType/goalDirection/aggregationMethod/format/description for a
// metric anywhere else — seed/upload/entry data supplies only the numbers
// (slug + series + goalSeries), looked up against this registry by slug.
//
// True ESM, not CJS — see weeks.mjs's header comment for why.
//
// aggregationMethod ("sum" | "average" | "last") — see server/services/
// aggregate.js for why this can't be "whatever's convenient": summing
// weekly percentages or inventory snapshots produces numbers that are
// simply wrong, not just imprecise.
export const METRICS = [
  // ---- Sales ----
  {
    slug: "us-b2b-invoiced",
    name: "U.S. B2B Invoiced Sales",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Weekly invoiced sales to U.S. B2B accounts.",
  },
  {
    slug: "intl-b2b-invoiced",
    name: "INT'L B2B Invoiced Sales",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Weekly invoiced sales to international B2B accounts.",
  },
  {
    slug: "ecommerce-ex-website",
    name: "eCommerce (ex. Website)",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Direct-to-consumer sales through third-party marketplaces, excluding the owned website.",
  },
  {
    slug: "website-sales",
    name: "Website Sales",
    department: "sales",
    chartType: "stacked",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    stackKeys: ["stylecraft", "gammaPlus"],
    description: "Owned-website sales, split by StyleCraft and GAMMA+ brand.",
  },
  {
    slug: "weekly-b2b-orders",
    name: "Weekly B2B Orders",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Total value of B2B orders placed during the week.",
  },
  {
    slug: "beauty-sales",
    name: "Beauty Sales",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Sales of beauty and haircare tools.",
  },
  {
    slug: "preorders-backorders",
    name: "Pre-orders / Backorders",
    department: "sales",
    chartType: "grouped",
    format: "currency",
    aggregationMethod: "sum",
    groupKeys: ["preorder", "backorder"],
    description: "Open pre-order demand vs. unfulfilled backorder value.",
  },
  {
    slug: "johnny-b-b2c",
    name: "Johnny B B2C Sales",
    department: "sales",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "sum",
    description: "Direct-to-consumer sales under the Johnny B brand.",
  },

  // ---- Inventory & Purchasing ----
  {
    slug: "inventory-level",
    name: "Inventory Level",
    department: "inventory",
    chartType: "bar",
    goalDirection: "higher",
    format: "currency",
    aggregationMethod: "last",
    description: "On-hand inventory value at week's end.",
  },
  {
    slug: "open-factory-pos",
    name: "OPEN Factory P.O.s",
    department: "inventory",
    chartType: "paidUnpaidStacked",
    goalDirection: "lower",
    format: "currency",
    aggregationMethod: "last",
    stackKeys: ["paid", "unpaid"],
    description: "Outstanding factory purchase orders, split by paid vs. unpaid.",
  },
  {
    slug: "in-stock-percentage",
    name: "In-Stock Percentage %",
    department: "inventory",
    chartType: "dualGrouped",
    goalDirection: "higher",
    aggregationMethod: "average",
    groupKeys: ["orderFill", "skuAvail"],
    targetLine: 0.95,
    headerValues: [
      { label: "Order Fill %", format: "percent", color: "blue" },
      { label: "SKU Avail %", format: "percent", color: "red" },
    ],
    description: "Share of orders fully filled and SKUs in stock.",
  },
  {
    slug: "inventory-discrepancy",
    name: "Inventory Discrepancy",
    department: "inventory",
    chartType: "divergingBar",
    goalDirection: "lower",
    format: "currency",
    aggregationMethod: "last",
    yDomain: [-20000, 20000],
    description: "Gap between recorded and counted inventory — ideally zero.",
  },

  // ---- Finance ----
  {
    slug: "ar-total",
    name: "A/R Total",
    department: "finance",
    chartType: "bar",
    goalDirection: "lower",
    format: "currency",
    aggregationMethod: "last",
    description: "Total accounts receivable outstanding.",
  },
  {
    slug: "ar-past-due",
    name: "A/R Past Due (Incl. in Total)",
    department: "finance",
    chartType: "bar",
    goalDirection: "lower",
    goalLabel: "Budget",
    format: "currency",
    aggregationMethod: "last",
    description: "Receivables past due, included in the A/R total above.",
  },
  {
    slug: "weekly-gross-margin",
    name: "Weekly Gross Margin",
    department: "finance",
    chartType: "percentBar",
    goalDirection: "higher",
    format: "percent",
    aggregationMethod: "average",
    yDomain: [0.4, 0.65],
    description: "Gross margin for the week's shipped orders.",
  },

  // ---- Operations ----
  {
    slug: "new-social-follow-subs",
    name: "NEW Social Follow/Subs",
    department: "operations",
    chartType: "stacked",
    goalDirection: "higher",
    aggregationMethod: "sum",
    stackKeys: ["social", "klaviyo"],
    targetLine: 3500,
    headerValues: [
      { label: "Social", format: "count", color: "blue" },
      { label: "Klaviyo", format: "count", color: "red" },
    ],
    description: "New social follows and Klaviyo email/SMS subscribers.",
  },
  {
    slug: "shipping-time-days",
    name: "Shipping Time (# Days)",
    department: "operations",
    chartType: "dualGrouped",
    goalDirection: "lower",
    aggregationMethod: "average",
    groupKeys: ["b2b", "b2c"],
    targetLine: 1.0,
    headerValues: [
      { label: "B2B", format: "decimal", color: "blue" },
      { label: "B2C", format: "decimal", color: "red" },
    ],
    description: "Average days from order to ship, B2B vs. B2C.",
  },
  {
    slug: "defective-returns",
    name: "Defective Returns",
    department: "operations",
    chartType: "bar",
    goalDirection: "lower",
    goalLabel: "Budget",
    format: "currency",
    aggregationMethod: "sum",
    description: "Value of units returned as defective.",
  },
  {
    slug: "education-events",
    name: "Education Events",
    department: "operations",
    chartType: "dualGrouped",
    goalDirection: "higher",
    aggregationMethod: "sum",
    groupKeys: ["requested", "completed"],
    targetLine: 2,
    headerValues: [
      { label: "Requested", format: "count", color: "red" },
      { label: "Completed", format: "count", color: "blue" },
    ],
    description: "Customer education sessions requested vs. completed.",
  },
  {
    slug: "invoice-errors-shortages",
    name: "Invoice Errors & Shortages",
    department: "operations",
    chartType: "bar",
    goalDirection: "lower",
    format: "currency",
    aggregationMethod: "sum",
    description: "Value of invoice errors and order shortages — ideally zero.",
  },
  {
    slug: "product-reviews",
    name: "# of Product Reviews",
    department: "operations",
    chartType: "bar",
    goalDirection: "higher",
    format: "count",
    aggregationMethod: "sum",
    description: "New product reviews collected during the week.",
  },
  {
    slug: "repair-rate",
    name: "Repair Rate %",
    department: "operations",
    chartType: "percentBar",
    goalDirection: "higher",
    format: "percent",
    aggregationMethod: "average",
    yDomain: [0, 1.0],
    description: "Share of service tickets resolved by repair rather than replacement.",
  },
  {
    slug: "milkshake-units-prepped",
    name: "Artwork Out the Door",
    department: "operations",
    chartType: "bar",
    goalDirection: "higher",
    format: "count",
    aggregationMethod: "sum",
    description: "Units of artwork shipped out the door.",
  },
  {
    slug: "guru-cards-created",
    name: "Guru Cards Created",
    department: "operations",
    chartType: "bar",
    goalDirection: "higher",
    format: "count",
    aggregationMethod: "sum",
    description: "New internal knowledge-base (Guru) cards created.",
  },
  {
    slug: "customer-returns",
    name: "Customer Returns",
    department: "operations",
    chartType: "bar",
    goalDirection: "lower",
    goalLabel: "Budget",
    format: "currency",
    aggregationMethod: "sum",
    description: "Value of customer returns not attributed to a defect.",
  },
];

export const BY_SLUG = Object.fromEntries(METRICS.map((m) => [m.slug, m]));
export const BY_DEPARTMENT = METRICS.reduce((acc, m) => {
  (acc[m.department] ??= []).push(m);
  return acc;
}, {});

export function getMetric(slug) {
  return BY_SLUG[slug] ?? null;
}

export function getDepartmentMetrics(department) {
  return BY_DEPARTMENT[department] ?? [];
}

// A multi-series metric's series keys, regardless of which chart-type field
// carries them (stacked/paidUnpaidStacked use stackKeys, grouped/dualGrouped
// use groupKeys) — null for single-series metrics.
export function seriesKeysFor(metric) {
  return metric?.stackKeys ?? metric?.groupKeys ?? null;
}

export default { METRICS, BY_SLUG, BY_DEPARTMENT, getMetric, getDepartmentMetrics, seriesKeysFor };
