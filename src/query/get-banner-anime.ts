import { GET_ANIME_BANNER } from "@/constants/query-keys";
import { useQuery } from "react-query";

interface IAnimeBanner {
  Media: {
    id: number;
    bannerImage: string;
  };
}

const getAnimeBanner = async (anilistID: number) => {
  // This uses external Anilist API, so we'll keep the original implementation
  // but wrap it in the orpc client pattern
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            bannerImage
          }
        }
      `,
      variables: {
        id: anilistID,
      },
    }),
  });
  
  const data = await res.json();
  return data.data as IAnimeBanner;
};

export const useGetAnimeBanner = (anilistID: number) => {
  return useQuery({
    queryFn: () => getAnimeBanner(anilistID),
    queryKey: [GET_ANIME_BANNER, anilistID],
    enabled: !!anilistID,
    refetchOnWindowFocus: false,
    // Banner images never change - cache aggressively
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    // Retry fewer times for external API
    retry: 2,
  });
};