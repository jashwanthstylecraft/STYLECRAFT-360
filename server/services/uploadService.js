const XLSX = require("xlsx");
const fs = require("fs");
const os = require("os");
const path = require("path");
const repository = require("../data/repository");
const { toSparse } = require("../data/sparseFormat");
const counterService = require("./counterService");
const snapshotService = require("./snapshotService");
const { COUNTER_SHEET, COUNTER_KEY, DATA_SHEET, GRAPHS_SHEET, META_MARKER, FIXED_COLUMNS } = require("./xlsxSchema");
const { lookupHeading, normalizeHeading } = require("./xlsxHeadingMap");

// Local staging only — pending uploads are short-lived (1hr TTL) scratch
// state for the upload->preview->apply flow, separate from the Supabase-
// backed snapshot storage in repository.js/snapshotService.js. Lives under
// the OS temp dir (not a path inside the app itself) because on Vercel the
// deployed function bundle is read-only — only os.tmpdir() is writable.
// That does mean a pending upload isn't guaranteed to survive to a later
// request if Vercel routes it to a different cold instance; applyUpload()
// already handles a missing pending file gracefully ("this upload has
// expired... please upload again") rather than crashing, so the failure
// mode on Vercel is "re-upload," never data loss or corruption.
const UPLOADS_DIR = path.join(os.tmpdir(), "stylecraft-360-uploads");
const PENDING_DIR = path.join(UPLOADS_DIR, "pending");
const PENDING_TTL_MS = 60 * 60 * 1000;
const WEEK_COUNT = 10;
const RAW_DATA_SHEET_NAME = "Raw Data - Do Not Touch";
const DEPARTMENT_KEYS = ["sales", "inventory", "finance", "operations", "marketing", "customer-service"];

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(PENDING_DIR, { recursive: true });

// Omits a key entirely when its value is null/undefined (rather than
// setting it to undefined and relying on JSON.stringify to silently drop
// it) — a stored point that never had a given sub-series yet ({backorder:
// 0}, no `preorder` key at all) must compare EQUAL to a freshly-parsed point
// that explicitly nulls it out ({preorder: null, backorder: 0}); those are
// the same real-world fact ("not tracked that week"), and JSON.stringify
// treats an absent key and an undefined-valued key the same but a
// null-valued key differently, which used to make them compare unequal.
function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    const v = obj?.[key];
    if (v !== null && v !== undefined) out[key] = v;
  }
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

// ============================================================
// OLD format (Phase 1-6) — StyleCraft's real "Raw Data - Do Not Touch"
// export. One sheet, weeks as rows (col A, Excel date serials), metrics as
// column-groups with a 2-row header. Still fully supported on import
// (flagged with a deprecation warning), no longer written by this app.
// ============================================================

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

// Returns { metricsByDept, foundSlugs, weekLabels, weekEndings, dataSheetName }
// or { errors: [...] } if this workbook doesn't look like the old format at all.
function parseOldFormat(workbook, errors, warnings) {
  const dataSheetName = findRawDataSheetName(workbook);
  if (!dataSheetName) return null;

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[dataSheetName], { header: 1, defval: null, raw: true });
  const row1 = rows[0] ?? [];
  const row2 = rows[1] ?? [];
  const totalCols = Math.max(row1.length, row2.length);
  const groups = walkColumnGroups(row1, row2, totalCols);

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
    return { metricsByDept: null };
  }

  warnings.push({
    message: `This file uses the older workbook template — it still imports correctly, but "Download Excel" now produces a newer format (a "Graphs" + "Data" sheet pair). Re-download and re-save from there when convenient.`,
  });

  const firstRow = Math.max(2, lastRow - WEEK_COUNT + 1);
  const rowIndices = [];
  for (let r = firstRow; r <= lastRow; r++) rowIndices.push(r);

  const weekDates = rowIndices.map((r) => excelSerialToDate(rows[r][0]));
  const weekLabels = weekDates.map(formatWeekLabel);
  const weekEndings = weekDates.map((d) => d.toISOString().slice(0, 10));

  const metricsByDept = { sales: [], inventory: [], finance: [], operations: [], marketing: [], "customer-service": [] };
  const foundSlugs = { sales: new Set(), inventory: new Set(), finance: new Set(), operations: new Set(), marketing: new Set(), "customer-service": new Set() };

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

  return { metricsByDept, foundSlugs, weekLabels, weekEndings, dataSheetName };
}

// ============================================================
// NEW canonical format (Phase 8) — metrics as ROWS, weeks as COLUMNS. See
// shared schema constants in xlsxSchema.js: exportService.js/the Python
// chart-writer WRITE this shape, this is the one place that READS it back.
// ============================================================

function isBlankRow(row) {
  return !row || row.every((cell) => cell === null || cell === undefined || cell === "");
}

