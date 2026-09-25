import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseSheetExport, buildEntries, resolveWeekEnding, planSync, planSyncFromRows, checkTargetLineDrift } from "./sync-google-sheet.js";

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

    // Website Sales' "stylecraft" sub-value: the sheet stores this one in
    // THOUSANDS ("23" means $23,000), confirmed against real already-
    // entered weeks — see SCALED_SUBKEY_METRICS' comment. The fixture cell
    // is "23", so the entry should come out scaled to 23000.
    expect(entries["website-sales.stylecraft"]).toEqual({ value: 23000 });
    // gammaPlus has no source column at all — never written.
    expect(entries["website-sales.gammaPlus"]).toBeUndefined();

    // The fixture's Repair Rate cell is genuinely blank for this week
    // (preserved from the real sheet) — must be skipped, never guessed or
    // defaulted to 0.
    expect(entries["repair-rate"]).toBeUndefined();
    expect(skipped).toContain("repair-rate");

    // Open Factory P.O.s' paid/unpaid split (ValueF/ValueG, cols 12/14) —
    // fixture cells are "309,000" and "331,000".
    expect(entries["open-factory-pos.paid"]).toEqual({ value: 309000 });
    expect(entries["open-factory-pos.unpaid"]).toEqual({ value: 331000 });
  });

  it("never produces a goal field for any metric outside GOAL_SYNC_METRICS", () => {
    const rows = parseSheetExport(SAMPLE);
    const { entries } = buildEntries(rows[0].cells);
    for (const [entryKey, payload] of Object.entries(entries)) {
      // The two confirmed per-week goal columns — see the dedicated tests below.
      if (entryKey === "website-sales" || entryKey === "open-factory-pos") continue;
      expect(payload.goal).toBeUndefined();
    }
  });

  it("adds Website Sales' goal from the Web Ad Sales Goals column (BC, col 54) when none exists yet", () => {
    const rows = parseSheetExport(SAMPLE);
    const sep11 = rows.find((r) => r.week === "Sep-11");
    const { entries } = buildEntries(sep11.cells, { "website-sales": null });
    // Same thousands-shorthand scale as the value column — fixture cell is
    // "771,000", so the entry should come out scaled to 771,000,000.
    expect(entries["website-sales"]).toEqual({ goal: 771000000 });
  });

  it("skips Website Sales' goal when the week already has one — additive only, never overwrites a pre-filled goal", () => {
    const rows = parseSheetExport(SAMPLE);
    const sep11 = rows.find((r) => r.week === "Sep-11");
    const { entries } = buildEntries(sep11.cells, { "website-sales": 53000 });
    expect(entries["website-sales"]).toBeUndefined();
  });

  it("adds Open Factory P.O.s' goal from GoalF (col 13) when none exists yet — plain dollars, no scale", () => {
    const rows = parseSheetExport(SAMPLE);
    const sep11 = rows.find((r) => r.week === "Sep-11");
    const { entries } = buildEntries(sep11.cells, { "open-factory-pos": null });
    // Fixture cell is "320,000" — unlike Website Sales' BC column, this one
    // is already a plain dollar figure, not thousands-shorthand.
    expect(entries["open-factory-pos"]).toEqual({ goal: 320000 });
  });

  it("skips Open Factory P.O.s' goal when the week already has one", () => {
    const rows = parseSheetExport(SAMPLE);
    const sep11 = rows.find((r) => r.week === "Sep-11");
    const { entries } = buildEntries(sep11.cells, { "open-factory-pos": 14154667 });
    expect(entries["open-factory-pos"]).toBeUndefined();
  });
});

describe("checkTargetLineDrift", () => {
  const rows = parseSheetExport(SAMPLE);
  const sep11 = rows.find((r) => r.week === "Sep-11");
  // Fixture cells 51-55: "738,000", "749,000", "760,000", "771,000", "782,000".

  it("reports no drift when the registry's targetLine matches the sheet", () => {
    const drift = checkTargetLineDrift(sep11, {
      "in-stock-percentage": 738000,
      "shipping-time-days": 749000,
      "education-events": 760000,
      "new-social-follow-subs": 782000,
    });
    expect(drift).toEqual([]);
  });

  it("flags a metric whose registry targetLine has drifted from the sheet", () => {
    const drift = checkTargetLineDrift(sep11, {
      "in-stock-percentage": 0.95, // stale — sheet says 738000 (synthetic fixture value)
      "shipping-time-days": 749000,
      "education-events": 760000,
      "new-social-follow-subs": 782000,
    });
    expect(drift).toEqual([{ slug: "in-stock-percentage", sheetLabel: "in stock goal (AZ)", sheetValue: 738000, registryValue: 0.95 }]);
  });

  it("skips a metric with no registered targetLine rather than flagging it", () => {
    const drift = checkTargetLineDrift(sep11, { "in-stock-percentage": null });
    expect(drift).toEqual([]);
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

  it("passes each planned week's slug/weekEnding to getExistingGoal (for every GOAL_SYNC_METRICS entry) and includes the goal when it returns null", () => {
    const rows = parseSheetExport(SAMPLE);
    const calls = [];
    const { toSync } = planSyncFromRows(rows, "2026-09-04", (slug, weekEnding) => {
      calls.push([slug, weekEnding]);
      return null;
    });
    expect(calls).toEqual([
      ["website-sales", "2026-09-11"],
      ["open-factory-pos", "2026-09-11"],
    ]);
    expect(toSync[0].entries["website-sales"]).toEqual({ goal: 771000000 });
    expect(toSync[0].entries["open-factory-pos"]).toEqual({ goal: 320000 });
  });

  it("omits the goal when getExistingGoal reports one already set for that week", () => {
    const rows = parseSheetExport(SAMPLE);
    const { toSync } = planSyncFromRows(rows, "2026-09-04", () => 53000);
    expect(toSync[0].entries["website-sales"]).toBeUndefined();
    expect(toSync[0].entries["open-factory-pos"]).toBeUndefined();
  });
});
