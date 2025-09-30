import { GET_HOME_PAGE_DATA } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IAnimeData } from "@/types/anime";
import { useQuery } from "react-query";

const getHomePageData = async () => {
    const res = await orpcClient.getHomePage();
    return res.data as IAnimeData;
};

export const useGetHomePageData = () => {
    return useQuery({
        queryFn: getHomePageData,
        queryKey: [GET_HOME_PAGE_DATA],
        refetchOnWindowFocus: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 10, // 10 minutes
    });
};