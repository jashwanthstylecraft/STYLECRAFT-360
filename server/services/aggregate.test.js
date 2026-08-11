import { describe, it, expect } from "vitest";
import { aggregate, aggregateMetricSeries, applyPeriodToDepartment } from "./aggregate.js";

// Ground truth verified via real Date arithmetic (not hand-counted):
// March 2024 has 5 Fridays, April 2024 has 4, February 2024 has 4.
const MARCH_2024_FRIDAYS = ["2024-03-01", "2024-03-08", "2024-03-15", "2024-03-22", "2024-03-29"];
const APRIL_2024_FRIDAYS = ["2024-04-05", "2024-04-12", "2024-04-19", "2024-04-26"];

describe("aggregate — weekly passthrough", () => {
  it("returns one group per week, never partial", () => {
    const result = aggregate([10, 20, 30], MARCH_2024_FRIDAYS.slice(0, 3), "weekly", "sum");
    expect(result).toHaveLength(3);
    expect(result.map((g) => g.value)).toEqual([10, 20, 30]);
    expect(result.every((g) => g.partial === false)).toBe(true);
  });
});

describe("aggregate — sum method", () => {
  it("sums a full month's weekly values", () => {
    const values = [100, 200, 300, 400, 500];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS, "monthly", "sum");
    expect(group.value).toBe(1500);
    expect(group.label).toBe("Mar");
    expect(group.partial).toBe(false);
    expect(group.weekCount).toBe(5);
    expect(group.expectedWeekCount).toBe(5);
  });

  it("excludes missing weeks rather than treating them as zero", () => {
    const values = [100, null, 300, undefined, 500];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS, "monthly", "sum");
    expect(group.value).toBe(900); // 100+300+500, nulls excluded — not summed as 0 and not blocking the rest
  });

  it("returns null (not 0) when every week in the period is missing", () => {
    const [group] = aggregate([null, null, null, null, null], MARCH_2024_FRIDAYS, "monthly", "sum");
    expect(group.value).toBeNull();
  });
});

describe("aggregate — average method", () => {
  it("averages a full month's weekly values", () => {
    const values = [0.5, 0.6, 0.55, 0.58, 0.52];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS, "monthly", "average");
    const expected = (0.5 + 0.6 + 0.55 + 0.58 + 0.52) / 5;
    expect(group.value).toBeCloseTo(expected, 10);
  });

  it("averages only the present weeks, not counting a missing week as zero", () => {
    // If a missing week counted as 0, this average would be 0.4125 instead of 0.55.
    const values = [0.5, null, 0.6];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS.slice(0, 3), "monthly", "average");
    expect(group.value).toBeCloseTo(0.55, 10);
  });
});

describe("aggregate — last method", () => {
  it("takes the final week's value, not a sum or average", () => {
    const values = [13_100_000, 12_600_000, 12_500_000, 15_600_000, 13_642_000];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS, "monthly", "last");
    expect(group.value).toBe(13_642_000);
  });

  it("skips a trailing null and uses the last real value", () => {
    const values = [100, 200, 300, null, null];
    const [group] = aggregate(values, MARCH_2024_FRIDAYS, "monthly", "last");
    expect(group.value).toBe(300);
  });
});

describe("aggregate — partial periods", () => {
  it("flags a period as partial when fewer weeks are present than the calendar has", () => {
    // Only the first 3 of March's 5 Fridays.
    const [group] = aggregate([100, 200, 300], MARCH_2024_FRIDAYS.slice(0, 3), "monthly", "sum");
    expect(group.weekCount).toBe(3);
    expect(group.expectedWeekCount).toBe(5);
    expect(group.partial).toBe(true);
  });

  it("does not flag a period as partial when every calendar week is present", () => {
    const [group] = aggregate([1, 2, 3, 4], APRIL_2024_FRIDAYS, "monthly", "sum");
    expect(group.partial).toBe(false);
  });
});

