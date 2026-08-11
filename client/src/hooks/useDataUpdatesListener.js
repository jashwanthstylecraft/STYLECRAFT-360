import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Mounted once at the app root. When an upload is applied (or a version is
// restored) anywhere, every open tab's charts re-fetch and animate to the
// new values — no reload, no per-page wiring needed.
export function useDataUpdatesListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/data/stream");

    source.addEventListener("data-updated", () => {
      queryClient.invalidateQueries({ queryKey: ["sales-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["finance-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["operations-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
      queryClient.invalidateQueries({ queryKey: ["data-status"] });
      queryClient.invalidateQueries({ queryKey: ["data-versions"] });
      queryClient.invalidateQueries({ queryKey: ["entry-data"] });
      queryClient.invalidateQueries({ queryKey: ["entry-coverage"] });
    });

    return () => source.close();
  }, [queryClient]);
}
