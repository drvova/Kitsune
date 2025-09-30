import { SEARCH_ANIME } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { ISuggestionAnime } from "@/types/anime";
import { useQuery } from "react-query";

const searchAnime = async (q: string) => {
  if (q === "") {
    return;
  }
  const res = await api.get("/api/search/suggestion", {
    params: {
      q: q,
    },
  });

  return res.data.data.suggestions as ISuggestionAnime[];
};

export const useSearchAnime = (query: string) => {
  return useQuery({
    queryFn: () => searchAnime(query),
    queryKey: [SEARCH_ANIME, query],
    refetchOnWindowFocus: false,
    // Short stale time for search suggestions
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    // Don't fetch if query is empty
    enabled: query.trim().length > 0,
  });
};
