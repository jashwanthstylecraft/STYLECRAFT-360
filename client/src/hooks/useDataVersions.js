import { useQuery } from "@tanstack/react-query";
import { fetchDataVersions } from "../services/api";

export function useDataVersions() {
  return useQuery({
    queryKey: ["data-versions"],
    queryFn: fetchDataVersions,
  });
}
