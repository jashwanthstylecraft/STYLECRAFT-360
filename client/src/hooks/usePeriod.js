import { useSearchParams } from "react-router-dom";

const VALID_PERIODS = ["weekly", "monthly", "quarterly", "yearly"];
const DEFAULT_PERIOD = "weekly";

const PERIOD_DELTA_LABEL = {
  weekly: "WoW",
  monthly: "MoM",
  quarterly: "QoQ",
  yearly: "YoY",
};

// The period lives in the URL (?period=monthly), not localStorage — per
// spec this needs to be shareable via link, and it should stay in sync
// across every page without a separate global store.
export function usePeriod() {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get("period");
  const period = VALID_PERIODS.includes(raw) ? raw : DEFAULT_PERIOD;

  function setPeriod(next) {
    const params = new URLSearchParams(searchParams);
    if (next === DEFAULT_PERIOD) params.delete("period");
    else params.set("period", next);
    setSearchParams(params, { replace: true });
  }

  return { period, setPeriod, deltaLabel: PERIOD_DELTA_LABEL[period] };
}

export { VALID_PERIODS, PERIOD_DELTA_LABEL };
