import { useQuery } from "@tanstack/react-query";
import { fetchDataStatus } from "../services/api";

export function useDataStatus() {
  return useQuery({
    queryKey: ["data-status"],
    queryFn: fetchDataStatus,
  });
}
