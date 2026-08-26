import { useQuery } from "@tanstack/react-query";
import { fetchMarketingMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useMarketingMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["marketing-metrics", from, to, period],
    queryFn: () => fetchMarketingMetrics({ from, to, period }),
  });
}