describe("aggregate — single-week periods", () => {
  it("a period containing exactly one week reduces to that week's value under every method", () => {
    const oneWeek = [MARCH_2024_FRIDAYS[0]];
    expect(aggregate([42], oneWeek, "monthly", "sum")[0].value).toBe(42);
    expect(aggregate([42], oneWeek, "monthly", "average")[0].value).toBe(42);
    expect(aggregate([42], oneWeek, "monthly", "last")[0].value).toBe(42);
  });

  it("flags a single supplied week as partial when its month has more Fridays than that", () => {
    const [group] = aggregate([42], [MARCH_2024_FRIDAYS[0]], "monthly", "sum");
    expect(group.expectedWeekCount).toBe(5);
    expect(group.partial).toBe(true);
  });
});

describe("aggregate — quarterly and yearly labels", () => {
  it("labels a quarter as Q{n}-{yy}", () => {
    const dates = ["2024-01-05", "2024-02-02", "2024-03-01"];
    const [group] = aggregate([1, 2, 3], dates, "quarterly", "sum");
    expect(group.label).toBe("Q1-24");
    expect(group.value).toBe(6);
  });

  it("labels a year as the 4-digit year and groups all its weeks together", () => {
    const dates = ["2024-01-05", "2024-06-07", "2024-12-06"];
    const [group] = aggregate([10, 20, 30], dates, "yearly", "sum");
    expect(group.label).toBe("2024");
    expect(group.value).toBe(60);
  });
});

describe("aggregate — refuses to guess", () => {
  it("throws rather than silently defaulting when method is missing", () => {
    expect(() => aggregate([1, 2, 3], MARCH_2024_FRIDAYS.slice(0, 3), "monthly", undefined)).toThrow();
  });

  it("throws on an unknown period", () => {
    expect(() => aggregate([1, 2, 3], MARCH_2024_FRIDAYS.slice(0, 3), "daily", "sum")).toThrow();
  });
});

describe("aggregateMetricSeries — goals aggregate by the same method as values", () => {
  it("sums both series and goalSeries for a sum metric", () => {
    const metric = {
      slug: "test-sum-metric",
      aggregationMethod: "sum",
      series: [100, 200, 300, 400, 500],
      goalSeries: [90, 90, 90, 90, 90],
    };
    const result = aggregateMetricSeries(metric, MARCH_2024_FRIDAYS, MARCH_2024_FRIDAYS, "monthly");
    expect(result.series).toEqual([1500]);
    expect(result.goalSeries).toEqual([450]);
    expect(result.weeks).toEqual(["Mar"]);
  });

  it("averages both series and goalSeries for an average metric", () => {
    const metric = {
      slug: "test-average-metric",
      aggregationMethod: "average",
      series: [0.5, 0.6, 0.5, 0.6, 0.5],
      goalSeries: [0.55, 0.55, 0.55, 0.55, 0.55],
    };
    const result = aggregateMetricSeries(metric, MARCH_2024_FRIDAYS, MARCH_2024_FRIDAYS, "monthly");
    expect(result.series[0]).toBeCloseTo(0.54, 10);
    expect(result.goalSeries[0]).toBeCloseTo(0.55, 10);
  });

  it("takes the last value of both series and goalSeries for a last/snapshot metric", () => {
    const metric = {
      slug: "test-last-metric",
      aggregationMethod: "last",
      series: [10, 20, 30, 40, 50],
      goalSeries: [100, 100, 100, 100, 100],
    };
    const result = aggregateMetricSeries(metric, MARCH_2024_FRIDAYS, MARCH_2024_FRIDAYS, "monthly");
    expect(result.series).toEqual([50]);
    expect(result.goalSeries).toEqual([100]);
  });

  it("passes weekly data through unchanged", () => {
    const metric = { slug: "test-metric", aggregationMethod: "sum", series: [1, 2, 3], goalSeries: [1, 1, 1] };
    const result = aggregateMetricSeries(metric, ["May-29", "Jun-5", "Jun-12"], MARCH_2024_FRIDAYS.slice(0, 3), "weekly");
    expect(result.series).toEqual([1, 2, 3]);
    expect(result.weeks).toEqual(["May-29", "Jun-5", "Jun-12"]);
  });

  it("throws for a metric missing aggregationMethod rather than silently summing", () => {
    const metric = { slug: "test-metric-no-method", series: [1, 2, 3] };
    expect(() => aggregateMetricSeries(metric, MARCH_2024_FRIDAYS.slice(0, 3), MARCH_2024_FRIDAYS.slice(0, 3), "monthly")).toThrow();
  });
});