function parseCanonicalFormat(workbook, errors, warnings) {
  if (!workbook.SheetNames.includes(DATA_SHEET)) return null;
  const sheet = workbook.Sheets[DATA_SHEET];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const header = (rows[0] ?? []).map((h) => (h === null || h === undefined ? "" : String(h).trim()));
  if (header[0] !== FIXED_COLUMNS[0]) return null; // doesn't look like our canonical header — let the old-format parser try

  const weekEndings = header.slice(FIXED_COLUMNS.length).filter((h) => h !== "");
  const weekLabels = weekEndings.map((iso) => formatWeekLabel(new Date(`${iso}T00:00:00Z`)));

  const dataRows = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (isBlankRow(row)) break; // the separator before #meta ends the data block
    if (String(row[0] ?? "").trim() === META_MARKER) break;
    dataRows.push(row);
  }

  const bySlug = new Map();
  for (const row of dataRows) {
    const [slug, , department, series, rowType] = row;
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, { department, entries: [] });
    bySlug.get(slug).entries.push({
      series: series ? String(series).trim() : "",
      rowType: String(rowType ?? "").trim().toLowerCase(),
      values: row.slice(FIXED_COLUMNS.length, FIXED_COLUMNS.length + weekEndings.length),
    });
  }

  const metricsByDept = { sales: [], inventory: [], finance: [], operations: [], marketing: [], "customer-service": [] };
  const foundSlugs = { sales: new Set(), inventory: new Set(), finance: new Set(), operations: new Set(), marketing: new Set(), "customer-service": new Set() };

  for (const [slug, { department, entries }] of bySlug) {
    if (!DEPARTMENT_KEYS.includes(department)) {
      warnings.push({ message: `Row for "${slug}" has an unknown department "${department}" — skipped.` });
      continue;
    }
    const catalogMetric = repository.getSeedCatalog(department)?.METRICS.find((m) => m.slug === slug);
    if (!catalogMetric) {
      warnings.push({ department, message: `"${slug}" isn't a known metric — skipped.` });
      continue;
    }

    const context = { department, heading: catalogMetric.name };
    const seriesKeys = catalogMetric.stackKeys || catalogMetric.groupKeys;

    if (!seriesKeys) {
      const valueEntry = entries.find((e) => e.rowType === "value");
      const goalEntry = entries.find((e) => e.rowType === "goal");
      const series = (valueEntry?.values ?? weekEndings.map(() => null)).map((v, i) =>
        toNumberOrNull(v, errors, { ...context, subLabel: "value", week: weekLabels[i] })
      );
      const goalSeries = goalEntry
        ? goalEntry.values.map((v, i) => toNumberOrNull(v, errors, { ...context, subLabel: "goal", week: weekLabels[i] }))
        : catalogMetric.goalSeries;
      const goal = goalSeries ? goalSeries[goalSeries.length - 1] : catalogMetric.goal;
      metricsByDept[department].push({ ...catalogMetric, series, goalSeries, goal });
    } else {
      const seriesValues = {};
      let anyGoalEntry = null;
      for (const key of seriesKeys) {
        const valueEntry = entries.find((e) => e.series === key && e.rowType === "value");
        if (!valueEntry) {
          warnings.push({ department, message: `"${catalogMetric.name}" is missing its "${key}" row — that series will show no data.` });
          seriesValues[key] = weekEndings.map(() => null);
        } else {
          seriesValues[key] = valueEntry.values.map((v, i) => toNumberOrNull(v, errors, { ...context, subLabel: key, week: weekLabels[i] }));
        }
        anyGoalEntry = anyGoalEntry || entries.find((e) => e.series === key && e.rowType === "goal");
      }
      const series = weekEndings.map((_, i) => {
        const point = {};
        for (const key of seriesKeys) point[key] = seriesValues[key][i];
        return point;
      });
      const metric = { ...catalogMetric, series };
      if (anyGoalEntry) {
        const goalSeries = anyGoalEntry.values.map((v, i) => toNumberOrNull(v, errors, { ...context, subLabel: "goal", week: weekLabels[i] }));
        metric.goalSeries = goalSeries;
        metric.goal = goalSeries[goalSeries.length - 1];
      }
      metricsByDept[department].push(metric);
    }

    foundSlugs[department].add(slug);
  }

  return { metricsByDept, foundSlugs, weekLabels, weekEndings, dataSheetName: DATA_SHEET };
}

// ============================================================
// Format-agnostic tail — percent sanity check, diff preview, sparse
// conversion, "kept previous data" for untouched metrics. Runs identically
// no matter which parser above produced its input, so the two formats can
// never drift in how a value actually reaches storage.
// ============================================================

