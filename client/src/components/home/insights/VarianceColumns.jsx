import { BarChart, Bar, Cell, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "../../charts/ChartTooltip";
import { formatPercent } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";

const DEPARTMENT_LABEL = { sales: "Sales", inventory: "Inventory", finance: "Finance", operations: "Operations" };

// One diverging row per department's headline metric — normalized to
// percent-of-goal (not raw variance) so a $-103K sales miss and a -0.31 day
// shipping win can share one axis; the underlying metrics have nothing else
// in common. Direction-aware: green means "on the right side of goal" for
// THAT metric, not "positive number."
export default function VarianceColumns({ data, isAnimationActive = true }) {
  const COLORS = useChartColors();

  const chartData = data.map((row) => ({
    ...row,
    label: DEPARTMENT_LABEL[row.department] ?? row.department,
    isGood: row.variancePct === null ? null : row.goalDirection === "lower" ? row.variancePct <= 0 : row.variancePct >= 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }}>
        <XAxis type="number" tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} tick={{ fontSize: 11, fill: COLORS.axisText }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={78} tick={{ fontSize: 12, fill: COLORS.axisText }} tickLine={false} axisLine={false} />
        <ReferenceLine x={0} stroke={COLORS.heading} strokeWidth={1.5} />
        <Tooltip
          cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload;
            if (!active || !row) return null;
            const rows = [
              { key: "value", label: row.metricName, value: row.value, color: COLORS.actual, shape: "rect" },
              { key: "goal", label: "Goal", value: row.goal, color: COLORS.goal, shape: "line" },
            ];
            return <ChartTooltip active={active} label={row.variancePct === null ? "No goal set" : formatPercent(row.variancePct, { signed: true })} rows={rows} valueFormat={row.format} />;
          }}
        />
        <Bar dataKey="variancePct" radius={4} isAnimationActive={isAnimationActive} maxBarSize={22}>
          {chartData.map((row) => (
            <Cell key={row.department} fill={row.isGood === null ? COLORS.gridline : row.isGood ? COLORS.positive : COLORS.negative} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
