"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import EpisodeCard from "./common/episode-card";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  animeId: string;
};

const AnimeEpisodes = ({ animeId }: Props) => {
  const { data, isLoading } = useGetAllEpisodes(animeId);

  const [selectedRange, setSelectedRange] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Memoize all episodes to prevent recreation
  const allEpisodes = useMemo(() => data?.episodes || [], [data?.episodes]);

  // Memoize ranges calculation
  const ranges = useMemo(() => {
    if (allEpisodes.length <= 50) return [];

    const rangesArray = [];
    for (let i = 0; i < allEpisodes.length; i += 50) {
      const start = i + 1;
      const end = Math.min(i + 50, allEpisodes.length);
      rangesArray.push(`${start}-${end}`);
    }
    return rangesArray;
  }, [allEpisodes.length]);

  // Initialize selected range once when ranges are available
  useEffect(() => {
    if (ranges.length > 0 && !selectedRange) {
      setSelectedRange(ranges[0]);
    }
  }, [ranges, selectedRange]);

  // Memoize filtered episodes based on range and search
  const filteredEpisodes = useMemo(() => {
    let result = allEpisodes;

    // Apply range filter if we have ranges
    if (ranges.length > 0 && selectedRange) {
      const [start, end] = selectedRange.split("-").map(Number);
      result = allEpisodes.filter(
        (_, index) => index + 1 >= start && index + 1 <= end
      );
    }

    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((episode, index) => {
        return (
          (index + 1).toString().includes(query) ||
          episode.title.toLowerCase().includes(query) ||
          "episode".includes(query.trim())
        );
      });
    }

    return result;
  }, [allEpisodes, ranges.length, selectedRange, searchQuery]);

  // Memoize handlers
  const handleRangeChange = useCallback((range: string) => {
    setSelectedRange(range);
    setSearchQuery(""); // Clear search when changing range
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <>
      <div className="flex w-full items-center justify-between">
        <h3 className="text-xl font-semibold">Episodes</h3>
        <div className="flex items-center gap-2">
          {ranges.length > 0 && (
            <Select onValueChange={handleRangeChange} value={selectedRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue
                  className="text-white"
                  placeholder="Select Range"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ranges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <div className="relative max-w-[21.875rem] ">
            <Search className="absolute inset-y-0 left-2 m-auto h-4 w-4" />
            <Input
              placeholder="Search for episode..."
              className=" w-full pl-8 text-white border-white"
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>
      <div data-testid="episode-list" className="grid lg:grid-cols-5 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 w-full gap-5 content-center">
        {filteredEpisodes.map((episode, idx) => (
          <EpisodeCard
            episode={episode}
            key={episode.episodeId || idx}
            className="self-center justify-self-center"
            animeId={animeId}
          />
        ))}
        {!filteredEpisodes.length && !isLoading && (
          <div className="lg:col-span-5 col-span-2 sm:col-span-3 md:col-span-4 xl:col-span-6 2xl:col-span-7 flex items-center justify-center py-10 bg-slate-900 rounded-md">
            No Episodes
          </div>
        )}
        {isLoading &&
          Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className={cn([
                "h-[6.25rem] rounded-lg cursor-pointer w-full flex items-center justify-center animate-pulse bg-slate-800",
                "self-center justify-self-center",
              ])}
            ></div>
          ))}
      </div>
    </>
  );
};

export default AnimeEpisodes;
