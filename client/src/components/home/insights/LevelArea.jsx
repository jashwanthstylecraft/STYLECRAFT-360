import { AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "../../charts/ChartTooltip";
import { formatValue } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";
import { xAxisInterval } from "../../../utils/chartDensity";

function Panel({ panel, isAnimationActive }) {
  const COLORS = useChartColors();
  const { metricName, format, points } = panel;

  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-secondary">{metricName}</div>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="week" hide interval={xAxisInterval(points.length)} />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const rows = [
                { key: "value", label: "Level", value: point.value, color: COLORS.actual, shape: "rect" },
                { key: "goal", label: "Goal", value: point.goal, color: COLORS.goal, shape: "line" },
              ];
              return <ChartTooltip active={active} label={label} rows={rows} valueFormat={format} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={COLORS.actual}
            fill={COLORS.actual}
            fillOpacity={0.18}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={isAnimationActive}
          />
          <Line type="linear" dataKey="goal" stroke={COLORS.goal} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={isAnimationActive} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-1 text-right text-xs text-ink-muted">
        Latest {formatValue(points[points.length - 1]?.value, format)}
      </div>
    </div>
  );
}

export default function LevelArea({ data, isAnimationActive = true }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.map((panel) => (
        <Panel key={panel.metricSlug} panel={panel} isAnimationActive={isAnimationActive} />
      ))}
    </div>
  );
}
