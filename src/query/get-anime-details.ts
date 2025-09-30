import { GET_ANIME_DETAILS } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IAnimeDetails } from "@/types/anime-details";
import { useQuery } from "react-query";

const getAnimeDetails = async (animeId: string) => {
  const res = await orpcClient.getAnimeInfo({ id: animeId });
  return res.data as IAnimeDetails;
};

export const useGetAnimeDetails = (animeId: string) => {
  return useQuery({
    queryFn: () => getAnimeDetails(animeId),
    queryKey: [GET_ANIME_DETAILS, animeId],
    refetchOnWindowFocus: false,
    // Anime details rarely change - cache for 15 minutes
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    // Keep previous data during navigation to prevent loading flicker
    keepPreviousData: true,
  });
};