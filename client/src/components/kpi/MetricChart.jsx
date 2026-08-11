import WeeklyBarChart from "../charts/WeeklyBarChart";
import StackedBarChart from "../charts/StackedBarChart";
import GroupedBarChart from "../charts/GroupedBarChart";
import DualMetricGroupedChart from "../charts/DualMetricGroupedChart";
import PaidUnpaidStackedChart from "../charts/PaidUnpaidStackedChart";
import DivergingBarChart from "../charts/DivergingBarChart";
import PercentBarChart from "../charts/PercentBarChart";
import { useResolveNamedColor } from "../../utils/theme";

// The one place a metric's chartType is dispatched to its chart component —
// used by both KpiCard (small, in a grid) and MetricDetailPage (hero, large)
// so the detail page renders the EXACT same chart type as its card, just
// bigger. `heroProps` (height/showBrush/labelThinThreshold/etc.) are only
// ever passed by the detail page; KpiCard omits them entirely, which keeps
// every existing card's output byte-for-byte identical to before this
// extraction — see the Phase 7 "department pages don't change" hard rule.
export default function MetricChart({ metric, weeks, chartAnim = {}, heroProps = {} }) {
  const resolveNamedColor = useResolveNamedColor();
  const hasValuesHeader = Array.isArray(metric.headerValues);
  const format = metric.format || "currency";
  const goalLabel = metric.goalLabel || "Goal";

  if (metric.chartType === "bar") {
    return (
      <WeeklyBarChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        partials={metric.partials}
        valueFormat={format}
        yDomain={metric.yDomain}
        goalLabel={goalLabel}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "stacked" && hasValuesHeader) {
    return (
      <StackedBarChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        stackKeys={metric.stackKeys}
        targetLine={metric.targetLine}
        labels={metric.headerValues.map((v) => v.label)}
        colors={metric.headerValues.map((v) => resolveNamedColor(v.color))}
        goalLabel="Target"
        valueFormat={metric.headerValues[0].format}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "stacked" && !hasValuesHeader) {
    return (
      <StackedBarChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        stackKeys={metric.stackKeys}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "grouped") {
    return <GroupedBarChart weeks={weeks} series={metric.series} groupKeys={metric.groupKeys} {...chartAnim} {...heroProps} />;
  }

  if (metric.chartType === "dualGrouped") {
    return (
      <DualMetricGroupedChart
        weeks={weeks}
        series={metric.series}
        groupKeys={metric.groupKeys}
        labels={metric.headerValues.map((v) => v.label)}
        colors={metric.headerValues.map((v) => resolveNamedColor(v.color))}
        targetLine={metric.targetLine}
        valueFormat={metric.headerValues[0].format}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "paidUnpaidStacked") {
    return (
      <PaidUnpaidStackedChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        stackKeys={metric.stackKeys}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "divergingBar") {
    return (
      <DivergingBarChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        yDomain={metric.yDomain}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  if (metric.chartType === "percentBar") {
    return (
      <PercentBarChart
        weeks={weeks}
        series={metric.series}
        goalSeries={metric.goalSeries}
        partials={metric.partials}
        yDomain={metric.yDomain}
        goalLabel={goalLabel}
        {...chartAnim}
        {...heroProps}
      />
    );
  }

  return null;
}
