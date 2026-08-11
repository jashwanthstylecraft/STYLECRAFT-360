const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const repository = require("../data/repository");
const { toSparse } = require("../data/sparseFormat");
const counterService = require("./counterService");
const snapshotService = require("./snapshotService");
const { COUNTER_SHEET, COUNTER_KEY } = require("./xlsxSchema");
const { lookupHeading, normalizeHeading } = require("./xlsxHeadingMap");

const { UPLOADS_DIR } = repository;
const PENDING_DIR = path.join(UPLOADS_DIR, "pending");
const PENDING_TTL_MS = 60 * 60 * 1000;
const WEEK_COUNT = 10;
const RAW_DATA_SHEET_NAME = "Raw Data - Do Not Touch";
const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations"];

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(PENDING_DIR, { recursive: true });

function pick(obj, keys) {
  const out = {};
  for (const key of keys) out[key] = obj?.[key];
  return out;
}

// A week is "empty" for a group/stacked metric whether it's entirely absent
// from sparse storage (oldRaw === null) or present with every sub-series
// null (a freshly-parsed workbook row always builds an object, even for a
// week with no data at all) — both mean "no data that week," so the diff
// below must not treat one shape as a "change" from the other.
function isEmptyGroup(raw, seriesKeys) {
  if (raw == null) return true;
  return seriesKeys.every((key) => raw[key] === null || raw[key] === undefined);
}

// ---- StyleCraft's real workbook format ----
// One sheet ("Raw Data - Do Not Touch"), weeks as rows (col A, Excel date
// serials), metrics as column-groups with a 2-row header: row 1 names the
// metric (spanning its columns), row 2 sub-labels each column ("Value",
// "Goal", or a series name like "SC"/"Gamma"). xlsxHeadingMap.js translates
// their exact headings to our department/slug/series-key model.

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function excelSerialToDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function formatWeekLabel(date) {
  return `${MONTH_ABBR[date.getUTCMonth()]}-${date.getUTCDate()}`;
}

function findRawDataSheetName(workbook) {
  if (workbook.SheetNames.includes(RAW_DATA_SHEET_NAME)) return RAW_DATA_SHEET_NAME;
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null });
    const candidate = normalizeHeading(rows[1]?.[0]).toLowerCase();
    if (candidate.startsWith("week")) return name;
  }
  return null;
}

// Groups columns 1..N by their row-1 heading. A column belongs to the
// current group as long as row 1 stays blank and row 2 has a sub-label; a
// fully blank column (both rows null) is a spacer and ends the group.
function walkColumnGroups(row1, row2, totalCols) {
  const groups = [];
  let c = 1;
  while (c < totalCols) {
    const heading = row1[c];
    if (heading === null || heading === undefined || heading === "") {
      c++;
      continue;
    }
    const cols = [];
    let next = c;
    while (next < totalCols) {
      const isNewGroupStart = next !== c && row1[next] !== null && row1[next] !== undefined && row1[next] !== "";
      if (isNewGroupStart) break;
      const subLabel = row2[next];
      if (subLabel === null || subLabel === undefined || subLabel === "") {
        if (next === c) {
          next++;
          continue;
        }
        break;
      }
      cols.push({ col: next, subLabel });
      next++;
    }
    groups.push({ heading, cols });
    c = Math.max(next, c + 1);
  }
  return groups;
}

function findColumnBySubLabel(cols, targetLabel) {
  const target = normalizeHeading(targetLabel).toLowerCase();
  return cols.find((c) => normalizeHeading(c.subLabel).toLowerCase() === target)?.col;
}

// The sheet is pre-filled with dates (and sometimes goals) far into the
// future; "the last real week" is the last row where most metrics' actual
// VALUE columns (not their Goal columns) are populated.
function findLastReportedRowIndex(rows, valueColumns) {
  for (let r = rows.length - 1; r >= 2; r--) {
    const row = rows[r];
    if (!row) continue;
    let populated = 0;
    for (const col of valueColumns) {
      if (row[col] !== null && row[col] !== undefined && row[col] !== "") populated++;
    }
    if (populated >= valueColumns.length / 2) return r;
  }
  return -1;
}

