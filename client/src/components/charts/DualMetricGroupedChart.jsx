import { ComposedChart, Bar, Line, ReferenceLine, Brush, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
// used by In-Stock %, Shipping Time, Education Events, and Promotional Sales.
//
// `formats`: the two series' own value formats (e.g. In-Stock's two series
// are both "percent"; Promotional Sales is "currency" + "count"). When they
// MATCH, both bars share one left axis exactly as before — zero visual
// change for the existing same-scale consumers. When they DIFFER, the two
// series are almost certainly on wildly different scales (dollars vs. units
// sold), so sharing one axis would flatten the smaller series to near-zero —
// the second series gets its own right-side axis and its own independently-
// computed nice-tick domain instead.
export default function DualMetricGroupedChart({
  weeks,
  series,
  groupKeys,
  labels,
  colors,
  targetLine,
  valueFormat = "currency",
  formats,
  height = 196,
  compact = false,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  animationBeginSecond,
  labelThinThreshold,
  showBrush = false,
  showLegend = true,
  rocByKey,
}) {
  const COLORS = useChartColors();
  const resolvedColors = colors ?? [COLORS.actual, COLORS.goal];
  const [firstKey, secondKey] = groupKeys;
  const [firstLabel, secondLabel] = labels;
  const [firstColor, secondColor] = resolvedColors;
  const [firstFormat, secondFormat] = formats ?? [valueFormat, valueFormat];
  const useDualAxis = firstFormat !== secondFormat;
  const firstRoc = rocByKey?.[firstKey];
  const secondRoc = rocByKey?.[secondKey];
  // Trailing-13-week-total, year-over-year % change — one ROC line per
  // named series (see WeeklyBarChart's identical overlay for the verified
  // formula), since this chart has no single combined "actual" line.
  const showRoc =
    (Array.isArray(firstRoc) && firstRoc.some((v) => v !== null && v !== undefined)) ||
    (Array.isArray(secondRoc) && secondRoc.some((v) => v !== null && v !== undefined));
  // A dual-axis chart's ROC overlay would need a THIRD axis to sit
  // alongside two already-occupied sides — rather than crowd the chart,
  // the (rare, YoY-needing-65-weeks) ROC overlay is simply not offered here.
  const showRocAxis = showRoc && !useDualAxis;

  const data = weeks.map((week, i) => ({
    week,
    [firstKey]: series[i]?.[firstKey] ?? null,
    [secondKey]: series[i]?.[secondKey] ?? null,
    [`${firstKey}Roc`]: showRoc ? firstRoc?.[i] ?? null : undefined,
    [`${secondKey}Roc`]: showRoc ? secondRoc?.[i] ?? null : undefined,
  }));

  const firstMax = data.reduce((max, d) => Math.max(max, d[firstKey] ?? 0), 0);
  const secondMax = data.reduce((max, d) => Math.max(max, d[secondKey] ?? 0), 0);
  const dataMax = useDualAxis ? firstMax : Math.max(firstMax, secondMax);
  const niceTicks = computeNiceTicks(dataMax, useDualAxis ? undefined : targetLine);
  const secondNiceTicks = useDualAxis ? computeNiceTicks(secondMax) : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
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
            yAxisId="left"
            domain={niceTicks?.domain}
            ticks={niceTicks?.ticks}
            tick={{ fontSize: 11, fill: COLORS.axisText }}
            tickFormatter={(v) => formatValue(v, firstFormat)}
            tickLine={false}
            axisLine={false}
            width={52}
            hide={compact}
          />
          {useDualAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={secondNiceTicks?.domain}
              ticks={secondNiceTicks?.ticks}
              tick={{ fontSize: 11, fill: secondColor }}
              tickFormatter={(v) => formatValue(v, secondFormat)}
              tickLine={false}
              axisLine={false}
              width={52}
              hide={compact}
            />
          )}
          {showRocAxis && !compact && (
            <YAxis
              yAxisId="roc"
              orientation="right"
              tick={{ fontSize: 11, fill: COLORS.roc }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tickLine={false}
              axisLine={false}
              width={40}
            />
          )}
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
                  { key: firstKey, label: firstLabel, value: point[firstKey], valueFormat: firstFormat, color: firstColor, shape: "rect" },
                  { key: secondKey, label: secondLabel, value: point[secondKey], valueFormat: secondFormat, color: secondColor, shape: "rect" },
                ];
                if (targetLine !== undefined) {
                  rows.push({ key: "target", label: "Target", value: targetLine, valueFormat: firstFormat, color: COLORS.goal, shape: "line" });
                }
                const firstRocVal = point[`${firstKey}Roc`];
                const secondRocVal = point[`${secondKey}Roc`];
                if (showRocAxis && firstRocVal !== null && firstRocVal !== undefined) {
                  rows.push({ key: `${firstKey}Roc`, label: `${firstLabel} ROC (YoY)`, value: firstRocVal / 100, valueFormat: "percent", color: firstColor, shape: "line" });
                }
                if (showRocAxis && secondRocVal !== null && secondRocVal !== undefined) {
                  rows.push({ key: `${secondKey}Roc`, label: `${secondLabel} ROC (YoY)`, value: secondRocVal / 100, valueFormat: "percent", color: secondColor, shape: "line" });
                }
                return <ChartTooltip active={active} label={label} rows={rows} valueFormat={firstFormat} />;
              }}
            />
          )}
          <Bar
            yAxisId="left"
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
            yAxisId={useDualAxis ? "right" : "left"}
            dataKey={secondKey}
            fill={secondColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={compact ? 8 : 16}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={animationBeginSecond ?? 0}
          />
          {showRocAxis && !compact && (
            <Line
              yAxisId="roc"
              type="monotone"
              dataKey={`${firstKey}Roc`}
              stroke={firstColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: firstColor, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            />
          )}
          {showRocAxis && !compact && (
            <Line
              yAxisId="roc"
              type="monotone"
              dataKey={`${secondKey}Roc`}
              stroke={secondColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: secondColor, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            />
          )}
          {showBrush && (
            <Brush dataKey="week" height={22} stroke={firstColor} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </ComposedChart>
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
