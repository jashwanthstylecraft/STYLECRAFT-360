import { useQuery } from "@tanstack/react-query";
import { fetchInventoryMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useInventoryMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["inventory-metrics", from, to, period],
    queryFn: () => fetchInventoryMetrics({ from, to, period }),
  });
}
