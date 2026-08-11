import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchEntryData, fetchEntryCoverage, saveEntryWeek } from "../services/api";

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
// useDataUpdatesListener() (mounted once at the app root) already turns
// into a full invalidation of every chart/entry query in every open tab —
// this mutation doesn't need to duplicate that itself.
export function useSaveEntryWeek() {
  return useMutation({
    mutationFn: ({ weekEnding, entries, note }) => saveEntryWeek(weekEnding, entries, note),
  });
}
