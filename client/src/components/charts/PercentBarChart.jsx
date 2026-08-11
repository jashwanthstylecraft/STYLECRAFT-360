import WeeklyBarChart from "./WeeklyBarChart";

// A named percent-formatted variant of WeeklyBarChart, kept as its own file
// per the chart-variant catalog even though it's a thin parameterization —
// callers shouldn't need to know WeeklyBarChart can do this.
export default function PercentBarChart({ weeks, series, goalSeries, yDomain, goalLabel, ...rest }) {
  return (
    <WeeklyBarChart
      weeks={weeks}
      series={series}
      goalSeries={goalSeries}
      yDomain={yDomain}
      valueFormat="percent"
      goalLabel={goalLabel}
      {...rest}
    />
  );
}
