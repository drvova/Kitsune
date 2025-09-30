import { GET_ALL_EPISODES } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IEpisodes } from "@/types/episodes";
import { useQuery } from "react-query";

const getAllEpisodes = async (animeId: string) => {
    const res = await orpcClient.getAnimeEpisodes({ id: animeId });
    return res.data as IEpisodes;
};

export const useGetAllEpisodes = (animeId: string) => {
    return useQuery({
        queryFn: () => getAllEpisodes(animeId),
        queryKey: [GET_ALL_EPISODES, animeId],
        refetchOnWindowFocus: false,
        // Episode lists rarely change - cache for 10 minutes
        staleTime: 10 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    });
};