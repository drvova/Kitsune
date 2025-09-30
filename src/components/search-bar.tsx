import React, { useState, useRef, useCallback, useTransition } from "react";
import { Input } from "./ui/input";
import { SearchIcon, SlidersHorizontal } from "lucide-react";
import useDebounce from "@/hooks/use-debounce";
import { useSearchAnime } from "@/query/search-anime";
import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Tooltip from "./common/tooltip";

const SearchBar = ({
  className,
  onAnimeClick,
}: {
  className?: string;
  onAnimeClick?: () => void;
}) => {
  const [searchValue, setSearchValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const debouncedValue = useDebounce(searchValue, 1000);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const { data: searchResults, isLoading } = useSearchAnime(debouncedValue);

  // Memoize handlers to prevent re-creation on every render
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(document.activeElement)
      ) {
        setIsFocused(false);
      }
    }, 100);
  }, []);

  const handleAnimeClick = useCallback(() => {
    setSearchValue("");
    setIsFocused(false);
    if (onAnimeClick) {
      onAnimeClick();
    }
  }, [onAnimeClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      // Use transition for non-blocking navigation
      startTransition(() => {
        router.push(`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`);
      });
      setIsFocused(false);
      if (onAnimeClick) {
        onAnimeClick();
      }
      setSearchValue("");
    }
  }, [searchValue, router, onAnimeClick]);

  // Memoize search results to prevent render on every search state change
  const displayLoading = isLoading || isPending;

  // Memoize result items to prevent recreation on every render
  const SearchResultItem = useCallback(({ anime, mobile = false }: { anime: any, mobile?: boolean }) => (
    <Link key={anime.id} href={ROUTES.ANIME_DETAILS + "/" + anime.id}>
      <div
        className={cn(
          "flex items-center gap-2 hover:bg-[#121212] rounded-md cursor-pointer",
          mobile ? "p-1" : "p-2 items-start gap-4"
        )}
        onClick={handleAnimeClick}
      >
        <div className={cn(
          "overflow-hidden rounded-md flex-shrink-0",
          mobile ? "h-[2.5rem] w-[1.875rem]" : "h-[6.25rem] w-[5rem]"
        )}>
          <Image
            src={anime.poster}
            alt={anime.name}
            height={100}
            width={100}
            className="h-full w-full object-cover"
          />
        </div>
        <div className={cn("flex flex-col gap-2", mobile && "text-sm")}>
          <h3 className={mobile ? "" : "line-clamp-2 text-sm"}>
            {!!anime.name ? anime.name : anime.jname}
          </h3>
          {!mobile && (
            <div>
              <div className="text-sm">{anime.type}</div>
              <p className="text-xs text-gray-300">
                {anime.moreInfo?.join(", ")}
              </p>
            </div>
          )}
          {mobile && (
            <div>
              <div className="text-xs">{anime.rank}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  ), [handleAnimeClick]);

  return (
    <div className={cn([" relative w-full min-h-fit", className])}>
      <SearchIcon className="absolute inset-y-0 left-2 m-auto h-4 w-4" />
      <Input
        data-testid="search-input"
        className="w-full h-10 pl-8 text-white border-white"
        placeholder="Enter your keywords to search..."
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        value={searchValue}
        onKeyDown={handleKeyDown}
      />
      <Button
        data-testid="search-button"
        variant="secondary"
        className="absolute  text-white right-2 top-1/2 -translate-y-1/2 h-2/3"
        onClick={() => {
          router.push(ROUTES.SEARCH + '?q=""');
        }}
      >
        <Tooltip side="bottom" content="Filter">
          <SlidersHorizontal className="h-4 w-4" />
        </Tooltip>
      </Button>
      {isFocused && searchValue && (
        <div
          ref={resultsRef}
          className="absolute w-full max-h-[40vh] hidden lg:flex overflow-y-auto flex-col gap-5 px-5 py-5 bg-secondary top-[110%] rounded-md"
        >
          <div className="grid grid-cols-1 gap-2">
            {(displayLoading || (!searchResults && !!searchValue)) &&
              [1, 2, 3, 4].map((_, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md p-2 bg-slate-700 animate-pulse"
                  >
                    <div className="min-h-[6.25rem] min-w-[5rem] overflow-hidden rounded-md"></div>
                  </div>
                );
              })}

            {searchResults?.map((anime) => (
              <SearchResultItem key={anime.id} anime={anime} />
            ))}
            <Link
              className="w-full"
              href={`${ROUTES.SEARCH}?q=${encodeURIComponent(searchValue)}`}
            >
              <Button className="w-full bg-[#e9376b] text-white">
                Show More
              </Button>
            </Link>
          </div>
        </div>
      )}

      {isFocused && searchValue && (
        <div
          ref={resultsRef}
          className="absolute w-full h-fit lg:hidden flex flex-col gap-2 px-1 py-2 bg-secondary top-[110%] rounded-md"
        >
          <div className="flex flex-col gap-1">
            {(displayLoading || (!searchResults && !!searchValue)) &&
              [1, 2, 3, 4, 5].map((_, idx) => {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md p-2 bg-slate-700 animate-pulse"
                  >
                    <div className="min-h-[2.25rem] min-w-[1.875rem] overflow-hidden rounded-md"></div>
                  </div>
                );
              })}

            {searchResults?.slice(0, 5).map((anime) => (
              <SearchResultItem key={anime.id} anime={anime} mobile />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
