import { BarChart, Bar, ReferenceLine, Brush, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";
import { formatValue } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

// Recharts' default auto-ticks always include the raw domain ceiling as a
// tick even when it isn't a "nice" round number (e.g. a data max of 1.98
// alongside clean 0.50-step ticks below it) — snapping the ceiling itself to
// a round step keeps every tick, including the top one, evenly spaced.
const NICE_STEP_FRACTIONS = [1, 2, 2.5, 5, 10];

function computeNiceTicks(dataMax, targetLine, tickCount = 5) {
  const rawMax = targetLine !== undefined ? Math.max(dataMax, targetLine * 1.1) : dataMax;
  if (!(rawMax > 0)) return null;

  const rawStep = rawMax / tickCount;
  const stepExponent = Math.floor(Math.log10(rawStep));
  const stepBase = 10 ** stepExponent;
  const stepFraction = rawStep / stepBase;
  const niceFraction = NICE_STEP_FRACTIONS.find((f) => f >= stepFraction) ?? NICE_STEP_FRACTIONS[NICE_STEP_FRACTIONS.length - 1];
  const step = niceFraction * stepBase;

  const niceMax = Math.ceil(rawMax / step) * step;
  const ticks = [];
  for (let v = 0; v <= niceMax + step * 0.001; v += step) ticks.push(Math.round(v * 1e8) / 1e8);
  return { domain: [0, niceMax], ticks };
}

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
  showLegend = true,
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

  const dataMax = data.reduce((max, d) => Math.max(max, d[firstKey] ?? 0, d[secondKey] ?? 0), 0);
  const niceTicks = computeNiceTicks(dataMax, targetLine);

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
            domain={niceTicks?.domain}
            ticks={niceTicks?.ticks}
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
      {!compact && showLegend && (
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
