import { ComposedChart, Bar, Line, Brush, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import ChartTooltip from "./ChartTooltip";
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
  rocByKey,
}) {
  const COLORS = useChartColors();
  const [firstKey, secondKey] = groupKeys;
  const firstRoc = rocByKey?.[firstKey];
  const secondRoc = rocByKey?.[secondKey];
  // Trailing-13-week-total, year-over-year % change — one ROC line per
  // named series (see WeeklyBarChart's identical overlay for the verified
  // formula), since a grouped chart has no single combined "actual" line.
  const showRoc =
    (Array.isArray(firstRoc) && firstRoc.some((v) => v !== null && v !== undefined)) ||
    (Array.isArray(secondRoc) && secondRoc.some((v) => v !== null && v !== undefined));

  const data = weeks.map((week, i) => ({
    week,
    [firstKey]: series[i]?.[firstKey] ?? null,
    [secondKey]: series[i]?.[secondKey] ?? null,
    [`${firstKey}Roc`]: showRoc ? firstRoc?.[i] ?? null : undefined,
    [`${secondKey}Roc`]: showRoc ? secondRoc?.[i] ?? null : undefined,
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
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
          {showRoc && (
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
          <Tooltip
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
            content={({ active, label, payload }) => {
              const point = payload?.[0]?.payload;
              if (!point) return null;
              const rows = [
                { key: firstKey, label: "Pre-orders", value: point[firstKey], color: COLORS.actual, shape: "rect" },
                { key: secondKey, label: "Backorders", value: point[secondKey], color: COLORS.goal, shape: "rect" },
              ];
              const firstRocVal = point[`${firstKey}Roc`];
              const secondRocVal = point[`${secondKey}Roc`];
              if (showRoc && firstRocVal !== null && firstRocVal !== undefined) {
                rows.push({ key: `${firstKey}Roc`, label: "Pre-orders ROC (YoY)", value: firstRocVal / 100, valueFormat: "percent", color: COLORS.actual, shape: "line" });
              }
              if (showRoc && secondRocVal !== null && secondRocVal !== undefined) {
                rows.push({ key: `${secondKey}Roc`, label: "Backorders ROC (YoY)", value: secondRocVal / 100, valueFormat: "percent", color: COLORS.goal, shape: "line" });
              }
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
          {showRoc && (
            <Line
              yAxisId="roc"
              type="monotone"
              dataKey={`${firstKey}Roc`}
              stroke={COLORS.actual}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: COLORS.actual, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            />
          )}
          {showRoc && (
            <Line
              yAxisId="roc"
              type="monotone"
              dataKey={`${secondKey}Roc`}
              stroke={COLORS.goal}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: COLORS.goal, stroke: COLORS.surfaceCard, strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={isAnimationActive}
              animationDuration={animationDuration}
              animationEasing={animationEasing}
            />
          )}
          {showBrush && (
            <Brush dataKey="week" height={22} stroke={COLORS.actual} fill={COLORS.surfaceCard} travellerWidth={8} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
