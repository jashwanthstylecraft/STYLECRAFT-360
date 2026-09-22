// Syncs new weeks from the "Data for Chart" tab of Mark's Google Sheet
// ("Stylecraft DIRECTOR'S Dashboard", file id 1D0OBCd-03RFrfatUSF_3sXlrFzJZjk-GvKt6YVzYaYQ)
// into StyleCraft 360's Data Entry — additive only, never touches a week
// that already has data, and never guesses a field it can't confidently
// resolve (leaves it blank for manual entry instead).
//
// This script does NOT talk to Google itself — a scheduled Claude agent
// reads the sheet via its Drive connector, saves the raw exported text to a
// file, and invokes this script against that file. That split keeps the
// actual field-mapping logic deterministic and reviewable (this file),
// while the agent only handles fetching the raw source and calling the
// app's own Data Entry API with whatever this script decides.
//
// Column positions were read directly off the sheet's own header rows
// (row "[merged] <Metric Name>" + row "ValueA/GoalA/..."), not guessed from
// screenshots, and cross-checked against three real weeks already entered
// manually (Aug-28, Sep-4, Sep-11) — every value matched by position. Four
// metrics have no real scalar goal in the registry (hasGoal: false) — for
// those, the sheet repurposes its "Value/Goal" columns to hold the
// metric's own two real sub-values instead of an actual goal.
const SIMPLE_METRICS = [
  { slug: "us-b2b-invoiced", valueCol: 2, goalCol: 3 },
  { slug: "ecommerce-ex-website", valueCol: 4, goalCol: 5 },
  { slug: "johnny-b-b2c", valueCol: 6, goalCol: 7 },
  // col 8/9 (Website Sales) is NOT a plain currency column — see
  // SCALED_SUBKEY_METRICS below, where it's mapped with a x1000 scale
  // factor instead.
  { slug: "inventory-level", valueCol: 10, goalCol: 11 },
  // col 12/13 (OPEN Factory P.O.s) intentionally excluded — the sheet only
  // gives a combined total, but the app needs a paid/unpaid split with no
  // way to derive it from one number.
  // col 14/15 — no metric name at all in the sheet's own header; nothing to
  // map it to.
  { slug: "inventory-discrepancy", valueCol: 16, goalCol: 17 },
  { slug: "ar-total", valueCol: 18, goalCol: 19 },
  { slug: "ar-past-due", valueCol: 20, goalCol: 21 },
  { slug: "milkshake-units-prepped", valueCol: 22, goalCol: 23 },
  { slug: "intl-b2b-invoiced", valueCol: 26, goalCol: 27 },
  { slug: "weekly-b2b-orders", valueCol: 28, goalCol: 29 },
  { slug: "defective-returns", valueCol: 30, goalCol: 31 },
  { slug: "customer-returns", valueCol: 32, goalCol: 33 },
  { slug: "weekly-gross-margin", valueCol: 36, goalCol: 37, percentTopLevel: true },
  { slug: "invoice-errors-shortages", valueCol: 40, goalCol: 41 },
  { slug: "product-reviews", valueCol: 42, goalCol: 43 },
  { slug: "repair-rate", valueCol: 46, goalCol: 47, percentTopLevel: true },
  { slug: "guru-cards-created", valueCol: 57, goalCol: 58 },
  { slug: "beauty-sales", valueCol: 59, goalCol: 60 },
];

const MULTI_METRICS = [
  { slug: "new-social-follow-subs", subKeys: ["social", "klaviyo"], cols: [24, 25] },
  { slug: "shipping-time-days", subKeys: ["b2b", "b2c"], cols: [34, 35] },
  { slug: "in-stock-percentage", subKeys: ["orderFill", "skuAvail"], cols: [44, 45] },
  { slug: "preorders-backorders", subKeys: ["preorder", "backorder"], cols: [38, 39] },
];

