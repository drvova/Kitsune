// LocalStorage-based bookmark and watch history utilities

import { generateId } from './auth-local';

export interface Bookmark {
  id: string;
  user: string;
  animeId: string;
  thumbnail: string;
  animeTitle: string;
  status: 'watching' | 'dropped' | 'plan to watch' | 'on hold' | 'completed';
  created: string;
  updated: string;
}

export interface WatchHistory {
  id: string;
  current: number;
  timestamp: number;
  episodeId: string;
  episodeNumber: number;
  created: string;
}

export interface BookmarkWithHistory extends Bookmark {
  watchHistory: WatchHistory[];
}

const BOOKMARKS_KEY = 'kitsune_bookmarks';
const WATCH_HISTORY_KEY = 'kitsune_watch_history';

// Get all bookmarks
export function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const bookmarks = localStorage.getItem(BOOKMARKS_KEY);
    return bookmarks ? JSON.parse(bookmarks) : [];
  } catch {
    return [];
  }
}

// Save bookmarks to localStorage
export function saveBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Failed to save bookmarks:', error);
  }
}

// Get watch history for a bookmark
export function getWatchHistory(bookmarkId: string): WatchHistory[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const history = localStorage.getItem(WATCH_HISTORY_KEY);
    const allHistory: WatchHistory[] = history ? JSON.parse(history) : [];
    return allHistory.filter(h => h.id === bookmarkId);
  } catch {
    return [];
  }
}

// Save watch history
export function saveWatchHistory(history: WatchHistory[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save watch history:', error);
  }
}

// Get bookmarks for a specific user
export function getUserBookmarks(userId: string, filters?: {
  animeId?: string;
  status?: string;
}): BookmarkWithHistory[] {
  const bookmarks = getBookmarks();
  const userBookmarks = bookmarks.filter(b => b.user === userId);
  
  let filtered = userBookmarks;
  
  if (filters?.animeId) {
    filtered = filtered.filter(b => b.animeId === filters.animeId);
  }
  
  if (filters?.status) {
    filtered = filtered.filter(b => b.status === filters.status);
  }
  
  // Sort by updated date (newest first)
  filtered.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
  
  // Add watch history to each bookmark
  return filtered.map(bookmark => ({
    ...bookmark,
    watchHistory: getWatchHistory(bookmark.id)
  }));
}

// Create or update bookmark
export function createOrUpdateBookmark(
  userId: string,
  animeId: string,
  animeTitle: string,
  thumbnail: string,
  status: 'watching' | 'dropped' | 'plan to watch' | 'on hold' | 'completed'
): { success: boolean; bookmark?: Bookmark; error?: string } {
  const bookmarks = getBookmarks();
  const existingIndex = bookmarks.findIndex(b => b.user === userId && b.animeId === animeId);
  
  const bookmarkData: Bookmark = {
    id: existingIndex >= 0 ? bookmarks[existingIndex].id : generateId(),
    user: userId,
    animeId,
    thumbnail,
    animeTitle,
    status,
    created: existingIndex >= 0 ? bookmarks[existingIndex].created : new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  if (existingIndex >= 0) {
    bookmarks[existingIndex] = bookmarkData;
  } else {
    bookmarks.push(bookmarkData);
  }
  
  saveBookmarks(bookmarks);
  
  return { success: true, bookmark: bookmarkData };
}

// Get bookmark by user and anime ID
export function getBookmarkByUserAndAnime(userId: string, animeId: string): Bookmark | null {
  const bookmarks = getBookmarks();
  return bookmarks.find(b => b.user === userId && b.animeId === animeId) || null;
}

// Delete bookmark
export function deleteBookmark(bookmarkId: string): void {
  const bookmarks = getBookmarks();
  const filtered = bookmarks.filter(b => b.id !== bookmarkId);
  saveBookmarks(filtered);
  
  // Also delete associated watch history
  const allHistory = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]') as WatchHistory[];
  const filteredHistory = allHistory.filter(h => h.id !== bookmarkId);
  saveWatchHistory(filteredHistory);
}

// Sync watch progress
export function syncWatchProgress(
  bookmarkId: string,
  episodeData: {
    episodeId: string;
    episodeNumber: number;
    current: number;
    duration: number;
  }
): { success: boolean; watchHistoryId?: string; error?: string } {
  try {
    const allHistory = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]') as WatchHistory[];
    const existingHistory = allHistory.find(h => h.id === bookmarkId && h.episodeId === episodeData.episodeId);
    
    const historyData: WatchHistory = {
      id: bookmarkId,
      current: Math.round(episodeData.current),
      timestamp: Math.round(episodeData.duration),
      episodeId: episodeData.episodeId,
      episodeNumber: episodeData.episodeNumber,
      created: existingHistory ? existingHistory.created : new Date().toISOString()
    };
    
    if (existingHistory) {
      const index = allHistory.indexOf(existingHistory);
      allHistory[index] = historyData;
    } else {
      allHistory.push(historyData);
    }
    
    saveWatchHistory(allHistory);
    
    return { success: true, watchHistoryId: historyData.id };
  } catch (error) {
    console.error('Error syncing watch progress:', error);
    return { success: false, error: 'Failed to sync watch progress' };
  }
}

// Get watch progress for a specific episode
export function getWatchProgress(bookmarkId: string, episodeId: string): WatchHistory | null {
  const history = getWatchHistory(bookmarkId);
  return history.find(h => h.episodeId === episodeId) || null;
}