function toNumberOrNull(cell, errors, context) {
  if (cell === null || cell === undefined || cell === "") return null;
  if (typeof cell !== "number" || !Number.isFinite(cell)) {
    errors.push({ department: context.department, message: `"${context.heading}" (${context.subLabel}), week ${context.week}: expected a number, found "${cell}".` });
    return null;
  }
  return cell;
}

function parseCounterSheet(sheet, warnings) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  for (const row of rows) {
    if (!row || row.length < 2 || row[0] === null) continue;
    if (String(row[0]).trim().toLowerCase() === COUNTER_KEY) {
      const value = row[1];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        warnings.push({ message: `Counter sheet's "${COUNTER_KEY}" value looks invalid — ignoring the counter override.` });
        return null;
      }
      return Math.round(value);
    }
  }
  return null;
}

function parseWorkbook(buffer) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err) {
    return {
      ok: false,
      errors: [{ message: `Could not read the file — is it a valid .xlsx workbook? (${err.message})` }],
      warnings: [],
      preview: [],
      departments: {},
      counterOverride: null,
    };
  }

  const errors = [];
  const warnings = [];

  const counterOverride = workbook.SheetNames.includes(COUNTER_SHEET)
    ? parseCounterSheet(workbook.Sheets[COUNTER_SHEET], warnings)
    : null;

  const dataSheetName = findRawDataSheetName(workbook);
  if (!dataSheetName) {
    errors.push({
      message: `Couldn't find the data sheet (expected "${RAW_DATA_SHEET_NAME}", or any sheet whose first column is "Week"). Found sheets: ${workbook.SheetNames.join(", ")}.`,
    });
    return { ok: false, errors, warnings, preview: [], departments: {}, counterOverride };
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dataSheetName], { header: 1, defval: null, raw: true });
  const row1 = rows[0] ?? [];
  const row2 = rows[1] ?? [];
  const totalCols = Math.max(row1.length, row2.length);
  const groups = walkColumnGroups(row1, row2, totalCols);

  // Resolve every group to a catalog metric up front, so we know which raw
  // "Value" columns to use for finding the last reported week.
  const resolved = [];
  for (const group of groups) {
    if (group.cols.length === 0) continue;
    const mapping = lookupHeading(group.heading);
    if (!mapping) {
      warnings.push({ message: `Unrecognized metric heading "${group.heading}" — skipped.` });
      continue;
    }
    const catalogMetric = repository.getSeedCatalog(mapping.department)?.METRICS.find((m) => m.slug === mapping.slug);
    if (!catalogMetric) {
      warnings.push({ message: `"${group.heading}" maps to an unknown internal metric ("${mapping.slug}") — skipped.` });
      continue;
    }
    resolved.push({ group, mapping, catalogMetric });
  }

  const anchorColumns = resolved.map(({ group, mapping }) => {
    if (mapping.kind === "single") return findColumnBySubLabel(group.cols, "Value");
    return group.cols[0]?.col;
  }).filter((c) => c !== undefined);

  const lastRow = findLastReportedRowIndex(rows, anchorColumns);
  if (lastRow === -1) {
    errors.push({ message: `Found the data sheet ("${dataSheetName}") but couldn't find any reported week — every value column is blank.` });
    return { ok: false, errors, warnings, preview: [], departments: {}, counterOverride };
  }

  const firstRow = Math.max(2, lastRow - WEEK_COUNT + 1);
  const rowIndices = [];
  for (let r = firstRow; r <= lastRow; r++) rowIndices.push(r);

  const weekDates = rowIndices.map((r) => excelSerialToDate(rows[r][0]));
  const weekLabels = weekDates.map(formatWeekLabel);
  const weekEndings = weekDates.map((d) => d.toISOString().slice(0, 10));

  const metricsByDept = { sales: [], inventory: [], finance: [], operations: [] };
  const foundSlugs = { sales: new Set(), inventory: new Set(), finance: new Set(), operations: new Set() };

  for (const { group, mapping, catalogMetric } of resolved) {
    const context = { department: mapping.department, heading: group.heading };

    if (mapping.kind === "single") {
      const valueCol = findColumnBySubLabel(group.cols, "Value");
      const goalCol = findColumnBySubLabel(group.cols, "Goal");
      if (valueCol === undefined) {
        warnings.push({ department: mapping.department, message: `"${group.heading}" has no "Value" column — skipped.` });
        continue;
      }
      const series = rowIndices.map((r, i) =>
        toNumberOrNull(rows[r][valueCol], errors, { ...context, subLabel: "Value", week: weekLabels[i] })
      );
      const goalSeries =
        goalCol !== undefined
          ? rowIndices.map((r, i) => toNumberOrNull(rows[r][goalCol], errors, { ...context, subLabel: "Goal", week: weekLabels[i] }))
          : catalogMetric.goalSeries;
      const goal = goalSeries ? goalSeries[goalSeries.length - 1] : catalogMetric.goal;

      metricsByDept[mapping.department].push({ ...catalogMetric, series, goalSeries, goal });
    } else {
      // "multi" and "multiWithGoal" both build a per-week object keyed by
      // our internal series names.
      const seriesValues = {};
      for (const [subLabel, ourKey] of Object.entries(mapping.seriesMap)) {
        const col = findColumnBySubLabel(group.cols, subLabel);
        if (col === undefined) {
          warnings.push({ department: mapping.department, message: `"${group.heading}" has no "${subLabel}" column — that series will show no data.` });
          seriesValues[ourKey] = rowIndices.map(() => null);
        } else {
          seriesValues[ourKey] = rowIndices.map((r, i) =>
            toNumberOrNull(rows[r][col], errors, { ...context, subLabel, week: weekLabels[i] })
          );
        }
      }
      const series = rowIndices.map((_, i) => {
        const point = {};
        for (const ourKey of Object.values(mapping.seriesMap)) point[ourKey] = seriesValues[ourKey][i];
        return point;
      });

      const metric = { ...catalogMetric, series };

      if (mapping.kind === "multiWithGoal") {
        const goalCol = findColumnBySubLabel(group.cols, mapping.goalSubLabel);
        const goalSeries =
          goalCol !== undefined
            ? rowIndices.map((r, i) => toNumberOrNull(rows[r][goalCol], errors, { ...context, subLabel: mapping.goalSubLabel, week: weekLabels[i] }))
            : catalogMetric.goalSeries;
        metric.goalSeries = goalSeries;
        metric.goal = goalSeries ? goalSeries[goalSeries.length - 1] : catalogMetric.goal;
      }

      metricsByDept[mapping.department].push(metric);
    }

    foundSlugs[mapping.department].add(catalogMetric.slug);
  }

  // Any catalog metric this workbook didn't touch keeps whatever sparse data
  // is currently active, rather than disappearing or reverting to bare seed.
  // Pulled straight from sparse storage (not re-aligned to this upload's
  // week window) since the metric's real data may span an entirely
  // different date range than this workbook's rows.
  const keptSparseByDept = { sales: [], inventory: [], finance: [], operations: [] };
  for (const departmentKey of DEPARTMENT_KEYS) {
    const sparseCurrentSource = repository.getSparseDepartmentData(departmentKey);
    for (const catalogMetric of repository.getSeedCatalog(departmentKey).METRICS) {
      if (foundSlugs[departmentKey].has(catalogMetric.slug)) continue;
      const currentSparse = sparseCurrentSource.METRICS.find((m) => m.slug === catalogMetric.slug);
      if (currentSparse) keptSparseByDept[departmentKey].push(currentSparse);
      warnings.push({ department: departmentKey, message: `Metric "${catalogMetric.name}" wasn't found in this workbook — kept its previous data.` });
    }
  }

  // Percent sanity range check (values should be fractions: 0.49, not 49).
  for (const departmentKey of DEPARTMENT_KEYS) {
    for (const metric of metricsByDept[departmentKey]) {
      if (metric.format !== "percent" && metric.chartType !== "percentBar") continue;
      const flatValues = metric.headerValues && metric.groupKeys
        ? metric.series.flatMap((point) => metric.groupKeys.map((k) => point[k]))
        : metric.series;
      const outOfRange = flatValues.some((v) => v !== null && v !== undefined && (v < 0 || v > 1.5));
      if (outOfRange) {
        warnings.push({
          department: departmentKey,
          message: `"${metric.name}" has a value outside the expected 0–150% range for a percentage metric.`,
        });
      }
    }
  }

  // Diff preview vs. whatever is currently active, matched by week label.
  const preview = [];
  for (const departmentKey of DEPARTMENT_KEYS) {
    const currentData = repository.getDepartmentData(departmentKey);
    let changedCount = 0;
    const examples = [];

    for (const metric of metricsByDept[departmentKey]) {
      const currentMetric = currentData.METRICS.find((m) => m.slug === metric.slug);
      if (!currentMetric) continue;
      const seriesKeys = metric.stackKeys || metric.groupKeys;

      weekLabels.forEach((week, i) => {
        const oldIndex = currentData.WEEKS.indexOf(week);
        if (oldIndex === -1) return;
        const oldRaw = currentMetric.series[oldIndex];
        const newRaw = metric.series[i];
        const oldValue = seriesKeys ? JSON.stringify(pick(oldRaw, seriesKeys)) : oldRaw;
        const newValue = seriesKeys ? JSON.stringify(pick(newRaw, seriesKeys)) : newRaw;
        const bothEmpty = seriesKeys ? isEmptyGroup(oldRaw, seriesKeys) && isEmptyGroup(newRaw, seriesKeys) : oldRaw == null && newRaw == null;
        if (oldValue !== newValue && !bothEmpty) {
          changedCount++;
          if (examples.length < 5) examples.push({ slug: metric.slug, week, oldValue: oldRaw, newValue: newRaw });
        }
      });
    }

    preview.push({
      department: departmentKey,
      sheetName: dataSheetName,
      metricsFound: foundSlugs[departmentKey].size,
      weeksFound: weekLabels.length,
      changedCount,
      examples,
    });
  }

  // Persisted storage is sparse (ISO weekEnding -> value) — see
  // server/data/sparseFormat.js. This upload's own rows convert from
  // positional via the real per-row dates; metrics kept from the previous
  // snapshot are already sparse and pass through untouched.
  const departments = {};
  if (errors.length === 0) {
    for (const departmentKey of DEPARTMENT_KEYS) {
      const uploadedSparse = metricsByDept[departmentKey].map((metric) => {
        const sparse = toSparse(metric, weekEndings);
        const clean = { slug: sparse.slug, values: sparse.values };
        if (sparse.goals) clean.goals = sparse.goals;
        return clean;
      });
      departments[departmentKey] = { METRICS: [...uploadedSparse, ...keptSparseByDept[departmentKey]] };
    }
  }

  return { ok: errors.length === 0, errors, warnings, preview, departments, counterOverride };
}