// Metrics where the sheet stores just ONE of a multi-value metric's
// sub-keys, scaled by a fixed factor rather than as a plain dollar figure.
// Website Sales' "stylecraft" web-store total is the one confirmed case:
// the sheet consistently stores it in THOUSANDS ("23" means $23,000), not
// raw dollars — verified against two manually-entered weeks (Sep-11:
// sheet "23" == real $23,000; Sep-18: sheet "28" == real $28,000). No
// column exists for gammaPlus at all — never written, same as before.
const SCALED_SUBKEY_METRICS = [{ slug: "website-sales", subKey: "stylecraft", col: 8, scale: 1000 }];

// Never write goals via the sync — goals are almost always pre-filled
// weeks/months ahead of time by hand, and re-deriving them from the sheet
// risks silently overwriting a deliberate manual change. The sync only
// ever adds newly-appearing RESULT values.
function parseNumber(raw) {
  if (raw === undefined || raw === null) return null;
  const cleaned = String(raw)
    .replace(/\\-/g, "-")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  if (cleaned === "" || cleaned === "-") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function buildEntries(cells) {
  const entries = {};
  const skipped = [];

  for (const m of SIMPLE_METRICS) {
    const raw = parseNumber(cells[m.valueCol]);
    if (raw === null) {
      skipped.push(m.slug);
      continue;
    }
    entries[m.slug] = { value: m.percentTopLevel ? Math.round(raw * 10000) / 100 : raw };
  }

  for (const m of MULTI_METRICS) {
    const [c1, c2] = m.cols;
    const v1 = parseNumber(cells[c1]);
    const v2 = parseNumber(cells[c2]);
    if (v1 === null && v2 === null) {
      skipped.push(m.slug);
      continue;
    }
    if (v1 !== null) entries[`${m.slug}.${m.subKeys[0]}`] = { value: v1 };
    if (v2 !== null) entries[`${m.slug}.${m.subKeys[1]}`] = { value: v2 };
  }

  for (const m of SCALED_SUBKEY_METRICS) {
    const raw = parseNumber(cells[m.col]);
    if (raw === null) {
      skipped.push(`${m.slug}.${m.subKey}`);
      continue;
    }
    entries[`${m.slug}.${m.subKey}`] = { value: raw * m.scale };
  }

  return { entries, skipped };
}

// Splits the markdown-table text `read_file_content` returns for the sheet
// into per-row cell arrays, and locates the "Data for Chart" table
// specifically (it's the second table in the export, starting right after
// a row literally containing "# Weeks").
function parseSheetExport(rawText) {
  const lines = rawText.split(/\r?\n/).filter(Boolean);
  const splitRow = (line) => line.split("|").slice(1, -1).map((c) => c.trim());
  const rows = lines.map(splitRow);

  const weeksHeaderIndex = rows.findIndex((r) => r.some((c) => c.includes("# Weeks")));
  if (weeksHeaderIndex === -1) {
    throw new Error('Could not find the "Data for Chart" tab (no "# Weeks" marker row) in the sheet export.');
  }

  // weeksHeaderIndex row itself, +1 = column-id row, +2 = merged-names
  // row, +3 = sub-labels row, +4.. = actual data rows.
  const dataRows = rows.slice(weeksHeaderIndex + 4).filter((r) => r[1]); // r[1] = week label; blank = end of table
  return dataRows.map((cells) => ({ week: cells[1], cells }));
}

const MONTH_ABBR = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// The sheet's week labels ("Sep-11") carry no year — resolved against the
// app's own latest-known week so the right year is inferred even across a
// Dec->Jan rollover, and rejected outright (null, never guessed) if the
// result doesn't land on a real Friday.
function resolveWeekEnding(label, anchorISO) {
  const m = /^([A-Za-z]{3})-(\d{1,2})$/.exec(String(label).trim());
  if (!m) return null;
  const month = MONTH_ABBR[m[1]];
  if (month === undefined) return null;
  const day = Number(m[2]);

  const anchorDate = new Date(`${anchorISO}T00:00:00Z`);
  let year = anchorDate.getUTCFullYear();
  let candidate = new Date(Date.UTC(year, month, day));
  const diffDays = (candidate - anchorDate) / 86400000;
  if (diffDays < -120) candidate = new Date(Date.UTC(year + 1, month, day));
  else if (diffDays > 120) candidate = new Date(Date.UTC(year - 1, month, day));

  if (candidate.getUTCDay() !== 5) return null; // must be a real Friday
  return candidate.toISOString().slice(0, 10);
}

// Pure planning step — no network calls — so it's fully unit-testable: given
// already-parsed {week, cells} rows (from parseSheetExport, or from
// services/googleSheetsFetcher.js's direct Sheets API fetch — same row
// shape either way) and the app's current latest data week, decides
// exactly what would be written and what would be skipped, for every week
// strictly after the anchor. Never plans a write for the anchor week
// itself or anything before it.
function planSyncFromRows(rows, latestDataWeekEnding) {
  const toSync = [];
  const unresolved = [];

  for (const row of rows) {
    const weekEnding = resolveWeekEnding(row.week, latestDataWeekEnding);
    if (!weekEnding) {
      unresolved.push({ week: row.week, reason: "could not resolve to a real Friday date" });
      continue;
    }
    if (weekEnding <= latestDataWeekEnding) continue; // already entered, or older — never touched

    const { entries, skipped } = buildEntries(row.cells);
    if (Object.keys(entries).length === 0) {
      unresolved.push({ week: row.week, weekEnding, reason: "no fields could be confidently mapped" });
      continue;
    }
    toSync.push({ week: row.week, weekEnding, entries, fieldsSkipped: skipped });
  }

  toSync.sort((a, b) => (a.weekEnding < b.weekEnding ? -1 : 1)); // oldest first
  return { toSync, unresolved };
}

// Text-export entry point (manual/local use — paste a raw sheet export to
// a file and run this script directly). The automated Saturday sync
// (routes/cron.js) calls planSyncFromRows directly with rows fetched live
// from the Sheets API instead — see services/googleSheetsFetcher.js.
function planSync(rawSheetText, latestDataWeekEnding) {
  return planSyncFromRows(parseSheetExport(rawSheetText), latestDataWeekEnding);
}

async function main() {
  const sheetFilePath = process.argv[2];
  if (!sheetFilePath) {
    console.error("Usage: node sync-google-sheet.js <path-to-raw-sheet-export.txt>");
    process.exit(1);
  }
  const apiBase = process.env.SYNC_API_BASE || "https://stylecraft-360.vercel.app";
  const cookie = process.env.SYNC_SESSION_COOKIE;
  if (!cookie) {
    console.error("SYNC_SESSION_COOKIE env var (an authenticated admin session cookie) is required.");
    process.exit(1);
  }

  const rawText = require("fs").readFileSync(sheetFilePath, "utf8");
  const statusRes = await fetch(`${apiBase}/api/data/status`, { headers: { Cookie: cookie } });
  const status = await statusRes.json();
  if (!status.latestDataWeekEnding) throw new Error("Could not read latestDataWeekEnding from /api/data/status.");

  const { toSync, unresolved } = planSync(rawText, status.latestDataWeekEnding);
  const report = { anchorWeek: status.latestDataWeekEnding, synced: [], failed: [], unresolved };

  for (const plan of toSync) {
    const res = await fetch(`${apiBase}/api/entry/week/${plan.weekEnding}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ entries: plan.entries, note: `Synced from Google Sheet (week of ${plan.week})` }),
    });
    const json = await res.json();
    if (!json.ok) {
      report.failed.push({ week: plan.week, weekEnding: plan.weekEnding, errors: json.errors });
      continue; // don't attempt later (newer) weeks if an earlier one failed — keep gaps from opening up
    }
    report.synced.push({
      week: plan.week,
      weekEnding: plan.weekEnding,
      fieldsWritten: Object.keys(plan.entries).length,
      fieldsSkipped: plan.fieldsSkipped,
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

module.exports = {
  parseSheetExport,
  buildEntries,
  resolveWeekEnding,
  planSync,
  planSyncFromRows,
  SIMPLE_METRICS,
  MULTI_METRICS,
  SCALED_SUBKEY_METRICS,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
