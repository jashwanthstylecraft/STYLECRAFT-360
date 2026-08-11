import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import { formatValue } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval, shouldUseLineFallback } from "../../utils/chartDensity";

export default function WeeklyBarChart({
  weeks,
  series,
  goalSeries,
  partials,
  valueFormat = "currency",
  yDomain,
  goalLabel = "Goal",
  height = 220,
  compact = false,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const data = weeks.map((week, i) => ({
    week,
    actual: series[i] ?? null,
    goal: goalSeries?.[i] ?? null,
    partial: partials?.[i] ?? false,
  }));
  const useLine = shouldUseLineFallback(weeks.length);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={compact ? { top: 4, right: 2, left: 2, bottom: 0 } : { top: 8, right: 8, left: 0, bottom: 0 }}>
        {!compact && <CartesianGrid vertical={false} stroke={COLORS.gridline} />}
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: COLORS.axisText }}
          angle={-35}
          textAnchor="end"
          height={44}
          tickLine={false}
          axisLine={{ stroke: COLORS.gridline }}
          hide={compact}
          interval={xAxisInterval(weeks.length, labelThinThreshold)}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: COLORS.axisText }}
          tickFormatter={(v) => formatValue(v, valueFormat)}
          tickLine={false}
          axisLine={false}
          width={52}
          hide={compact}
        />
        {!compact && (
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const hasActual = point.actual !== null && point.actual !== undefined;
              const hasGoal = point.goal !== null && point.goal !== undefined;
              const rows = [
                { key: "actual", label: "Actual", value: hasActual ? point.actual : null, color: COLORS.actual, shape: "rect" },
                { key: "goal", label: goalLabel, value: hasGoal ? point.goal : null, color: COLORS.goal, shape: "line" },
              ];
              if (hasActual && hasGoal) {
                rows.push({
                  key: "variance",
                  label: "Variance",
                  value: point.actual - point.goal,
                  color: point.actual >= point.goal ? COLORS.positive : COLORS.negative,
                  shape: "rect",
                });
              }
              return (
                <ChartTooltip
                  active={active}
                  label={point.partial ? `${label} (partial)` : label}
                  rows={rows}
                  valueFormat={valueFormat}
                />
              );
            }}
          />
        )}
        {useLine ? (
          <Line
            type="linear"
            dataKey="actual"
            stroke={COLORS.actual}
            strokeWidth={2}
            dot={false}
            activeDot={compact ? false : { r: 3, fill: COLORS.actual, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
          />
        ) : (
          <Bar
            dataKey="actual"
            fill={COLORS.actual}
            radius={[4, 4, 0, 0]}
            maxBarSize={compact ? 10 : 24}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
          >
            {data.map((d, i) => (
              <Cell key={i} fillOpacity={d.partial ? 0.5 : 1} strokeDasharray={d.partial ? "3 2" : undefined} stroke={d.partial ? COLORS.actual : undefined} />
            ))}
          </Bar>
        )}
        <Line
          type="linear"
          dataKey="goal"
          stroke={COLORS.goal}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={compact ? false : { r: 4, fill: COLORS.goal, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
          isAnimationActive={isAnimationActive}
          animationDuration={animationDuration}
          animationEasing={animationEasing}
        />
        {showBrush && (
          <Brush dataKey="week" height={22} stroke={COLORS.actual} fill={COLORS.surfaceCard} travellerWidth={8} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
