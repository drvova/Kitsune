import { useAuthStore } from "@/store/auth-store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getUserBookmarks,
  createOrUpdateBookmark,
  syncWatchProgress as syncWatchProgressLocal,
  getBookmarkByUserAndAnime,
  BookmarkWithHistory,
  WatchHistory
} from "@/lib/bookmarks-local";

type Props = {
  animeID?: string;
  status?: string;
  page?: number;
  per_page?: number;
  populate?: boolean;
};

export type Bookmark = BookmarkWithHistory;
export type { WatchHistory };

function useBookMarks({
  animeID,
  status,
  page,
  per_page,
  populate = true,
}: Props) {
  const { auth } = useAuthStore();
  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const filterParts = [];

  if (animeID) {
    filterParts.push(`animeId='${animeID}'`);
  }

  if (status) {
    filterParts.push(`status='${status}'`);
  }

  const filters = filterParts.join(" && ");

  useEffect(() => {
    if (!populate || !auth) return;
    const getBookmarksData = () => {
      try {
        setIsLoading(true);
        const userBookmarks = getUserBookmarks(auth.id, {
          animeId: animeID,
          status: status
        });

        // Simple pagination (in real app, you'd implement proper pagination)
        const startIndex = ((page || 1) - 1) * (per_page || 10);
        const endIndex = startIndex + (per_page || 10);
        const paginatedBookmarks = userBookmarks.slice(startIndex, endIndex);
        
        setTotalPages(Math.ceil(userBookmarks.length / (per_page || 10)));
        setBookmarks(paginatedBookmarks.length > 0 ? paginatedBookmarks : null);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.log(error);
      }
    };

    getBookmarksData();
  }, [animeID, status, page, per_page, filters, auth, populate]);

  const createOrUpdateBookMark = async (
    animeID: string,
    animeTitle: string,
    animeThumbnail: string,
    status: string,
    showToast: boolean = true,
  ): Promise<string | null> => {
    if (!auth) {
      return null;
    }
    try {
      const existingBookmark = getBookmarkByUserAndAnime(auth.id, animeID);

      if (existingBookmark) {
        if (existingBookmark.status === status) {
          if (showToast) {
            toast.error("Already in this status", {
              style: { background: "red" },
            });
          }
          return existingBookmark.id;
        }

        const result = createOrUpdateBookmark(auth.id, animeID, animeTitle, animeThumbnail, status as any);

        if (result.success && result.bookmark) {
          if (showToast) {
            toast.success("Successfully updated status", {
              style: { background: "green" },
            });
          }
          return result.bookmark.id;
        }
      } else {
        const result = createOrUpdateBookmark(auth.id, animeID, animeTitle, animeThumbnail, status as any);

        if (result.success && result.bookmark) {
          if (showToast) {
            toast.success("Successfully added to list", {
              style: { background: "green" },
            });
          }
          return result.bookmark.id;
        }
      }
      return null;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const syncWatchProgress = async (
    bookmarkId: string | null,
    watchedRecordId: string | null,
    episodeData: {
      episodeId: string;
      episodeNumber: number;
      current: number;
      duration: number;
    },
  ): Promise<string | null> => {
    if (!auth || !bookmarkId) return watchedRecordId;

    try {
      const result = syncWatchProgressLocal(bookmarkId, episodeData);
      
      if (result.success) {
        return result.watchHistoryId || watchedRecordId;
      } else {
        console.error("Error syncing watch progress:", result.error);
        return watchedRecordId;
      }
    } catch (error) {
      console.error("Error syncing watch progress:", error);
      return watchedRecordId;
    }
  };

  return {
    bookmarks,
    syncWatchProgress,
    createOrUpdateBookMark,
    totalPages,
    isLoading,
  };
}

export default useBookMarks;
