import { useQuery } from "@tanstack/react-query";
import { fetchHomeInsights } from "../services/api";
import { useDateRange } from "./useDateRange";
import { useVisibilityFloor } from "./useVisibilityFloor";

export function useHomeInsights() {
  const { from, to } = useDateRange();
  const floor = useVisibilityFloor();
  // The seasonality heatmap deliberately ignores from/to server-side (it
  // always wants the full real history) — visibleFrom is the one way to
  // tell it to respect the visibility floor too.
  const visibleFrom = floor.enabled ? floor.from : null;

  return useQuery({
    queryKey: ["home-insights", from, to, visibleFrom],
    queryFn: () => fetchHomeInsights({ from, to, visibleFrom }),
  });
}
