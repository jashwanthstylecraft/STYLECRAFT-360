import { useQuery } from "@tanstack/react-query";
import { fetchCustomerServiceMetrics } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useCustomerServiceMetrics() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["customer-service-metrics", from, to, period],
    queryFn: () => fetchCustomerServiceMetrics({ from, to, period }),
  });
}
