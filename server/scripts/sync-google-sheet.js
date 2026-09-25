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
//
// Goals: RESULT values are always synced (see SIMPLE_METRICS etc. above);
// GOAL values are synced only for the one metric the sheet's dedicated
// AZ-BD goal block (columns 51-55) and the app's own data model agree on —
// see GOAL_SYNC_METRICS and TARGET_LINE_COLUMNS just below.
const SIMPLE_METRICS = [
  { slug: "us-b2b-invoiced", valueCol: 2, goalCol: 3 },
  { slug: "ecommerce-ex-website", valueCol: 4, goalCol: 5 },
  { slug: "johnny-b-b2c", valueCol: 6, goalCol: 7 },
  // col 8/9 (Website Sales) is NOT a plain currency column — see
  // SCALED_SUBKEY_METRICS below, where it's mapped with a x1000 scale
  // factor instead.
  { slug: "inventory-level", valueCol: 10, goalCol: 11 },
  // col 12/13/14 (OPEN Factory P.O.s) is NOT a plain value/goal pair — see
  // MULTI_METRICS below, where it's mapped as a real paid/unpaid split
  // (col 14's header cell is blank/merged in the sheet, which is why an
  // earlier read of this tab missed it and wrongly assumed only a combined
  // total existed).
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
  // ValueF (col 12) / ValueG (col 14) — GoalF (col 13) sits between them and
  // is this metric's real per-week goal, handled by GOAL_SYNC_METRICS
  // below, not by this pair. Confirmed against 9 real weeks (Jul-24 -
  // Sep-18 2026): paid matched the app's existing history exactly for
  // every week; unpaid had drifted to a corrupted goal-value duplicate for
  // Sep-4 and Sep-11 specifically, fixed by hand from this same column.
  { slug: "open-factory-pos", subKeys: ["paid", "unpaid"], cols: [12, 14] },
];

// Metrics where the sheet stores just ONE of a multi-value metric's
// sub-keys, scaled by a fixed factor rather than as a plain dollar figure.
// Website Sales' "stylecraft" web-store total is the one confirmed case:
// the sheet consistently stores it in THOUSANDS ("23" means $23,000), not
// raw dollars — verified against two manually-entered weeks (Sep-11:
// sheet "23" == real $23,000; Sep-18: sheet "28" == real $28,000). No
// column exists for gammaPlus at all — never written, same as before.
const SCALED_SUBKEY_METRICS = [{ slug: "website-sales", subKey: "stylecraft", col: 8, scale: 1000 }];

// Goals are almost always pre-filled weeks/months ahead of time by hand, so
// the sync still never RE-DERIVES an already-set goal from the sheet — see
// the additive `already !== null` check below, same rule GoalRangePanel
// uses. Two exceptions, both confirmed against real sheet data: Website
// Sales' "Web Ad Sales Goals" (BC, col 54, part of the AZ-BD goal block —
// see TARGET_LINE_COLUMNS below for the other four columns in that block,
// which the app has no per-week storage for at all) — thousands-shorthand
// scale, same as its value column (col 8; e.g. Aug-14: sheet "58" == real
// $58,000 goal). And Open Factory P.O.s' GoalF (col 13, part of its own
// paid/goal/unpaid triad — see MULTI_METRICS above) — already a plain
// dollar figure like its value columns, no scale needed.
const GOAL_SYNC_METRICS = [
  { slug: "website-sales", col: 54, scale: 1000 },
  { slug: "open-factory-pos", col: 13 },
];

// AZ/BA/BB/BD — In-Stock %, Shipping Time, Education Events, New Social
// Follow/Subs. Each is a single constant repeated on every sheet row, not a
// real per-week figure, matching how the app itself stores them: a flat
// `targetLine` in metricRegistry.mjs (drawn as one ReferenceLine), never a
// per-week `goals` entry. There's nothing to write weekly for these — only
// something to flag if the sheet's constant ever drifts from the registry
// again (as In-Stock % did: registry said 0.95, sheet said 0.96, fixed by
// hand Sep 2026). See checkTargetLineDrift.
const TARGET_LINE_COLUMNS = [
  { slug: "in-stock-percentage", col: 51, sheetLabel: "in stock goal (AZ)" },
  { slug: "shipping-time-days", col: 52, sheetLabel: "Shipping goal (BA)" },
  { slug: "education-events", col: 53, sheetLabel: "Education Goal (BB)" },
  { slug: "new-social-follow-subs", col: 55, sheetLabel: "Social Goal (BD)" },
];

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

// existingGoals: { [slug]: currentGoalOrNull } for the week being planned —
// only metrics in GOAL_SYNC_METRICS are looked up. Caller-supplied (rather
// than fetched here) so this stays a pure, synchronous function.
function buildEntries(cells, existingGoals = {}) {
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

  for (const m of GOAL_SYNC_METRICS) {
    const already = existingGoals[m.slug];
    if (already !== null && already !== undefined) continue; // additive only — never overwrite a pre-filled goal
    const raw = parseNumber(cells[m.col]);
    if (raw === null) continue; // nothing to add — leave for manual entry, same as any other unresolved field
    entries[m.slug] = { ...entries[m.slug], goal: raw * (m.scale ?? 1) };
  }

  return { entries, skipped };
}

// Pure — takes the app's CURRENT goal values (already read by the caller)
// rather than reaching into the registry/repository itself, so this stays
// testable with a plain object like every other check in this file.
function checkTargetLineDrift(row, registryTargetLines) {
  const drift = [];
  for (const c of TARGET_LINE_COLUMNS) {
    const sheetValue = parseNumber(row.cells[c.col]);
    const registryValue = registryTargetLines[c.slug];
    if (sheetValue === null || registryValue === null || registryValue === undefined) continue;
    if (Math.abs(sheetValue - registryValue) > 1e-9) {
      drift.push({ slug: c.slug, sheetLabel: c.sheetLabel, sheetValue, registryValue });
    }
  }
  return drift;
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
//
// getExistingGoal(slug, weekEnding): optional synchronous lookup for
// GOAL_SYNC_METRICS' additive check — defaults to "assume nothing set yet"
// (always null) when the caller has no cheap way to look it up (e.g. the
// CLI/HTTP entry point below). The real automated path (routes/cron.js)
// passes a real lookup against the already-primed in-memory snapshot.
function planSyncFromRows(rows, latestDataWeekEnding, getExistingGoal = () => null) {
  const toSync = [];
  const unresolved = [];

  for (const row of rows) {
    const weekEnding = resolveWeekEnding(row.week, latestDataWeekEnding);
    if (!weekEnding) {
      unresolved.push({ week: row.week, reason: "could not resolve to a real Friday date" });
      continue;
    }
    if (weekEnding <= latestDataWeekEnding) continue; // already entered, or older — never touched

    const existingGoals = Object.fromEntries(GOAL_SYNC_METRICS.map((m) => [m.slug, getExistingGoal(m.slug, weekEnding)]));
    const { entries, skipped } = buildEntries(row.cells, existingGoals);
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
function planSync(rawSheetText, latestDataWeekEnding, getExistingGoal = () => null) {
  return planSyncFromRows(parseSheetExport(rawSheetText), latestDataWeekEnding, getExistingGoal);
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
  checkTargetLineDrift,
  SIMPLE_METRICS,
  MULTI_METRICS,
  SCALED_SUBKEY_METRICS,
  GOAL_SYNC_METRICS,
  TARGET_LINE_COLUMNS,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
