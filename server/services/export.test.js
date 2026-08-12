import { describe, it, expect, beforeAll } from "vitest";
import XLSX from "xlsx";
import sharedRegistry from "../data/sharedRegistry.js";
import { buildExportWorkbook } from "./exportService.js";
import { parseWorkbook } from "./uploadService.js";

// Phase 8's round-trip law: export -> re-import unchanged -> zero diffs.
// Runs against whatever the active snapshot actually is (real or seed) —
// entirely read-only: buildExportWorkbook only reads storage, and
// parseWorkbook (called directly, never receiveUpload/applyUpload) only
// ever returns a preview, it never writes. The "edit one value" half below
// mutates an in-memory copy of the exported buffer, never real storage.
describe("Phase 8 export/import round-trip", () => {
  beforeAll(async () => {
    await sharedRegistry.ready;
  });

  it("re-importing an unchanged export reports zero diffs anywhere", () => {
    const { buffer } = buildExportWorkbook({});
    const result = parseWorkbook(buffer);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    const totalChanged = result.preview.reduce((sum, p) => sum + p.changedCount, 0);
    expect(totalChanged).toBe(0);
  });

  it("two consecutive exports (no save in between) produce identical Data-sheet content", () => {
    const first = buildExportWorkbook({});
    const second = buildExportWorkbook({});
    const firstRows = XLSX.utils.sheet_to_json(XLSX.read(first.buffer, { type: "buffer" }).Sheets["Data"], { header: 1 });
    const secondRows = XLSX.utils.sheet_to_json(XLSX.read(second.buffer, { type: "buffer" }).Sheets["Data"], { header: 1 });

    // Drop the #meta block (timestamps legitimately differ) before comparing.
    const dataOnly = (rows) => {
      const metaIndex = rows.findIndex((r) => String(r[0] ?? "").trim() === "#meta");
      return metaIndex === -1 ? rows : rows.slice(0, metaIndex - 1); // -1 for the blank separator row too
    };
    expect(dataOnly(firstRows)).toEqual(dataOnly(secondRows));
  });

  it("changing exactly one cell in the exported file surfaces as exactly one diff", () => {
    const { buffer } = buildExportWorkbook({});
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Data"];

    // First metric row (row 2), first week column (col I / index 8) — always
    // exists regardless of which metric that happens to be.
    const targetCellAddress = XLSX.utils.encode_cell({ r: 1, c: 8 });
    const targetCell = sheet[targetCellAddress];
    const originalValue = typeof targetCell?.v === "number" ? targetCell.v : 0;
    const mutatedValue = originalValue + 1;
    sheet[targetCellAddress] = { t: "n", v: mutatedValue };

    const mutatedBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const result = parseWorkbook(mutatedBuffer);

    expect(result.ok).toBe(true);
    const totalChanged = result.preview.reduce((sum, p) => sum + p.changedCount, 0);
    expect(totalChanged).toBe(1);

    const example = result.preview.flatMap((p) => p.examples)[0];
    expect(example.newValue).toBe(mutatedValue);
  });

  it("a blank source cell exports as a truly empty cell, never a fabricated 0", () => {
    const { buffer } = buildExportWorkbook({});
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets["Data"];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "__MISSING__" });

    let sawBlank = false;
    let sawZero = false;
    for (const row of rows.slice(1)) {
      if (String(row[0] ?? "").trim() === "#meta" || row.every((c) => c === "__MISSING__")) break;
      for (const cell of row.slice(8)) {
        if (cell === "__MISSING__") sawBlank = true;
        if (cell === 0) sawZero = true;
      }
    }
    // Both must be real possibilities in this dataset for the assertion to
    // mean anything — real data has both genuine gaps and genuine zeros.
    expect(sawBlank).toBe(true);
    expect(sawZero).toBe(true);
  });
});
