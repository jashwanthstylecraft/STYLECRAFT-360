import { useQuery } from "@tanstack/react-query";
import { fetchHomeSummary } from "../services/api";
import { usePeriod } from "./usePeriod";
import { useDateRange } from "./useDateRange";

export function useHomeSummary() {
  const { period } = usePeriod();
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["home-summary", from, to, period],
    queryFn: () => fetchHomeSummary({ from, to, period }),
  });
}
