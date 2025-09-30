import { GET_EPISODE_DATA } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IEpisodeSource } from "@/types/episodes";
import { useQuery } from "react-query";

const getEpisodeData = async (
  episodeId: string,
  server: string | undefined,
  subOrDub: string,
) => {
  const res = await orpcClient.getEpisodeSources({
    episodeId: decodeURIComponent(episodeId),
    server: server,
    category: subOrDub,
  });
  return res.data as IEpisodeSource;
};

export const useGetEpisodeData = (
  episodeId: string,
  server: string | undefined,
  subOrDub: string = "sub",
) => {
  return useQuery({
    queryFn: () => getEpisodeData(episodeId, server, subOrDub),
    queryKey: [GET_EPISODE_DATA, episodeId, server, subOrDub],
    refetchOnWindowFocus: false,
    enabled: server !== "",
    // Keep data for 5 minutes to reduce unnecessary refetches when switching episodes
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes
    cacheTime: 10 * 60 * 1000,
    // Keep previous data while fetching new to prevent loading states
    keepPreviousData: true,
  });
};