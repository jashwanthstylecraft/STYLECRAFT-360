import { useQuery } from "@tanstack/react-query";
import { fetchFinanceMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useFinanceMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["finance-metrics", from, to, period],
    queryFn: () => fetchFinanceMetrics({ from, to, period }),
  });
}