// ---- pending uploads (parsed-but-not-applied) ----
function pendingFile(uploadId) {
  return path.join(PENDING_DIR, `${uploadId}.json`);
}

function prunePendingUploads() {
  const now = Date.now();
  for (const file of fs.readdirSync(PENDING_DIR)) {
    const full = path.join(PENDING_DIR, file);
    if (now - fs.statSync(full).mtimeMs > PENDING_TTL_MS) fs.unlinkSync(full);
  }
}

function receiveUpload(buffer, originalFilename) {
  prunePendingUploads();
  const parsed = parseWorkbook(buffer);
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(pendingFile(uploadId), JSON.stringify({ ...parsed, originalFilename }));
  return { uploadId, ...parsed };
}

function applyUpload(uploadId, note) {
  const file = pendingFile(uploadId);
  if (!fs.existsSync(file)) {
    throw new Error("This upload has expired or was already applied — please upload the file again.");
  }
  const pending = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!pending.ok) {
    throw new Error("This upload still has validation errors and can't be applied.");
  }

  const meta = snapshotService.commitSnapshot(pending.departments, {
    filename: pending.originalFilename,
    note: note || "",
    source: "Upload",
  });
  fs.unlinkSync(file);

  if (typeof pending.counterOverride === "number") {
    counterService.setTotal(pending.counterOverride);
  }

  return meta;
}

module.exports = {
  receiveUpload,
  applyUpload,
  listVersions: snapshotService.listVersions,
  restoreVersion: snapshotService.restoreVersion,
  subscribeToDataUpdates: snapshotService.subscribeToDataUpdates,
};
