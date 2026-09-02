import {
  ComposedChart,
  Bar,
  Line,
  Brush,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";
import { roundedTopRectPath } from "./barShapes";
import { formatCurrencyCompact } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

// The Unpaid segment renders as an outlined/dashed shape (not a solid fill)
// so a reader scans "how much of this bar is still owed" at a glance,
// distinct from the solid Paid segment below it.
function makeUnpaidBarShape(COLORS) {
  return function UnpaidBarShape({ x, y, width, height }) {
    if (!height) return null;
    return (
      <path
        d={roundedTopRectPath(x, y, width, height, 4)}
        fill={COLORS.unpaidFill}
        fillOpacity={0.5}
        stroke={COLORS.actual}
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
    );
  };
}

export default function PaidUnpaidStackedChart({
  weeks,
  series,
  goalSeries,
  stackKeys,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  animationBeginSecond = 0,
  height = 196,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const UnpaidBarShape = makeUnpaidBarShape(COLORS);
  const [paidKey, unpaidKey] = stackKeys;

  const data = weeks.map((week, i) => {
    const point = series[i];
    const paidValue = point?.[paidKey] ?? null;
    const unpaidValue = point?.[unpaidKey] ?? null;
    return {
      week,
      [paidKey]: paidValue,
      [unpaidKey]: unpaidValue,
      combined: paidValue === null && unpaidValue === null ? null : (paidValue ?? 0) + (unpaidValue ?? 0),
      goal: goalSeries?.[i] ?? null,
    };
  });

  return (
    <div>
      <div className="mb-1 flex justify-center">
        <ChartLegend
          items={[
            { label: "Paid", color: COLORS.actual, shape: "rect" },
            { label: "Unpaid", color: COLORS.actual, fill: COLORS.unpaidFill, shape: "dashed-rect" },
          ]}
        />
      </div>
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
            tick={{ fontSize: 11, fill: COLORS.axisText }}
            tickFormatter={formatCurrencyCompact}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const rows = [
                { key: paidKey, label: "Paid", value: point[paidKey], color: COLORS.actual, shape: "rect" },
                { key: unpaidKey, label: "Unpaid", value: point[unpaidKey], color: COLORS.actual, shape: "rect" },
                { key: "goal", label: "Goal", value: point.goal, color: COLORS.goal, shape: "line" },
              ];
              if (point.goal !== null) {
                rows.push({
                  key: "variance",
                  label: "Variance",
                  value: point.combined - point.goal,
                  color: point.combined <= point.goal ? COLORS.positive : COLORS.negative,
                  shape: "rect",
                });
              }
              return <ChartTooltip active={active} label={label} rows={rows} />;
            }}
          />
          <Bar
            dataKey={paidKey}
            stackId="po"
            fill={COLORS.actual}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={0}
          />
          <Bar
            dataKey={unpaidKey}
            stackId="po"
            shape={UnpaidBarShape}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
            animationBegin={animationBeginSecond}
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
            <Brush dataKey="week" height={22} stroke={COLORS.actual} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
