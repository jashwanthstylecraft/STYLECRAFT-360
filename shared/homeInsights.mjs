// The Phase 7 home page's curated "best-fit visualization" cards — the ONE
// place chart type varies by what a metric IS rather than its department's
// standard chart type (see shared/metricRegistry.mjs's `chartType`, which
// governs every department/detail page and never changes). Swapping which
// metric a card features, or adding a card, is a config change here, not
// new page code — the home page just renders whatever this list describes.
export const HOME_INSIGHTS = [
  {
    key: "sales-cumulative",
    title: "Sales — Cumulative vs Plan",
    caption: "Running total of U.S. B2B invoiced sales against a cumulative goal line — is the year adding up to plan?",
    chart: "CumulativeArea",
    department: "sales",
    metricSlug: "us-b2b-invoiced",
  },
  {
    key: "margin-trend",
    title: "Gross Margin Trend",
    caption: "Weekly gross margin with a 4-week moving average and a shaded band around the goal.",
    chart: "TrendLine",
    department: "finance",
    metricSlug: "weekly-gross-margin",
    goalBandTolerance: 0.02,
  },
  {
    key: "website-mix",
    title: "Website Brand Mix",
    caption: "StyleCraft vs. GAMMA+ share of website sales for the selected range.",
    chart: "ShareDonutComposition",
    department: "sales",
    metricSlug: "website-sales",
  },
  {
    key: "levels",
    title: "Inventory & A/R Levels",
    caption: "Balances over time, read as smooth levels rather than weekly bars.",
    chart: "LevelArea",
    metrics: [
      { department: "inventory", metricSlug: "inventory-level" },
      { department: "finance", metricSlug: "ar-total" },
    ],
  },
  {
    key: "seasonality",
    title: "Sales Seasonality",
    caption: "U.S. B2B invoiced sales across the full real history — multi-year seasonality at a glance.",
    chart: "MonthHeatmap",
    department: "sales",
    metricSlug: "us-b2b-invoiced",
    fullHistory: true,
  },
  {
    key: "scoreboard",
    title: "Goal Scoreboard",
    caption: "Each department's headline metric, latest complete week: green above goal, red below (direction-aware).",
    chart: "VarianceColumns",
    metrics: [
      { department: "sales", metricSlug: "us-b2b-invoiced" },
      { department: "inventory", metricSlug: "inventory-level" },
      { department: "finance", metricSlug: "weekly-gross-margin" },
      { department: "operations", metricSlug: "shipping-time-days" },
    ],
  },
];

export default { HOME_INSIGHTS };
