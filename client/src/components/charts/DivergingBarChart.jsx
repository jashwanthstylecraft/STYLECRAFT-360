import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import { formatCurrencyCompact } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

export default function DivergingBarChart({
  weeks,
  series,
  goalSeries,
  yDomain,
  barColor,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  height = 220,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const resolvedBarColor = barColor ?? COLORS.actual;
  const data = weeks.map((week, i) => ({
    week,
    value: series[i] ?? null,
    goal: goalSeries?.[i] ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={COLORS.gridline} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: COLORS.axisText }}
          angle={-35}
          textAnchor="end"
          height={44}
          tickLine={false}
          axisLine={false}
          interval={labelThinThreshold !== undefined ? xAxisInterval(weeks.length, labelThinThreshold) : undefined}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: COLORS.axisText }}
          tickFormatter={formatCurrencyCompact}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        {/* Emphasized zero baseline — the reference every bar's sign reads against. */}
        <ReferenceLine y={0} stroke={COLORS.heading} strokeWidth={1.5} />
        <Tooltip
          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          content={({ active, label, payload }) => {
            const point = payload?.[0]?.payload;
            if (!point) return null;
            const rows = [
              { key: "value", label: "Actual", value: point.value, color: resolvedBarColor, shape: "rect" },
              { key: "goal", label: "Goal", value: point.goal, color: COLORS.goal, shape: "line" },
            ];
            return <ChartTooltip active={active} label={label} rows={rows} />;
          }}
        />
        <Bar
          dataKey="value"
          fill={resolvedBarColor}
          radius={4}
          maxBarSize={24}
          isAnimationActive={isAnimationActive}
          animationDuration={animationDuration}
          animationEasing={animationEasing}
        />
        <Line
          type="linear"
          dataKey="goal"
          stroke={COLORS.goal}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          activeDot={{ r: 4, fill: COLORS.goal, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
        />
        {showBrush && (
          <Brush dataKey="week" height={22} stroke={resolvedBarColor} fill={COLORS.surfaceCard} travellerWidth={8} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