function finishParse({ metricsByDept, foundSlugs, weekLabels, weekEndings, dataSheetName }, errors, warnings, counterOverride) {
  const keptSparseByDept = { sales: [], inventory: [], finance: [], operations: [], marketing: [], "customer-service": [] };
  for (const departmentKey of DEPARTMENT_KEYS) {
    const sparseCurrentSource = repository.getSparseDepartmentData(departmentKey);
    for (const catalogMetric of repository.getSeedCatalog(departmentKey).METRICS) {
      if (foundSlugs[departmentKey].has(catalogMetric.slug)) continue;
      const currentSparse = sparseCurrentSource.METRICS.find((m) => m.slug === catalogMetric.slug);
      if (currentSparse) keptSparseByDept[departmentKey].push(currentSparse);
      warnings.push({ department: departmentKey, message: `Metric "${catalogMetric.name}" wasn't found in this workbook — kept its previous data.` });
    }
  }

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

  // Compared over the SAME span the upload actually covers, matched by ISO
  // weekEnding (never by display label): a bare no-range getDepartmentData()
  // call only returns its own default ~12-week window, which would silently
  // miss (never flag) an edit anywhere outside it — invisible with the old
  // format's narrow 10-week uploads, but very real once a workbook can cover
  // the full multi-year history. Labels are also ambiguous across a
  // multi-year span (repository.js drops the year suffix within one
  // calendar year, adds it back across several) — ISO dates never are.
  const preview = [];
  for (const departmentKey of DEPARTMENT_KEYS) {
    const currentData = repository.getDepartmentData(departmentKey, { from: weekEndings[0], to: weekEndings[weekEndings.length - 1] });
    let changedCount = 0;
    const examples = [];

    for (const metric of metricsByDept[departmentKey]) {
      const currentMetric = currentData.METRICS.find((m) => m.slug === metric.slug);
      if (!currentMetric) continue;
      const seriesKeys = metric.stackKeys || metric.groupKeys;

      weekEndings.forEach((iso, i) => {
        const oldIndex = currentData.WEEK_ENDINGS.indexOf(iso);
        if (oldIndex === -1) return;
        const oldRaw = currentMetric.series[oldIndex];
        const newRaw = metric.series[i];
        const oldValue = seriesKeys ? JSON.stringify(pick(oldRaw, seriesKeys)) : oldRaw;
        const newValue = seriesKeys ? JSON.stringify(pick(newRaw, seriesKeys)) : newRaw;
        const bothEmpty = seriesKeys ? isEmptyGroup(oldRaw, seriesKeys) && isEmptyGroup(newRaw, seriesKeys) : oldRaw == null && newRaw == null;
        if (oldValue !== newValue && !bothEmpty) {
          changedCount++;
          if (examples.length < 5) examples.push({ slug: metric.slug, week: weekLabels[i], oldValue: oldRaw, newValue: newRaw });
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

  // Graphs (Phase 8) carries no data of its own — native charts only, always
  // ignored on import regardless of which format matched.
  void GRAPHS_SHEET;

  const canonical = parseCanonicalFormat(workbook, errors, warnings);
  if (canonical) {
    if (!canonical.metricsByDept) return { ok: false, errors, warnings, preview: [], departments: {}, counterOverride };
    return finishParse(canonical, errors, warnings, counterOverride);
  }

  const old = parseOldFormat(workbook, errors, warnings);
  if (old) {
    if (!old.metricsByDept) return { ok: false, errors, warnings, preview: [], departments: {}, counterOverride };
    return finishParse(old, errors, warnings, counterOverride);
  }

  errors.push({
    message: `Couldn't find a recognizable data sheet (expected a "${DATA_SHEET}" sheet, or "${RAW_DATA_SHEET_NAME}"/any sheet whose first column is "Week"). Found sheets: ${workbook.SheetNames.join(", ")}.`,
  });
  return { ok: false, errors, warnings, preview: [], departments: {}, counterOverride };
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

async function applyUpload(uploadId, note) {
  const file = pendingFile(uploadId);
  if (!fs.existsSync(file)) {
    throw new Error("This upload has expired or was already applied — please upload the file again.");
  }
  const pending = JSON.parse(fs.readFileSync(file, "utf-8"));
  if (!pending.ok) {
    throw new Error("This upload still has validation errors and can't be applied.");
  }

  const meta = await snapshotService.commitSnapshot(pending.departments, {
    filename: pending.originalFilename,
    note: note || "",
    source: "Upload",
  });
  fs.unlinkSync(file);

  if (typeof pending.counterOverride === "number") {
    await counterService.setTotal(pending.counterOverride);
  }

  return meta;
}

module.exports = {
  parseWorkbook,
  receiveUpload,
  applyUpload,
  listVersions: snapshotService.listVersions,
  restoreVersion: snapshotService.restoreVersion,
  subscribeToDataUpdates: snapshotService.subscribeToDataUpdates,
};
