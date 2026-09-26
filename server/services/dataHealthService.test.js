import { describe, it, expect } from "vitest";
import { computeFindings, FLATLINE_MIN_RUN } from "./dataHealthService.js";

// Synthetic registry + sparse data — no dependency on the live registry or
// a Supabase-backed repository, matching how the real checkDataHealth()
// composes computeFindings with the live modules.
function metric(overrides) {
  return { department: "test", format: "currency", ...overrides };
}

function sparseWithValues(values, goals) {
  return { values, ...(goals ? { goals } : {}) };
}

describe("computeFindings — flatlined", () => {
  it("flags a single-series metric whose trailing run reaches the minimum", () => {
    const registryMetric = metric({ slug: "flat-metric", name: "Flat Metric" });
    const sparse = sparseWithValues({
      "2026-08-01": 100,
      "2026-08-08": 91,
      "2026-08-15": 91,
      "2026-08-22": 91,
    });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([
      {
        type: "flatlined",
        department: "test",
        slug: "flat-metric",
        subKey: null,
        name: "Flat Metric",
        format: "currency",
        value: 91,
        weeks: 3,
        latestWeekEnding: "2026-08-22",
      },
    ]);
  });

  it("does not flag a run shorter than the minimum", () => {
    const registryMetric = metric({ slug: "short-run", name: "Short Run" });
    const sparse = sparseWithValues({
      "2026-08-01": 100,
      "2026-08-08": 91,
      "2026-08-15": 91,
    });
    expect(FLATLINE_MIN_RUN).toBe(3); // this test assumes the current threshold
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([]);
  });

  it("breaks the run at a missing week rather than skipping over it", () => {
    const registryMetric = metric({ slug: "gap-metric", name: "Gap Metric" });
    const sparse = sparseWithValues({
      "2026-08-01": 91,
      // 2026-08-08 missing entirely — not reported that week
      "2026-08-15": 91,
      "2026-08-22": 91,
    });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    // Only 2 consecutive REAL entries at the end (08-15, 08-22) — below threshold.
    expect(findings).toEqual([]);
  });

  it("flags a multi-series metric's specific sub-key, labeled AND formatted from its headerValues entry", () => {
    // in-stock-percentage's real registry entry has no top-level `format`
    // at all — only headerValues carries one, per sub-key. A fallback to a
    // generic default here would render a percent value with a dollar
    // sign, which is exactly the bug this test guards against.
    const registryMetric = metric({
      slug: "multi-metric",
      name: "In-Stock Percentage %",
      format: undefined,
      headerValues: [
        { label: "Order Fill %", format: "percent" },
        { label: "SKU Avail %", format: "percent" },
      ],
    });
    const sparse = sparseWithValues({
      "2026-08-01": { orderFill: 0.8, skuAvail: 0.91 },
      "2026-08-08": { orderFill: 0.82, skuAvail: 0.91 },
      "2026-08-15": { orderFill: 0.79, skuAvail: 0.91 },
    });
    const seriesKeysFor = () => ["orderFill", "skuAvail"];
    const findings = computeFindings([registryMetric], () => sparse, seriesKeysFor);
    expect(findings).toEqual([
      {
        type: "flatlined",
        department: "test",
        slug: "multi-metric",
        subKey: "skuAvail",
        name: "In-Stock Percentage % — SKU Avail %",
        format: "percent",
        value: 0.91,
        weeks: 3,
        latestWeekEnding: "2026-08-15",
      },
    ]);
  });

  it("only reports the streak still standing as of the latest week, not an old one that's since moved on", () => {
    const registryMetric = metric({ slug: "recovered", name: "Recovered Metric" });
    const sparse = sparseWithValues({
      "2026-08-01": 91,
      "2026-08-08": 91,
      "2026-08-15": 91,
      "2026-08-22": 105, // broke the streak — no longer flat as of the latest data
    });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([]);
  });
});

describe("computeFindings — matchesGoal", () => {
  it("flags a week where the value exactly equals that week's goal", () => {
    const registryMetric = metric({ slug: "goal-match", name: "Goal Match", format: "currency" });
    const sparse = sparseWithValues(
      { "2026-09-04": 20100000, "2026-09-11": 14154666 },
      { "2026-09-04": 14154667, "2026-09-11": 14154666 }
    );
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([
      {
        type: "matchesGoal",
        department: "test",
        slug: "goal-match",
        subKey: null,
        name: "Goal Match",
        format: "currency",
        occurrences: [{ weekEnding: "2026-09-11", value: 14154666 }],
      },
    ]);
  });

  it("groups every matching week for the same metric into one finding, not one per week", () => {
    const registryMetric = metric({ slug: "gross-margin", name: "Weekly Gross Margin", format: "percent" });
    const sparse = sparseWithValues(
      { "2026-01-01": 0.55, "2026-02-01": 0.55, "2026-03-01": 0.6 },
      { "2026-01-01": 0.55, "2026-02-01": 0.55, "2026-03-01": 0.65 }
    );
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toHaveLength(1);
    expect(findings[0].occurrences).toEqual([
      { weekEnding: "2026-01-01", value: 0.55 },
      { weekEnding: "2026-02-01", value: 0.55 },
    ]);
  });

  it("never flags a goal of exactly 0 — that's unset-or-legitimate, not corruption", () => {
    const registryMetric = metric({ slug: "zero-goal", name: "Zero Goal", format: "currency" });
    const sparse = sparseWithValues({ "2026-01-01": 0 }, { "2026-01-01": 0 });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([]);
  });

  it("never flags a count-format metric — small-integer coincidental matches are common and meaningless", () => {
    const registryMetric = metric({ slug: "count-metric", name: "Guru Cards Created", format: "count" });
    const sparse = sparseWithValues({ "2026-01-01": 5 }, { "2026-01-01": 5 });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([]);
  });

  it("does not flag a week where the value simply differs from the goal", () => {
    const registryMetric = metric({ slug: "no-match", name: "No Match", format: "currency" });
    const sparse = sparseWithValues({ "2026-01-01": 100 }, { "2026-01-01": 200 });
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings).toEqual([]);
  });
});

describe("computeFindings — general", () => {
  it("skips a registry metric with no corresponding sparse data at all", () => {
    const registryMetric = metric({ slug: "missing", name: "Missing" });
    const findings = computeFindings([registryMetric], () => undefined, () => null);
    expect(findings).toEqual([]);
  });

  it("returns both a flatlined and a matchesGoal finding for the same metric when both apply", () => {
    const registryMetric = metric({ slug: "both", name: "Both", format: "currency" });
    const sparse = sparseWithValues(
      { "2026-01-01": 14154666, "2026-01-08": 14154666, "2026-01-15": 14154666 },
      { "2026-01-15": 14154666 }
    );
    const findings = computeFindings([registryMetric], () => sparse, () => null);
    expect(findings.map((f) => f.type).sort()).toEqual(["flatlined", "matchesGoal"]);
  });
});
