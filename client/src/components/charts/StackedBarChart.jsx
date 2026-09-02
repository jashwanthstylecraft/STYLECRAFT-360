import {
  ComposedChart,
  Bar,
  Line,
  ReferenceLine,
  LabelList,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";
import { formatValue } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

const SEGMENT_LABEL_FONT_SIZE = 8;

// Recharts' default auto-ticks always include the raw domain ceiling as a
// tick even when it isn't a "nice" round number — snapping the ceiling
// itself to a round step keeps every tick, including the top one, evenly
// spaced (see DualMetricGroupedChart's identical helper).
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

// Only draws the value when the rendered segment measures large enough to
// hold it in both dimensions — an unmeasured label on a thin/narrow segment
// gets clipped, which is worse than no label at all (see marks-and-anatomy).
function makeSegmentLabel(valueFormat) {
  return function SegmentLabel({ x, y, width, height, value }) {
    if (!value) return null;
    const text = formatValue(value, valueFormat);
    const estimatedTextWidth = text.length * SEGMENT_LABEL_FONT_SIZE * 0.62 + 4;
    if (height < 14 || width < estimatedTextWidth) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={SEGMENT_LABEL_FONT_SIZE}
        fontWeight={600}
        fill="#FFFFFF"
      >
        {text}
      </text>
    );
  };
}

export default function StackedBarChart({
  weeks,
  series,
  goalSeries,
  stackKeys,
  targetLine,
  labels = ["StyleCraft", "GAMMA+"],
  colors,
  goalLineColor,
  goalLabel = "Combined goal",
  valueFormat = "currency",
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  animationBeginSecond = 0,
  height = 196,
  labelThinThreshold,
  showBrush = false,
  showLegend = true,
  showSegmentLabels = true,
}) {
  const COLORS = useChartColors();
  const resolvedColors = colors ?? [COLORS.actual, COLORS.gammaPlus];
  const resolvedGoalLineColor = goalLineColor ?? COLORS.heading;
  const [baseKey, topKey] = stackKeys;
  const [baseLabel, topLabel] = labels;
  const [baseColor, topColor] = resolvedColors;
  const SegmentLabel = makeSegmentLabel(valueFormat);

  const data = weeks.map((week, i) => {
    const point = series[i];
    const baseValue = point?.[baseKey] ?? null;
    const topValue = point?.[topKey] ?? null;
    return {
      week,
      [baseKey]: baseValue,
      [topKey]: topValue,
      combined: baseValue === null && topValue === null ? null : (baseValue ?? 0) + (topValue ?? 0),
      goal: goalSeries?.[i] ?? null,
    };
  });

  const dataMax = data.reduce((max, d) => Math.max(max, d.combined ?? 0), 0);
  const niceTicks = computeNiceTicks(dataMax, targetLine);

  return (
    <div>
      {showLegend && (
        <div className="mb-1 flex justify-center">
          <ChartLegend
            items={[
              { label: baseLabel, color: baseColor, shape: "rect" },
              { label: topLabel, color: topColor, shape: "rect" },
            ]}
          />
        </div>
      )}
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
            axisLine={{ stroke: COLORS.gridline }}
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
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const goalValue = point.goal ?? targetLine ?? null;
              const rows = [
                { key: baseKey, label: baseLabel, value: point[baseKey], color: baseColor, shape: "rect" },
                { key: topKey, label: topLabel, value: point[topKey], color: topColor, shape: "rect" },
                { key: "goal", label: goalLabel, value: goalValue, color: resolvedGoalLineColor, shape: "line" },
              ];
              if (goalValue !== null) {
                rows.push({
                  key: "variance",
                  label: "Variance",
                  value: point.combined - goalValue,
                  color: point.combined >= goalValue ? COLORS.positive : COLORS.negative,
                  shape: "rect",
                });
              }
              return <ChartTooltip active={active} label={label} rows={rows} valueFormat={valueFormat} />;
            }}
          />
          <Bar
            dataKey={baseKey}
            stackId="stack"
            fill={baseColor}
            stroke={COLORS.surfaceCard}
            strokeWidth={2}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={0}
          >
            {showSegmentLabels && <LabelList dataKey={baseKey} content={SegmentLabel} />}
          </Bar>
          <Bar
            dataKey={topKey}
            stackId="stack"
            fill={topColor}
            stroke={COLORS.surfaceCard}
            strokeWidth={2}
            radius={[4, 4, 0, 0]}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={animationBeginSecond}
          >
            {showSegmentLabels && <LabelList dataKey={topKey} content={SegmentLabel} />}
          </Bar>
          {goalSeries && (
            <Line
              type="linear"
              dataKey="goal"
              stroke={resolvedGoalLineColor}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4, fill: resolvedGoalLineColor, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
            />
          )}
          {!goalSeries && targetLine !== undefined && (
            <ReferenceLine y={targetLine} stroke={resolvedGoalLineColor} strokeWidth={2} strokeDasharray="5 4" />
          )}
          {showBrush && (
            <Brush dataKey="week" height={22} stroke={baseColor} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
