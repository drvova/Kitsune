import { create } from 'zustand'
import { IAnimeDetails } from '@/types/anime-details'

interface IAnimeStore {
    anime: IAnimeDetails,
    setAnime: (state: IAnimeDetails) => void
    selectedEpisode: string,
    setSelectedEpisode: (state: string) => void
}

export const useAnimeStore = create<IAnimeStore>((set) => ({
    anime: {} as IAnimeDetails,
    setAnime: (state: IAnimeDetails) => set({ anime: state }),

    selectedEpisode: '',
    setSelectedEpisode: (state: string) => set({ selectedEpisode: state }),
}))

// Optimized selectors to prevent unnecessary re-renders
// Components should use these instead of subscribing to entire store
export const useSelectedEpisode = () => useAnimeStore(state => state.selectedEpisode)
export const useSetSelectedEpisode = () => useAnimeStore(state => state.setSelectedEpisode)
export const useAnime = () => useAnimeStore(state => state.anime)
export const useAnimeInfo = () => useAnimeStore(state => state.anime?.anime?.info)
export const useAnimeId = () => useAnimeStore(state => state.anime?.anime?.info?.id)
export const useAnimeName = () => useAnimeStore(state => state.anime?.anime?.info?.name)
export const useAnimePoster = () => useAnimeStore(state => state.anime?.anime?.info?.poster)
