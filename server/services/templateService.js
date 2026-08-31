const XLSX = require("xlsx");
const repository = require("../data/repository");
const counterService = require("./counterService");
const { COUNTER_SHEET, COUNTER_KEY } = require("./xlsxSchema");
const { headingForSlug } = require("./xlsxHeadingMap");

const RAW_DATA_SHEET_NAME = "Raw Data - Do Not Touch";
const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations", "marketing", "customer-service"];

function excelSerialFromDate(date) {
  return date.getTime() / 86400000 + 25569;
}

// Reconstructs real calendar dates for the Week column from AS_OF (the
// latest week) walking back 7 days at a time — the same cadence the real
// workbook uses.
function weekDatesFor(weeks, asOf) {
  const last = new Date(`${asOf}T00:00:00Z`);
  return weeks.map((_, i) => {
    const d = new Date(last);
    d.setUTCDate(d.getUTCDate() - (weeks.length - 1 - i) * 7);
    return d;
  });
}

// `range` pins every department to the exact same {from, to} window (the
// sales department's own range, chosen by the caller) — without this, each
// department would independently resolve its own "last 12 weeks ending at
// its latest data," which can drift out of alignment with the others once
// departments don't all share the same data span.
function buildHeaderRows(range) {
  const row1 = [null];
  const row2 = ["Week "];
  const columnPlan = []; // { col, metric, subLabel, key? }

  for (const departmentKey of DEPARTMENT_KEYS) {
    // The CURRENT active data (uploaded snapshot, or seed if none) — never
    // bare seed, so re-downloading this template reflects what's actually
    // live, not stale demo numbers a re-upload would silently overwrite.
    const catalog = repository.getDepartmentData(departmentKey, range);
    for (const metric of catalog.METRICS) {
      const mapping = headingForSlug(metric.slug);
      if (!mapping) continue; // no known real-world heading for this metric yet

      if (mapping.kind === "single") {
        row1.push(mapping.heading, null);
        row2.push("Value", "Goal");
        columnPlan.push({ col: row1.length - 2, metric, role: "value" });
        columnPlan.push({ col: row1.length - 1, metric, role: "goal" });
      } else {
        const subLabels = Object.keys(mapping.seriesMap);
        row1.push(mapping.heading, ...subLabels.slice(1).map(() => null));
        row2.push(...subLabels);
        subLabels.forEach((subLabel, i) => {
          columnPlan.push({ col: row1.length - subLabels.length + i, metric, role: "series", seriesKey: mapping.seriesMap[subLabel] });
        });
        if (mapping.kind === "multiWithGoal") {
          row1.push(null);
          row2.push(mapping.goalSubLabel);
          columnPlan.push({ col: row1.length - 1, metric, role: "goal" });
        }
      }
    }
  }

  return { row1, row2, columnPlan };
}

function buildRawDataSheet() {
  const { WEEKS, WEEK_ENDINGS, AS_OF } = repository.getDepartmentData("sales");
  const range = { from: WEEK_ENDINGS[0], to: WEEK_ENDINGS[WEEK_ENDINGS.length - 1] };
  const { row1, row2, columnPlan } = buildHeaderRows(range);
  const dates = weekDatesFor(WEEKS, AS_OF);

  const rows = [row1, row2];
  for (let i = 0; i < WEEKS.length; i++) {
    const row = new Array(row1.length).fill(null);
    row[0] = excelSerialFromDate(dates[i]);
    for (const plan of columnPlan) {
      if (plan.role === "value") row[plan.col] = plan.metric.series[i] ?? null;
      else if (plan.role === "goal") row[plan.col] = plan.metric.goalSeries?.[i] ?? null;
      else if (plan.role === "series") row[plan.col] = plan.metric.series[i]?.[plan.seriesKey] ?? null;
    }
    rows.push(row);
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = row1.map(() => ({ wch: 14 }));
  return sheet;
}

async function buildCounterSheet() {
  const { total } = await counterService.getState();
  return XLSX.utils.aoa_to_sheet([[COUNTER_KEY, total]]);
}

// Pre-fills a workbook with the CURRENT active data (uploaded snapshot, or
// seed if none), shaped exactly like StyleCraft's real "Raw Data - Do Not
// Touch" export — so re-uploading it unchanged always validates clean.
async function generateTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildRawDataSheet(), RAW_DATA_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, await buildCounterSheet(), COUNTER_SHEET);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = { generateTemplateWorkbook };
