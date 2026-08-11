import { useQuery } from "@tanstack/react-query";
import { fetchHomeInsights } from "../services/api";
import { useDateRange } from "./useDateRange";

export function useHomeInsights() {
  const { from, to } = useDateRange();
  return useQuery({
    queryKey: ["home-insights", from, to],
    queryFn: () => fetchHomeInsights({ from, to }),
  });
}
