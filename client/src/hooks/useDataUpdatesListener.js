import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateAllDataQueries } from "./dataQueryKeys";

// Mounted once at the app root. When an upload is applied (or a version is
// restored) anywhere, every open tab's charts re-fetch and animate to the
// new values — no reload, no per-page wiring needed.
export function useDataUpdatesListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/data/stream");
    source.addEventListener("data-updated", () => invalidateAllDataQueries(queryClient));
    return () => source.close();
  }, [queryClient]);
}
