import { useQuery } from "@tanstack/react-query";
import { fetchSalesMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useSalesMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["sales-metrics", from, to, period],
    queryFn: () => fetchSalesMetrics({ from, to, period }),
  });
}
