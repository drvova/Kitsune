# ORPC Integration

This project now includes a simple ORPC-style integration that provides a type-safe way to interact with your existing API endpoints.

## What's Included

### 1. Typed API Client (`src/lib/orpc-integration.ts`)
- Provides type-safe methods for all existing API endpoints
- Handles URL building and parameter encoding automatically
- Includes error handling and response typing

### 2. React Hooks (`src/hooks/use-orpc.ts`)
- Custom hooks for easy usage in React components
- Type-safe and include error handling
- Mirror the structure of the API client

## Installation

The following packages were installed:
- `@orpc/server@latest`
- `@orpc/client@latest`
- `@orpc/react@latest`
- `@orpc/standard-server-fetch@latest`

## Usage

### Using the API Client Directly

```typescript
import { orpcClient } from '@/lib/orpc-integration'

// Health check
const health = await orpcClient.healthCheck()

// Get home page data
const homeData = await orpcClient.getHomePage()

// Search anime
const searchResults = await orpcClient.search({
  q: 'Attack on Titan',
  page: 1,
  filters: { type: 'tv' }
})

// Get anime info
const animeInfo = await orpcClient.getAnimeInfo({ id: 'attack-on-titan' })

// Get episodes
const episodes = await orpcClient.getAnimeEpisodes({ id: 'attack-on-titan' })

// Get episode servers
const servers = await orpcClient.getEpisodeServers({ episodeId: 'episode-1' })

// Get episode sources
const sources = await orpcClient.getEpisodeSources({
  episodeId: 'episode-1',
  server: 'hd-1',
  category: 'sub'
})

// Get schedule
const schedule = await orpcClient.getSchedule({ date: '2024-01-01' })
```

### Using React Hooks

```typescript
import { useHealth, useHomePage, useSearch, useAnime, useEpisode, useSchedule } from '@/hooks/use-orpc'

function MyComponent() {
  const { check } = useHealth()
  const { getHomePage } = useHomePage()
  const { search, suggestions } = useSearch()
  const { getInfo, getEpisodes } = useAnime()
  const { getServers, getSources } = useEpisode()
  const { getEstimated } = useSchedule()

  const handleSearch = async () => {
    try {
      const results = await search({ q: 'Attack on Titan' })
      console.log('Search results:', results)
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  return (
    <button onClick={handleSearch}>
      Search Anime
    </button>
  )
}
```

## API Endpoints

The integration covers all existing API endpoints:

### Health
- `GET /api/health` → `orpcClient.healthCheck()`

### Home
- `GET /api/home` → `orpcClient.getHomePage()`

### Search
- `GET /api/search` → `orpcClient.search(params)`
- `GET /api/search/suggestion` → `orpcClient.searchSuggestions(params)`

### Anime
- `GET /api/anime/[id]` → `orpcClient.getAnimeInfo(params)`
- `GET /api/anime/[id]/episodes` → `orpcClient.getAnimeEpisodes(params)`

### Episodes
- `GET /api/episode/servers` → `orpcClient.getEpisodeServers(params)`
- `GET /api/episode/sources` → `orpcClient.getEpisodeSources(params)`

### Schedule
- `GET /api/schedule` → `orpcClient.getSchedule(params)`

## Type Safety

All methods are fully typed with TypeScript interfaces:
- `HealthResponse`
- `HomePageResponse`
- `SearchResponse`
- `AnimeResponse`
- `EpisodeResponse`
- `ScheduleResponse`

## Error Handling

All methods include built-in error handling:
- HTTP status code checking
- Error logging
- Proper error throwing for try/catch blocks

## Configuration

The client uses `http://localhost:3000/api` as the default base URL. You can customize this when creating an instance:

```typescript
import { ORPCClient } from '@/lib/orpc-integration'

const customClient = new ORPCClient('https://your-api.com/api')
```

## Future Enhancements

This integration provides a foundation that can be enhanced with:
- Request/response interceptors
- Caching
- Retry logic
- Authentication
- Real-time updates
- Query caching (with React Query/TanStack Query)

The current implementation focuses on providing a clean, type-safe interface to your existing API while maintaining compatibility with your current architecture.