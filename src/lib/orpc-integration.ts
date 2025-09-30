// Simple ORPC-style API integration using existing endpoints

export interface HealthResponse {
  status: string
}

export interface HomePageResponse {
  data: any
}

export interface SearchResponse {
  data: any
}

export interface AnimeResponse {
  data: any
}

export interface EpisodeResponse {
  data: any
}

export interface ScheduleResponse {
  data: any
}

// Simple typed client for existing API endpoints
export class ORPCClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // Use relative URL in production, fallback to localhost for development
    this.baseUrl = baseUrl || (typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api')
  }

  private async request<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Health check
  async healthCheck(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health')
  }

  // Home page
  async getHomePage(): Promise<HomePageResponse> {
    return this.request<HomePageResponse>('/home')
  }

  // Search
  async search(params: { q: string; page?: number; filters?: any }): Promise<SearchResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', params.q)
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString())
        }
      })
    }
    
    return this.request<SearchResponse>(`/search?${queryParams.toString()}`)
  }

  async searchSuggestions(params: { q: string }): Promise<SearchResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('q', params.q)
    
    return this.request<SearchResponse>(`/search/suggestion?${queryParams.toString()}`)
  }

  // Anime
  async getAnimeInfo(params: { id: string }): Promise<AnimeResponse> {
    return this.request<AnimeResponse>(`/anime/${params.id}`)
  }

  async getAnimeEpisodes(params: { id: string }): Promise<AnimeResponse> {
    return this.request<AnimeResponse>(`/anime/${params.id}/episodes`)
  }

  // Episodes
  async getEpisodeServers(params: { episodeId: string }): Promise<EpisodeResponse> {
    return this.request<EpisodeResponse>(`/episode/servers?animeEpisodeId=${encodeURIComponent(params.episodeId)}`)
  }

  async getEpisodeSources(params: { 
    episodeId: string; 
    server?: string; 
    category?: string 
  }): Promise<EpisodeResponse> {
    const queryParams = new URLSearchParams()
    queryParams.append('animeEpisodeId', encodeURIComponent(params.episodeId))
    if (params.server) queryParams.append('server', params.server)
    if (params.category) queryParams.append('category', params.category)
    
    return this.request<EpisodeResponse>(`/episode/sources?${queryParams.toString()}`)
  }

  // Schedule
  async getSchedule(params?: { date?: string }): Promise<ScheduleResponse> {
    const queryParams = new URLSearchParams()
    if (params?.date) queryParams.append('date', params.date)
    
    return this.request<ScheduleResponse>(`/schedule?${queryParams.toString()}`)
  }
}

// Create default instance
export const orpcClient = new ORPCClient()

// React hooks
export function useORPC() {
  return {
    health: {
      check: () => orpcClient.healthCheck(),
    },
    home: {
      getHomePage: () => orpcClient.getHomePage(),
    },
    search: {
      search: (params: { q: string; page?: number; filters?: any }) => 
        orpcClient.search(params),
      suggestions: (params: { q: string }) => 
        orpcClient.searchSuggestions(params),
    },
    anime: {
      getInfo: (params: { id: string }) => 
        orpcClient.getAnimeInfo(params),
      getEpisodes: (params: { id: string }) => 
        orpcClient.getAnimeEpisodes(params),
    },
    episode: {
      getServers: (params: { episodeId: string }) => 
        orpcClient.getEpisodeServers(params),
      getSources: (params: { 
        episodeId: string; 
        server?: string; 
        category?: string 
      }) => orpcClient.getEpisodeSources(params),
    },
    schedule: {
      getEstimated: (params?: { date?: string }) => 
        orpcClient.getSchedule(params),
    },
  }
}