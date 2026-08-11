import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "../../charts/ChartTooltip";
import ChartLegend from "../../charts/ChartLegend";
import { formatValue } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";
import { xAxisInterval } from "../../../utils/chartDensity";

// The shaded goal band is two STACKED areas: an invisible base up to
// goalBandLow, then a visible band of height (goalBandHigh - goalBandLow) on
// top of it — Recharts has no single "band between two series" primitive.
export default function TrendLine({ data, isAnimationActive = true }) {
  const COLORS = useChartColors();
  const { format, points } = data;

  const chartData = points.map((p) => ({
    ...p,
    bandWidth: p.goalBandLow !== null && p.goalBandHigh !== null ? p.goalBandHigh - p.goalBandLow : null,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={196}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={COLORS.gridline} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: COLORS.axisText }}
            angle={-35}
            textAnchor="end"
            height={44}
            tickLine={false}
            axisLine={{ stroke: COLORS.gridline }}
            interval={xAxisInterval(points.length)}
          />
          <YAxis
            tick={{ fontSize: 11, fill: COLORS.axisText }}
            tickFormatter={(v) => formatValue(v, format)}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={["auto", "auto"]}
          />
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const rows = [
                { key: "value", label: "Actual", value: point.value, color: COLORS.actual, shape: "rect" },
                { key: "ma", label: "4-week avg", value: point.movingAverage, color: COLORS.actualStrong, shape: "line" },
                { key: "goal", label: "Goal", value: point.goal, color: COLORS.goal, shape: "line" },
              ];
              return <ChartTooltip active={active} label={label} rows={rows} valueFormat={format} />;
            }}
          />
          <Area dataKey="goalBandLow" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
          <Area dataKey="bandWidth" stackId="band" stroke="none" fill={COLORS.goal} fillOpacity={0.12} isAnimationActive={false} />
          <Line type="monotone" dataKey="value" stroke={COLORS.actual} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={isAnimationActive} />
          <Line
            type="monotone"
            dataKey="movingAverage"
            stroke={COLORS.actualStrong}
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={isAnimationActive}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Actual", color: COLORS.actual, shape: "rect" },
          { label: "4-week avg (entered weeks)", color: COLORS.actualStrong, shape: "line" },
          { label: "Goal band", color: COLORS.goal, shape: "line" },
        ]}
      />
    </div>
  );
}
