import { SEARCH_ANIME } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IAnimeSearch, SearchAnimeParams } from "@/types/anime";
import { useQuery } from "react-query";

const searchAnime = async (params: SearchAnimeParams) => {
  const res = await orpcClient.search(params);
  return res.data as IAnimeSearch;
};

export const useGetSearchAnimeResults = (params: SearchAnimeParams) => {
  return useQuery({
    queryFn: () => searchAnime(params),
    queryKey: [SEARCH_ANIME, { ...params }],
    refetchOnWindowFocus: false,
    // Cache search results for 5 minutes
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    // Keep previous data during pagination to prevent layout shifts
    keepPreviousData: true,
  });
};