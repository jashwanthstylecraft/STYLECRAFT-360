import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseSheetExport, buildEntries, resolveWeekEnding, planSync } from "./sync-google-sheet.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A sanitized copy of a real "Data for Chart" tab export (10 rolling weeks,
// Jul-10 through Sep-11 2026) — same header structure, week labels, and
// which cells are blank vs. filled as the real sheet, but every business
// figure replaced with a synthetic, deterministic number (real company
// revenue/inventory/etc. figures never belong in version control). Column
// *positions* are what this suite actually verifies; the real numbers were
// cross-checked by hand against the app once, when the mapping was built.
const SAMPLE = fs.readFileSync(path.join(__dirname, "__fixtures__", "sheet-chart-tab-sample.txt"), "utf8");

describe("parseSheetExport", () => {
  it("finds all 10 rolling weeks in order", () => {
    const rows = parseSheetExport(SAMPLE);
    expect(rows.map((r) => r.week)).toEqual([
      "Jul-10", "Jul-17", "Jul-24", "Jul-31", "Aug-7", "Aug-14", "Aug-21", "Aug-28", "Sep-4", "Sep-11",
    ]);
  });
});

describe("resolveWeekEnding", () => {
  it("resolves a label in the same year as the anchor", () => {
    expect(resolveWeekEnding("Sep-11", "2026-09-04")).toBe("2026-09-11");
  });

  it("rolls the year forward across a Dec->Jan boundary", () => {
    expect(resolveWeekEnding("Jan-8", "2026-12-25")).toBe("2027-01-08");
  });

  it("rejects a label that doesn't land on a Friday", () => {
    expect(resolveWeekEnding("Sep-12", "2026-09-04")).toBeNull();
  });

  it("rejects a malformed label", () => {
    expect(resolveWeekEnding("not a date", "2026-09-04")).toBeNull();
  });
});

describe("buildEntries", () => {
  it("maps every resolvable column for the Sep-11 row, by exact position", () => {
    const rows = parseSheetExport(SAMPLE);
    const sep11 = rows.find((r) => r.week === "Sep-11");
    const { entries, skipped } = buildEntries(sep11.cells);

    // Simple value/goal metrics resolve to the raw sheet number.
    expect(entries["us-b2b-invoiced"]).toEqual({ value: 199000 });
    expect(entries["intl-b2b-invoiced"]).toEqual({ value: 463000 });
    // percentTopLevel metrics (stored as a $-prefixed fraction in the
    // sheet) come out as a whole percent number, matching what the
    // server's percent validator expects.
    expect(entries["weekly-gross-margin"]).toEqual({ value: 73 });
    // Multi-part metrics split the sheet's Value/Goal pair into the
    // metric's real two named sub-values.
    expect(entries["new-social-follow-subs.social"]).toEqual({ value: 441000 });
    expect(entries["new-social-follow-subs.klaviyo"]).toEqual({ value: 452000 });
    expect(entries["shipping-time-days.b2b"]).toEqual({ value: 0.71 });
    expect(entries["shipping-time-days.b2c"]).toEqual({ value: 0.72 });
    expect(entries["in-stock-percentage.orderFill"]).toEqual({ value: 0.81 });
    expect(entries["in-stock-percentage.skuAvail"]).toEqual({ value: 0.82 });
    expect(entries["preorders-backorders.preorder"]).toEqual({ value: 595000 });
    expect(entries["preorders-backorders.backorder"]).toEqual({ value: 606000 });

    // The fixture's Repair Rate cell is genuinely blank for this week
    // (preserved from the real sheet) — must be skipped, never guessed or
    // defaulted to 0.
    expect(entries["repair-rate"]).toBeUndefined();
    expect(skipped).toContain("repair-rate");

    // Never mapped, by design — see the comments in sync-google-sheet.js.
    expect(entries["website-sales"]).toBeUndefined();
    expect(entries["open-factory-pos"]).toBeUndefined();
  });

  it("never produces a goal field — the sync only ever writes results", () => {
    const rows = parseSheetExport(SAMPLE);
    const { entries } = buildEntries(rows[0].cells);
    for (const payload of Object.values(entries)) {
      expect(payload.goal).toBeUndefined();
    }
  });
});

describe("planSync", () => {
  it("plans exactly one new week when the anchor is one week behind", () => {
    const { toSync, unresolved } = planSync(SAMPLE, "2026-09-04");
    expect(toSync.map((s) => s.weekEnding)).toEqual(["2026-09-11"]);
    expect(unresolved).toEqual([]);
  });

  it("plans nothing when the anchor already matches the sheet's latest week", () => {
    const { toSync } = planSync(SAMPLE, "2026-09-11");
    expect(toSync).toEqual([]);
  });

  it("never plans a write for the anchor week itself or anything before it", () => {
    const { toSync } = planSync(SAMPLE, "2026-08-14");
    expect(toSync.every((s) => s.weekEnding > "2026-08-14")).toBe(true);
    expect(toSync.map((s) => s.weekEnding)).toEqual(["2026-08-21", "2026-08-28", "2026-09-04", "2026-09-11"]);
  });
});
