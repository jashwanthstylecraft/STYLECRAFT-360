import { BarChart, Bar, Brush, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";
import { formatCurrencyCompact } from "../../utils/format";
import { useChartColors } from "../../utils/theme";
import { xAxisInterval } from "../../utils/chartDensity";

export default function GroupedBarChart({
  weeks,
  series,
  groupKeys,
  isAnimationActive = true,
  animationDuration,
  animationEasing,
  height = 196,
  labelThinThreshold,
  showBrush = false,
}) {
  const COLORS = useChartColors();
  const [firstKey, secondKey] = groupKeys;

  const data = weeks.map((week, i) => ({
    week,
    [firstKey]: series[i]?.[firstKey] ?? null,
    [secondKey]: series[i]?.[secondKey] ?? null,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
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
                { key: firstKey, label: "Pre-orders", value: point[firstKey], color: COLORS.actual, shape: "rect" },
                { key: secondKey, label: "Backorders", value: point[secondKey], color: COLORS.goal, shape: "rect" },
              ];
              return <ChartTooltip active={active} label={label} rows={rows} />;
            }}
          />
          <Bar
            dataKey={firstKey}
            fill={COLORS.actual}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
          />
          <Bar
            dataKey={secondKey}
            fill={COLORS.goal}
            radius={[4, 4, 0, 0]}
            maxBarSize={16}
            isAnimationActive={isAnimationActive}
            animationDuration={animationDuration}
            animationEasing={animationEasing}
          />
          {showBrush && (
            <Brush dataKey="week" height={22} stroke={COLORS.actual} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </BarChart>
      </ResponsiveContainer>
      <ChartLegend
        items={[
          { label: "Pre-orders", color: COLORS.actual, shape: "rect" },
          { label: "Backorders", color: COLORS.goal, shape: "rect" },
        ]}
      />
    </div>
  );
}