describe("aggregateMetricSeries — multi-series metrics", () => {
  it("aggregates each named series independently and recomposes point objects", () => {
    const metric = {
      slug: "test-stacked-metric",
      aggregationMethod: "sum",
      stackKeys: ["stylecraft", "gammaPlus"],
      series: [
        { stylecraft: 10, gammaPlus: 1 },
        { stylecraft: 20, gammaPlus: 2 },
        { stylecraft: 30, gammaPlus: 3 },
        { stylecraft: 40, gammaPlus: 4 },
        { stylecraft: 50, gammaPlus: 5 },
      ],
    };
    const result = aggregateMetricSeries(metric, MARCH_2024_FRIDAYS, MARCH_2024_FRIDAYS, "monthly");
    expect(result.series).toEqual([{ stylecraft: 150, gammaPlus: 15 }]);
  });

  it("averages each named series independently for a dualGrouped average metric", () => {
    const metric = {
      slug: "test-dualgrouped-metric",
      aggregationMethod: "average",
      groupKeys: ["b2b", "b2c"],
      series: [
        { b2b: 1.0, b2c: 0.5 },
        { b2b: 2.0, b2c: 1.5 },
      ],
    };
    const result = aggregateMetricSeries(metric, APRIL_2024_FRIDAYS.slice(0, 2), APRIL_2024_FRIDAYS.slice(0, 2), "monthly");
    expect(result.series[0].b2b).toBeCloseTo(1.5, 10);
    expect(result.series[0].b2c).toBeCloseTo(1.0, 10);
  });
});

describe("applyPeriodToDepartment", () => {
  const departmentData = {
    WEEKS: MARCH_2024_FRIDAYS,
    WEEK_ENDINGS: MARCH_2024_FRIDAYS,
    AS_OF: "2024-03-29",
    METRICS: [
      { slug: "revenue", aggregationMethod: "sum", series: [10, 20, 30, 40, 50], goalSeries: [5, 5, 5, 5, 5] },
      { slug: "margin", aggregationMethod: "average", series: [0.5, 0.6, 0.5, 0.6, 0.5], goalSeries: [0.5, 0.5, 0.5, 0.5, 0.5] },
      { slug: "inventory", aggregationMethod: "last", series: [100, 200, 300, 400, 500] },
    ],
  };

  it("passes weekly data through with the WEEKS/METRICS untouched", () => {
    const result = applyPeriodToDepartment(departmentData, "weekly");
    expect(result.period).toBe("weekly");
    expect(result.WEEKS).toEqual(MARCH_2024_FRIDAYS);
    expect(result.METRICS[0].series).toEqual([10, 20, 30, 40, 50]);
  });

  it("defaults to weekly for an unrecognized period rather than guessing", () => {
    const result = applyPeriodToDepartment(departmentData, "daily");
    expect(result.period).toBe("weekly");
  });

  it("collapses every metric to a single monthly period, each by its own method", () => {
    const result = applyPeriodToDepartment(departmentData, "monthly");
    expect(result.WEEKS).toEqual(["Mar"]);
    const bySlug = (slug) => result.METRICS.find((m) => m.slug === slug);
    expect(bySlug("revenue").series).toEqual([150]); // sum
    expect(bySlug("margin").series[0]).toBeCloseTo(0.54, 10); // average
    expect(bySlug("inventory").series).toEqual([500]); // last
  });

  it("carries a partial flag per metric when the period isn't fully covered", () => {
    const partialData = {
      WEEKS: MARCH_2024_FRIDAYS.slice(0, 3),
      WEEK_ENDINGS: MARCH_2024_FRIDAYS.slice(0, 3),
      AS_OF: "2024-03-15",
      METRICS: [{ slug: "revenue", aggregationMethod: "sum", series: [10, 20, 30] }],
    };
    const result = applyPeriodToDepartment(partialData, "monthly");
    expect(result.METRICS[0].partials).toEqual([true]);
  });
});
