import { useSearchParams } from "react-router-dom";
import { useDataStatus } from "./useDataStatus";
import { PRESETS, rangeForPreset } from "../utils/datePresets";
import { formatWeekEndingLabel } from "../utils/weekCalendar";

const DEFAULT_PRESET = "last12weeks";

// Lives in the URL (?preset=&from=&to=), the same pattern as usePeriod —
// shareable via link, no separate global store, and it combines cleanly
// with ?period= since they're independent query params.
export function useDateRange() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: status } = useDataStatus();
  const anchor = status?.latestDataWeekEnding ?? null;

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const rawPreset = searchParams.get("preset");
  const preset = PRESETS.some((p) => p.value === rawPreset) ? rawPreset : from && to ? "custom" : DEFAULT_PRESET;

  const resolved = preset === "custom" ? (from && to ? { from, to } : null) : rangeForPreset(preset, anchor);

  function setPreset(nextPreset, customRange) {
    const params = new URLSearchParams(searchParams);
    const range = nextPreset === "custom" ? customRange : rangeForPreset(nextPreset, anchor);
    if (nextPreset === DEFAULT_PRESET || !range) {
      params.delete("from");
      params.delete("to");
      params.delete("preset");
    } else {
      params.set("from", range.from);
      params.set("to", range.to);
      params.set("preset", nextPreset);
    }
    setSearchParams(params, { replace: true });
  }

  return { preset, from: resolved?.from ?? null, to: resolved?.to ?? null, anchor, setPreset };
}

export function useDateRangeLabel() {
  const { preset, from, to } = useDateRange();
  const presetDef = PRESETS.find((p) => p.value === preset);
  if (preset !== "custom") return presetDef?.label ?? PRESETS[0].label;
  if (from && to) return `${formatWeekEndingLabel(from)} – ${formatWeekEndingLabel(to)}`;
  return "Custom range";
}
