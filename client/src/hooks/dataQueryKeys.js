// Every React Query key that depends on department data (values, goals, or
// anything derived from them) — the ONE list both useDataUpdatesListener.js
// (the SSE-driven cross-tab invalidation) and DataUpload.jsx (same-tab
// immediate feedback, ahead of the SSE round-trip) invalidate from. A new
// hook that reads department data must add its key here, or it silently
// goes stale after every save/upload/restore — exactly the bug that
// motivated pulling this out of two separately-maintained copies.
export const DATA_DEPENDENT_QUERY_KEYS = [
  "sales-metrics",
  "inventory-metrics",
  "finance-metrics",
  "operations-metrics",
  "home-summary",
  "home-insights",
  "metric-detail",
  "data-status",
  "data-versions",
  "entry-data",
  "entry-coverage",
];

export function invalidateAllDataQueries(queryClient) {
  for (const queryKey of DATA_DEPENDENT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }
}
