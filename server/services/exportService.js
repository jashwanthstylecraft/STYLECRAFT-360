// Phase 8: builds the two-sheet (Data + Graphs) Excel export. Node's job is
// ONLY to gather the exact stored snapshot (no derived numbers, no
// aggregation) and hand a plain JSON spec to a Python/openpyxl child
// process, which is the one place that actually writes .xlsx bytes — see
// scripts/build_export_workbook.py for why (native chart objects aren't
// realistically writable from the `xlsx` package already in this repo).
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const XLSX = require("xlsx");
const repository = require("../data/repository");
const sharedRegistry = require("../data/sharedRegistry");
const { DEPARTMENT_ORDER, ROW_TYPE, DATA_SHEET } = require("./xlsxSchema");
const { humanizeKey } = require("./detailStats");

const PYTHON_SCRIPT = path.join(__dirname, "..", "scripts", "build_export_workbook.py");
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

function isPresent(v) {
  return v !== null && v !== undefined;
}

// Every ISO week that has a value OR a goal for ANY metric, anywhere —
// "ANY data" per the strictness contract, so a week with only a far-out
// goal entered still counts (it genuinely isn't empty).
function computeFullDataRange() {
  let min = null;
  let max = null;
  for (const departmentKey of DEPARTMENT_ORDER) {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    for (const metric of sparse.METRICS) {
      const isos = [...Object.keys(metric.values ?? {}), ...Object.keys(metric.goals ?? {})];
      for (const iso of isos) {
        if (!min || iso < min) min = iso;
        if (!max || iso > max) max = iso;
      }
    }
  }
  return { from: min, to: max };
}

function resolveWeekRange({ from, to }) {
  if (from && to) return { from, to };
  const full = computeFullDataRange();
  return { from: from || full.from, to: to || full.to };
}

// One metric's rows for the Data sheet — 1 value+goal pair for a
// single-series metric, or one value(+goal where the metric actually has
// one) pair PER series for a multi-series metric. Goal content is
// duplicated across a multi-series metric's series rows when the goal is
// metric-level (not truly per-series) rather than split arbitrarily —
// there is no per-series goal in the source data to split it from.
function buildRowsForMetric(registryMetric, sparseMetric, departmentKey, weekEndings) {
  const rows = [];
  const goalLabel = registryMetric.goalLabel || "Goal";
  const goalDirection = registryMetric.goalDirection || "higher";
  const aggregation = registryMetric.aggregationMethod;
  const seriesKeys = sharedRegistry.seriesKeysFor(registryMetric);
  const baseFormat = registryMetric.format || "currency";

  function row(series, rowType, format, values) {
    return {
      metric_slug: registryMetric.slug,
      metric_name: registryMetric.name,
      department: departmentKey,
      series,
      row_type: rowType,
      goal_label: goalLabel,
      goal_direction: goalDirection,
      aggregation,
      format,
      values,
    };
  }

  if (!seriesKeys) {
    const values = weekEndings.map((iso) => (isPresent(sparseMetric?.values?.[iso]) ? sparseMetric.values[iso] : null));
    rows.push(row("", ROW_TYPE.VALUE, baseFormat, values));
    const goals = weekEndings.map((iso) => (isPresent(sparseMetric?.goals?.[iso]) ? sparseMetric.goals[iso] : null));
    rows.push(row("", ROW_TYPE.GOAL, baseFormat, goals));
    return rows;
  }

  const hasMetricGoal = Boolean(sparseMetric?.goals && Object.keys(sparseMetric.goals).length > 0);
  const seriesFormats = registryMetric.headerValues?.map((h) => h.format) ?? seriesKeys.map(() => baseFormat);

  seriesKeys.forEach((key, i) => {
    const format = seriesFormats[i] ?? baseFormat;
    const values = weekEndings.map((iso) => {
      const point = sparseMetric?.values?.[iso];
      return point && isPresent(point[key]) ? point[key] : null;
    });
    rows.push(row(key, ROW_TYPE.VALUE, format, values));

    if (hasMetricGoal) {
      const goals = weekEndings.map((iso) => (isPresent(sparseMetric?.goals?.[iso]) ? sparseMetric.goals[iso] : null));
      rows.push(row(key, ROW_TYPE.GOAL, format, goals));
    }
  });

  return rows;
}

