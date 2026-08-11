import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "../../charts/ChartTooltip";
import { formatValue } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";
import { xAxisInterval } from "../../../utils/chartDensity";

export default function CumulativeArea({ data, isAnimationActive = true }) {
  const COLORS = useChartColors();
  const { format, points } = data;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          width={56}
        />
        <Tooltip
          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          content={({ active, label, payload }) => {
            const point = payload?.[0]?.payload;
            if (!point) return null;
            const rows = [
              { key: "value", label: "Cumulative", value: point.cumulativeValue, color: COLORS.actual, shape: "rect" },
              { key: "goal", label: "Cumulative goal", value: point.cumulativeGoal, color: COLORS.goal, shape: "line" },
            ];
            return <ChartTooltip active={active} label={label} rows={rows} valueFormat={format} />;
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulativeValue"
          stroke={COLORS.actual}
          fill={COLORS.actual}
          fillOpacity={0.18}
          strokeWidth={2}
          connectNulls={false}
          isAnimationActive={isAnimationActive}
        />
        <Line
          type="monotone"
          dataKey="cumulativeGoal"
          stroke={COLORS.goal}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          isAnimationActive={isAnimationActive}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
