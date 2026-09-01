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
import { roundedTopRectPath } from "./barShapes";
import { formatValue } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval, shouldUseLineFallback } from "../../utils/chartDensity";

// Recharts' default auto-ticks are evenly spaced in the raw domain, but once
// rounded to whole percent for display (via formatValue) that can look
// uneven — e.g. a [0.4, 0.65] domain split into 5 auto-ticks rounds to
// 40/47/53/59/65, not a clean 5-point step. Snapping to a round percent step
// keeps both the raw spacing AND the displayed labels even.
const NICE_PERCENT_STEPS = [1, 2, 2.5, 5, 10, 20, 25, 50];

function computePercentTicks(domain) {
  if (!domain) return undefined;
  const [min, max] = domain;
  const spanPct = (max - min) * 100;
  if (!(spanPct > 0)) return undefined;
  const rawStep = spanPct / 5;
  const step = NICE_PERCENT_STEPS.find((s) => s >= rawStep) ?? NICE_PERCENT_STEPS[NICE_PERCENT_STEPS.length - 1];
  const startPct = Math.floor(min * 100 / step) * step;
  const endPct = Math.ceil(max * 100 / step) * step;
  const ticks = [];
  for (let v = startPct; v <= endPct + 0.001; v += step) ticks.push(Math.round(v * 100) / 10000);
  return ticks;
}

// A left-to-right cascade needs each bar's grow-in to start at its own time —
// Recharts' built-in Bar animation doesn't honor a per-Cell animationBegin
// override (verified: every bar starts together regardless), so when a
// department wants that cascade (barStaggerMs > 0) this shape renders the
// bar itself and drives the grow-in via a plain CSS keyframe with a per-bar
// `animation-delay` instead, which the browser applies per-element for free.
function makeCascadingBarShape({ barStaggerMs, animationDuration, animationEasing, isAnimationActive, actualFill }) {
  return function CascadingBar({ x, y, width, height, index, payload }) {
    if (!height) return null;
    const partial = payload?.partial;
    return (
      <path
        d={roundedTopRectPath(x, y, width, height, 4)}
        fill={actualFill}
        fillOpacity={partial ? 0.5 : 1}
        stroke={partial ? actualFill : undefined}
        strokeDasharray={partial ? "3 2" : undefined}
        className={isAnimationActive ? "chart-bar-grow-in" : undefined}
        style={
          isAnimationActive
            ? {
                animationDuration: `${animationDuration}ms`,
                animationDelay: `${index * barStaggerMs}ms`,
                animationTimingFunction: animationEasing,
              }
            : undefined
        }
      />
    );
  };
}

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
  barStaggerMs = 0,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const percentTicks = valueFormat === "percent" ? computePercentTicks(yDomain) : undefined;
  const resolvedDomain = percentTicks ? [percentTicks[0], percentTicks[percentTicks.length - 1]] : yDomain;
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
          domain={resolvedDomain}
          ticks={percentTicks}
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
        ) : barStaggerMs > 0 && isAnimationActive ? (
          <Bar
            dataKey="actual"
            maxBarSize={compact ? 10 : 24}
            isAnimationActive={false}
            shape={makeCascadingBarShape({ barStaggerMs, animationDuration, animationEasing, isAnimationActive, actualFill: COLORS.actual })}
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
