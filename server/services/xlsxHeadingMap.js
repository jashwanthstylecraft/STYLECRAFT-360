// Maps the exact metric headings used in StyleCraft's real "Raw Data - Do Not
// Touch" workbook to our internal department/slug/series-key model. This is
// the ONE place that translates their spreadsheet's language into ours —
// numbers still flow through the same seed catalog + repository as before.
//
// `kind`:
//   "single"        — one Value column + one Goal column
//   "multi"         — N named series columns, no inline goal (the catalog's
//                      own goal/targetLine/goalSeries is used untouched)
//   "multiWithGoal" — N named series columns PLUS an inline goal column
//
// Heading text is matched after collapsing internal whitespace to single
// spaces and trimming — their sheet has stray double-spaces in a few labels
// ("Johnny B     B2C  Sales", "Pre-orders/  Backorders").
function normalizeHeading(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

const HEADING_MAP = {
  "U.S. B2B Invoiced Sales": { department: "sales", slug: "us-b2b-invoiced", kind: "single" },
  "eCommerce (ex. Website)": { department: "sales", slug: "ecommerce-ex-website", kind: "single" },
  "Johnny B B2C Sales": { department: "sales", slug: "johnny-b-b2c", kind: "single" },
  "Website Sales": {
    department: "sales",
    slug: "website-sales",
    kind: "multi",
    seriesMap: { SC: "stylecraft", Gamma: "gammaPlus" },
  },
  "INT'L B2B Invoiced Sales": { department: "sales", slug: "intl-b2b-invoiced", kind: "single" },
  "Weekly B2B Orders": { department: "sales", slug: "weekly-b2b-orders", kind: "single" },
  "Beauty Sales": { department: "sales", slug: "beauty-sales", kind: "single" },
  "Pre-orders/ Backorders": {
    department: "sales",
    slug: "preorders-backorders",
    kind: "multi",
    seriesMap: { "Pre-orders": "preorder", Backorders: "backorder" },
  },

  "Inventory Level": { department: "inventory", slug: "inventory-level", kind: "single" },
  "OPEN Factory P.O.s": {
    department: "inventory",
    slug: "open-factory-pos",
    kind: "multiWithGoal",
    seriesMap: { PAID: "paid", UNPAID: "unpaid" },
    goalSubLabel: "Goal",
  },
  "Inventory Discrepancy": { department: "inventory", slug: "inventory-discrepancy", kind: "single" },
  "In-Stock Percentage %": {
    department: "inventory",
    slug: "in-stock-percentage",
    kind: "multi",
    seriesMap: { orders: "orderFill", SKUs: "skuAvail" },
  },

  "A/R Total": { department: "finance", slug: "ar-total", kind: "single" },
  "A/R Past Due (Incl. in Total)": { department: "finance", slug: "ar-past-due", kind: "single" },
  "Weekly Gross Margin": { department: "finance", slug: "weekly-gross-margin", kind: "single" },

  "Artwork Out the Door": { department: "operations", slug: "milkshake-units-prepped", kind: "single" },
  "NEW Social Follow/Subs": {
    department: "marketing",
    slug: "new-social-follow-subs",
    kind: "multi",
    seriesMap: { "Social Media": "social", Klavio: "klaviyo" },
  },
  "Defective Returns": { department: "customer-service", slug: "defective-returns", kind: "single" },
  "Customer Returns": { department: "customer-service", slug: "customer-returns", kind: "single" },
  "Shipping Time (# Days)": {
    department: "operations",
    slug: "shipping-time-days",
    kind: "multi",
    seriesMap: { B2B: "b2b", B2C: "b2c" },
  },
  "Invoice Errors & Shortages": { department: "operations", slug: "invoice-errors-shortages", kind: "single" },
  "Product Reviews": { department: "marketing", slug: "product-reviews", kind: "single" },
  "Repair Rate": { department: "customer-service", slug: "repair-rate", kind: "single" },
  "Education Events": {
    department: "operations",
    slug: "education-events",
    kind: "multi",
    seriesMap: { REquests: "requested", Completed: "completed" },
  },
  "Guru Cards": { department: "operations", slug: "guru-cards-created", kind: "single" },
};

const NORMALIZED_HEADING_MAP = Object.fromEntries(
  Object.entries(HEADING_MAP).map(([heading, config]) => [normalizeHeading(heading), config])
);

function lookupHeading(rawHeading) {
  return NORMALIZED_HEADING_MAP[normalizeHeading(rawHeading)] ?? null;
}

// Reverse index (slug -> {heading, ...config}) — used by templateService to
// regenerate a workbook in the same shape the parser reads.
const BY_SLUG = Object.fromEntries(
  Object.entries(HEADING_MAP).map(([heading, config]) => [config.slug, { heading, ...config }])
);

function headingForSlug(slug) {
  return BY_SLUG[slug] ?? null;
}

module.exports = { HEADING_MAP, lookupHeading, normalizeHeading, headingForSlug };
