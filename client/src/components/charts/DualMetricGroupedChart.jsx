import { BarChart, Bar, ReferenceLine, Brush, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";
import { formatValue } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

// Generalizes Phase 1's Pre-orders/Backorders grouped chart into two named,
// arbitrarily-colored series with an optional flat target/reference line —
// used by In-Stock %, Shipping Time, and Education Events.
export default function DualMetricGroupedChart({
  weeks,
  series,
  groupKeys,
  labels,
  colors,
  targetLine,
  valueFormat = "currency",
  height = 196,
  compact = false,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  animationBeginSecond,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const resolvedColors = colors ?? [COLORS.actual, COLORS.goal];
  const [firstKey, secondKey] = groupKeys;
  const [firstLabel, secondLabel] = labels;
  const [firstColor, secondColor] = resolvedColors;

  const data = weeks.map((week, i) => ({
    week,
    [firstKey]: series[i]?.[firstKey] ?? null,
    [secondKey]: series[i]?.[secondKey] ?? null,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={compact ? { top: 4, right: 2, left: 2, bottom: 0 } : { top: 8, right: 8, left: 0, bottom: 0 }}
          barGap={2}
        >
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
            domain={targetLine !== undefined ? [0, (dataMax) => Math.max(dataMax, targetLine * 1.1)] : undefined}
            tick={{ fontSize: 11, fill: COLORS.axisText }}
            tickFormatter={(v) => formatValue(v, valueFormat)}
            tickLine={false}
            axisLine={false}
            width={52}
            hide={compact}
          />
          {targetLine !== undefined && (
            <ReferenceLine y={targetLine} stroke={COLORS.goal} strokeWidth={2} strokeDasharray="5 4" />
          )}
          {!compact && (
            <Tooltip
              cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
              content={({ active, label, payload }) => {
                const point = payload?.[0]?.payload;
                if (!point) return null;
                const rows = [
                  { key: firstKey, label: firstLabel, value: point[firstKey], color: firstColor, shape: "rect" },
                  { key: secondKey, label: secondLabel, value: point[secondKey], color: secondColor, shape: "rect" },
                ];
                if (targetLine !== undefined) {
                  rows.push({ key: "target", label: "Target", value: targetLine, color: COLORS.goal, shape: "line" });
                }
                return <ChartTooltip active={active} label={label} rows={rows} valueFormat={valueFormat} />;
              }}
            />
          )}
          <Bar
            dataKey={firstKey}
            fill={firstColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={compact ? 8 : 16}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={0}
          />
          <Bar
            dataKey={secondKey}
            fill={secondColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={compact ? 8 : 16}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={animationBeginSecond ?? 0}
          />
          {showBrush && (
            <Brush dataKey="week" height={22} stroke={firstColor} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </BarChart>
      </ResponsiveContainer>
      {!compact && (
        <ChartLegend
          items={[
            { label: firstLabel, color: firstColor, shape: "rect" },
            { label: secondLabel, color: secondColor, shape: "rect" },
          ]}
        />
      )}
    </div>
  );
}
