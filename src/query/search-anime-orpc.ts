import { SEARCH_ANIME } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { ISuggestionAnime } from "@/types/anime";
import { useQuery } from "react-query";

const searchAnime = async (q: string) => {
  if (q === "") {
    return;
  }
  const res = await orpcClient.searchSuggestions({ q });
  return res.data.data.suggestions as ISuggestionAnime[];
};

export const useSearchAnime = (query: string) => {
  return useQuery({
    queryFn: () => searchAnime(query),
    queryKey: [SEARCH_ANIME, query],
  });
};