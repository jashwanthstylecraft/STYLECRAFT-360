import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEntryData, fetchEntryCoverage, saveEntryWeek, setGoalRange } from "../services/api";
import { invalidateAllDataQueries } from "./dataQueryKeys";

export function useEntryData(weekEnding) {
  return useQuery({
    queryKey: ["entry-data", weekEnding ?? "default"],
    queryFn: () => fetchEntryData(weekEnding),
  });
}

export function useEntryCoverage() {
  return useQuery({
    queryKey: ["entry-coverage"],
    queryFn: fetchEntryCoverage,
    staleTime: 60_000,
  });
}

// commitSnapshot() broadcasts a data-updated SSE event on every save, which
// useDataUpdatesListener() (mounted once at the app root) turns into a full
// invalidation of every chart/entry query in every OTHER open tab — but on
// Vercel, SSE is off (VITE_ENABLE_SSE=false) and that listener falls back
// to polling every 10 minutes, so the tab that just saved wouldn't see its
// own change reflected until the next poll (e.g. a cleared note appeared
// to "come back" — it hadn't, the field was just still showing the stale
// pre-save data). Invalidating right here gives the saving tab its own
// update immediately, regardless of SSE/poll state; other open tabs still
// rely on the broadcast, same as before.
export function useSaveEntryWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ weekEnding, entries, note }) => saveEntryWeek(weekEnding, entries, note),
    onSuccess: () => invalidateAllDataQueries(queryClient),
  });
}

// Same reasoning as useSaveEntryWeek above — also routes through
// commitSnapshot(), so it has the identical same-tab staleness gap.
export function useSetGoalRange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params) => setGoalRange(params),
    onSuccess: () => invalidateAllDataQueries(queryClient),
  });
}
