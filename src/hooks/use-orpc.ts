'use client'

import { useORPC } from '@/lib/orpc-integration'

// Custom hook for health check
export function useHealth() {
  const { health } = useORPC()
  
  const check = async () => {
    try {
      const result = await health.check()
      return result
    } catch (error) {
      console.error('Health check failed:', error)
      throw error
    }
  }

  return { check }
}

// Custom hook for home page data
export function useHomePage() {
  const { home } = useORPC()
  
  const getHomePage = async () => {
    try {
      const result = await home.getHomePage()
      return result
    } catch (error) {
      console.error('Failed to fetch home page:', error)
      throw error
    }
  }

  return { getHomePage }
}

// Custom hook for search functionality
export function useSearch() {
  const { search } = useORPC()
  
  const searchAnime = async (params: { q: string; page?: number; filters?: any }) => {
    try {
      const result = await search.search(params)
      return result
    } catch (error) {
      console.error('Search failed:', error)
      throw error
    }
  }

  const suggestions = async (params: { q: string }) => {
    try {
      const result = await search.suggestions(params)
      return result
    } catch (error) {
      console.error('Search suggestions failed:', error)
      throw error
    }
  }

  return { search: searchAnime, suggestions }
}

// Custom hook for anime data
export function useAnime() {
  const { anime } = useORPC()
  
  const getInfo = async (params: { id: string }) => {
    try {
      const result = await anime.getInfo(params)
      return result
    } catch (error) {
      console.error('Failed to get anime info:', error)
      throw error
    }
  }

  const getEpisodes = async (params: { id: string }) => {
    try {
      const result = await anime.getEpisodes(params)
      return result
    } catch (error) {
      console.error('Failed to get episodes:', error)
      throw error
    }
  }

  return { getInfo, getEpisodes }
}

// Custom hook for episode data
export function useEpisode() {
  const { episode } = useORPC()
  
  const getServers = async (params: { episodeId: string }) => {
    try {
      const result = await episode.getServers(params)
      return result
    } catch (error) {
      console.error('Failed to get episode servers:', error)
      throw error
    }
  }

  const getSources = async (params: { 
    episodeId: string; 
    server?: string; 
    category?: string 
  }) => {
    try {
      const result = await episode.getSources(params)
      return result
    } catch (error) {
      console.error('Failed to get episode sources:', error)
      throw error
    }
  }

  return { getServers, getSources }
}

// Custom hook for schedule data
export function useSchedule() {
  const { schedule } = useORPC()
  
  const getEstimated = async (params?: { date?: string }) => {
    try {
      const result = await schedule.getEstimated(params)
      return result
    } catch (error) {
      console.error('Failed to get schedule:', error)
      throw error
    }
  }

  return { getEstimated }
}