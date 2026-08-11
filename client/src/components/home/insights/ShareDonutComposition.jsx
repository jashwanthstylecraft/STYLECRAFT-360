import { PieChart, Pie, Cell, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "../../charts/ChartTooltip";
import ChartLegend from "../../charts/ChartLegend";
import { formatValue, formatPercent } from "../../../utils/format";
import { useChartColors } from "../../../utils/theme";
import { xAxisInterval } from "../../../utils/chartDensity";
import { humanizeKey } from "../../../utils/humanizeKey";

// Paired per the Phase 7 spec: a donut for the genuine part-of-whole story
// (range-total share) plus a small area chart showing how that mix moved
// week to week — a donut alone can't show a time series, and a stacked area
// alone buries the "which brand actually leads" headline the donut answers
// at a glance.
export default function ShareDonutComposition({ data, isAnimationActive = true }) {
  const COLORS = useChartColors();
  const { format, stackKeys, points, totals, shares, combined } = data;
  const colors = [COLORS.actual, COLORS.gammaPlus];
  const labels = stackKeys.map(humanizeKey);

  const pieData = stackKeys.map((key, i) => ({ key, label: labels[i], value: totals[key], share: shares[key] }));

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                isAnimationActive={isAnimationActive}
              >
                {pieData.map((entry, i) => (
                  <Cell key={entry.key} fill={colors[i % colors.length]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  const entry = payload?.[0]?.payload;
                  if (!active || !entry) return null;
                  return (
                    <ChartTooltip
                      active={active}
                      label={entry.label}
                      rows={[{ key: entry.key, label: `${formatPercent(entry.share)} of total`, value: entry.value, color: colors[pieData.indexOf(entry) % colors.length], shape: "rect" }]}
                      valueFormat={format}
                    />
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Combined</div>
            <div className="text-lg font-bold tabular-nums text-heading">{formatValue(combined, format)}</div>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2">
          {pieData.map((entry, i) => (
            <div key={entry.key} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 text-ink-secondary">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                {entry.label}
              </span>
              <span className="tabular-nums font-semibold text-ink">{formatPercent(entry.share)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <ResponsiveContainer width="100%" height={110}>
          <AreaChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <XAxis dataKey="week" hide interval={xAxisInterval(points.length)} />
            <Tooltip
              content={({ active, label, payload }) => {
                const point = payload?.[0]?.payload;
                if (!point) return null;
                const rows = stackKeys.map((key, i) => ({ key, label: labels[i], value: point[key], color: colors[i % colors.length], shape: "rect" }));
                return <ChartTooltip active={active} label={label} rows={rows} valueFormat={format} />;
              }}
            />
            {stackKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId="mix"
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.35}
                isAnimationActive={isAnimationActive}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <ChartLegend items={labels.map((label, i) => ({ label, color: colors[i % colors.length], shape: "rect" }))} />
      </div>
    </div>
  );
}
