import { useQuery } from "@tanstack/react-query";
import { fetchMetricDetail } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useMetricDetail(department, slug) {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["metric-detail", department, slug, from, to, period],
    queryFn: () => fetchMetricDetail(department, slug, { from, to, period }),
    enabled: Boolean(department && slug),
  });
}
