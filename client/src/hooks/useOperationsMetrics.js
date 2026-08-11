import { useQuery } from "@tanstack/react-query";
import { fetchOperationsMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useOperationsMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["operations-metrics", from, to, period],
    queryFn: () => fetchOperationsMetrics({ from, to, period }),
  });
}