function buildDataRows(weekEndings) {
  const rows = [];
  const chartMetrics = [];

  for (const departmentKey of DEPARTMENT_ORDER) {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    const registryMetrics = sharedRegistry.getDepartmentMetrics(departmentKey);

    for (const registryMetric of registryMetrics) {
      const sparseMetric = sparse.METRICS.find((m) => m.slug === registryMetric.slug);
      rows.push(...buildRowsForMetric(registryMetric, sparseMetric, departmentKey, weekEndings));

      chartMetrics.push({
        slug: registryMetric.slug,
        name: registryMetric.name,
        department: departmentKey,
        chartType: registryMetric.chartType,
        format: registryMetric.format || null,
        seriesKeys: sharedRegistry.seriesKeysFor(registryMetric),
        seriesLabels: registryMetric.headerValues?.map((h) => h.label) ?? null,
        seriesFormats: registryMetric.headerValues?.map((h) => h.format) ?? null,
      });
    }
  }

  return { rows, chartMetrics };
}

function buildExportWorkbook({ from, to } = {}) {
  const range = resolveWeekRange({ from, to });
  if (!range.from || !range.to) {
    throw new Error("No data has been entered anywhere yet — nothing to export.");
  }
  const weeks = sharedRegistry.generateWeeks(range.from, range.to);
  const weekEndings = weeks.map((w) => w.weekEnding);

  const { rows, chartMetrics } = buildDataRows(weekEndings);
  const activeMeta = repository.getActiveSnapshotMeta();

  const spec = {
    weeks: weekEndings,
    rows,
    chartMetrics,
    meta: {
      exportedAt: new Date().toISOString(),
      appVersion: "StyleCraft 360",
      snapshotVersion: activeMeta?.file ?? "seed",
      snapshotAppliedAt: activeMeta?.appliedAt ?? null,
      weekRangeFrom: range.from,
      weekRangeTo: range.to,
      rowCount: rows.length,
      metricCount: chartMetrics.length,
    },
  };

  const tmpDir = os.tmpdir();
  const token = crypto.randomBytes(8).toString("hex");
  const specPath = path.join(tmpDir, `stylecraft-export-${token}.json`);
  const outputPath = path.join(tmpDir, `stylecraft-export-${token}.xlsx`);
  fs.writeFileSync(specPath, JSON.stringify(spec));

  try {
    const result = spawnSync(PYTHON_BIN, [PYTHON_SCRIPT, specPath, outputPath], { encoding: "utf-8" });
    if (result.error) {
      throw new Error(`Could not start Python (${PYTHON_BIN}): ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`Workbook generation failed: ${result.stderr || result.stdout || "unknown error"}`);
    }
    const buffer = fs.readFileSync(outputPath);
    const timestamp = new Date();
    const stamp = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}_${String(timestamp.getHours()).padStart(2, "0")}${String(timestamp.getMinutes()).padStart(2, "0")}`;
    return { buffer, filename: `StyleCraft360_Data_${stamp}.xlsx` };
  } finally {
    fs.rm(specPath, { force: true }, () => {});
    fs.rm(outputPath, { force: true }, () => {});
  }
}

// One column per metric/series/Value-or-Goal combination, each holding one
// value per week — the transpose of buildDataRows' shape (which is one ROW
// per metric/series/type, one COLUMN per week). "<Metric Name> Value" /
// "<Metric Name> <Goal Label>" for a single-series metric; "<Metric Name>
// <Series Label> Value"/"...  <Goal Label>" per series for a multi-series
// one, skipping the Goal column entirely when that metric has no real
// per-week goal at all (mirrors buildRowsForMetric's hasMetricGoal check).
function buildTransposedColumns(weekEndings) {
  const columns = [];

  for (const departmentKey of DEPARTMENT_ORDER) {
    const sparse = repository.getSparseDepartmentData(departmentKey);
    const registryMetrics = sharedRegistry.getDepartmentMetrics(departmentKey);

    for (const registryMetric of registryMetrics) {
      const sparseMetric = sparse.METRICS.find((m) => m.slug === registryMetric.slug);
      const seriesKeys = sharedRegistry.seriesKeysFor(registryMetric);
      const goalLabel = registryMetric.goalLabel || "Goal";

      if (!seriesKeys) {
        columns.push({
          header: `${registryMetric.name} Value`,
          values: weekEndings.map((iso) => (isPresent(sparseMetric?.values?.[iso]) ? sparseMetric.values[iso] : null)),
        });
        columns.push({
          header: `${registryMetric.name} ${goalLabel}`,
          values: weekEndings.map((iso) => (isPresent(sparseMetric?.goals?.[iso]) ? sparseMetric.goals[iso] : null)),
        });
        continue;
      }

      const hasMetricGoal = Boolean(sparseMetric?.goals && Object.keys(sparseMetric.goals).length > 0);
      seriesKeys.forEach((key, i) => {
        const label = registryMetric.headerValues?.[i]?.label ?? humanizeKey(key);
        columns.push({
          header: `${registryMetric.name} ${label} Value`,
          values: weekEndings.map((iso) => {
            const point = sparseMetric?.values?.[iso];
            return point && isPresent(point[key]) ? point[key] : null;
          }),
        });
        if (hasMetricGoal) {
          columns.push({
            header: `${registryMetric.name} ${label} ${goalLabel}`,
            values: weekEndings.map((iso) => (isPresent(sparseMetric?.goals?.[iso]) ? sparseMetric.goals[iso] : null)),
          });
        }
      });
    }
  }

  return columns;
}

// A pure-JS, chart-free alternative to buildExportWorkbook, written with
// the `xlsx` package already in this repo instead of spawning Python — no
// native chart objects (still Python-only — see this file's header
// comment), but this runs everywhere buildExportWorkbook can't, serverless
// platforms like Vercel included, which is the whole reason this is its
// own function rather than a fallback bolted onto buildExportWorkbook.
//
// Transposed relative to the canonical Data-sheet schema (FIXED_COLUMNS):
// one ROW per week (numbered #1, #2, #3... for easy reference, plus the
// real week-ending date), one COLUMN per metric/series/Value-or-Goal — the
// layout most people expect to pivot or chart straight from in Excel.
function buildDataOnlyWorkbook({ from, to } = {}) {
  const range = resolveWeekRange({ from, to });
  if (!range.from || !range.to) {
    throw new Error("No data has been entered anywhere yet — nothing to export.");
  }
  const weeks = sharedRegistry.generateWeeks(range.from, range.to);
  const weekEndings = weeks.map((w) => w.weekEnding);
  const columns = buildTransposedColumns(weekEndings);

  const header = ["#", "Week Ending", ...columns.map((c) => c.header)];
  const aoa = [header, ...weekEndings.map((iso, i) => [i + 1, iso, ...columns.map((c) => c.values[i])])];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, DATA_SHEET);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const timestamp = new Date();
  const stamp = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, "0")}-${String(timestamp.getDate()).padStart(2, "0")}_${String(timestamp.getHours()).padStart(2, "0")}${String(timestamp.getMinutes()).padStart(2, "0")}`;
  return { buffer, filename: `StyleCraft360_Data_${stamp}.xlsx` };
}

module.exports = { buildExportWorkbook, buildDataOnlyWorkbook, computeFullDataRange, buildDataRows };
