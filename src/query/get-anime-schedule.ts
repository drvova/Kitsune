import { GET_ANIME_SCHEDULE } from "@/constants/query-keys";
import { orpcClient } from "@/lib/orpc-integration";
import { IAnimeSchedule } from "@/types/anime-schedule";
import { useQuery } from "react-query";

const getAnimeSchedule = async (date: string) => {
  const res = await orpcClient.getSchedule({ date });
  return res.data as IAnimeSchedule;
};

export const useGetAnimeSchedule = (date: string) => {
  return useQuery({
    queryFn: () => getAnimeSchedule(date),
    queryKey: [GET_ANIME_SCHEDULE, date],
  });
};