import { HiAnime } from "aniwatch";

// Create a function to get or recreate the scraper instance
let baseHianime: HiAnime.Scraper | null = null;

function getScraper(): HiAnime.Scraper {
  if (!baseHianime) {
    baseHianime = new HiAnime.Scraper();
  }
  return baseHianime;
}

// Function to reset the scraper if it becomes corrupted
function resetScraper(): void {
  baseHianime = null;
}

export interface SafeHianimeCallOptions {
  timeout?: number;
  fallback?: any;
  retries?: number;
}

class SafeHianimeWrapper {
  private static async safeCall<T>(
    fn: () => Promise<T>,
    options: SafeHianimeCallOptions = {}
  ): Promise<T> {
    const { timeout = 10000, fallback = null, retries = 1 } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
        });

        const result = await Promise.race([
          fn(),
          timeoutPromise
        ]);

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`Attempt ${attempt} failed:`, errorMessage);

        // If worker has exited, reset the scraper instance
        if (errorMessage.includes('worker has exited') || errorMessage.includes('worker')) {
          console.log('Worker error detected, resetting scraper instance...');
          resetScraper();
        }

        if (attempt === retries) {
          if (fallback !== null) {
            console.log('Returning fallback value');
            return fallback;
          }
          throw err;
        }

        // Wait before retry with exponential backoff
        const waitTime = 1000 * attempt;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw new Error('All retries failed');
  }

  async getInfo(id: string, options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => getScraper().getInfo(id), options);
  }

  async getEpisodes(id: string, options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => getScraper().getEpisodes(id), options);
  }

  async getEpisodeServers(episodeId: string, options?: SafeHianimeCallOptions) {
    try {
      return await SafeHianimeWrapper.safeCall(() => getScraper().getEpisodeServers(episodeId), options);
    } catch {
      // Return fallback servers if API fails
      console.log('Returning fallback servers');
      return [
        { name: 'HD-1', server: 'hd-1' },
        { name: 'HD-2', server: 'hd-2' },
        { name: 'MegaCloud', server: 'megacloud' },
        { name: 'StreamSB', server: 'streamsb' },
        { name: 'StreamTape', server: 'streamtape' }
      ];
    }
  }

  async getEpisodeSources(
    episodeId: string,
    server?: string,
    category?: string,
    options?: SafeHianimeCallOptions
  ) {
    const servers = server ? [server] : ['hd-1', 'hd-2', 'megacloud', 'streamsb', 'streamtape'];

    for (const currentServer of servers) {
      try {
        console.log(`Trying server: ${currentServer}`);
        const result = await SafeHianimeWrapper.safeCall(
          () => getScraper().getEpisodeSources(episodeId, currentServer as any, category as "sub" | "dub" | "raw" | undefined),
          { ...options, timeout: 15000, retries: 2 }
        );

        if (result && result.sources && result.sources.length > 0) {
          console.log(`Successfully found sources using server: ${currentServer}`);
          return result;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.log(`Server ${currentServer} failed:`, errorMessage);
        // Continue to next server
      }
    }

    throw new Error('No working servers found for this episode');
  }

  async search(q: string, page = 1, filters?: any, options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => getScraper().search(q, page, filters), { ...options, timeout: 15000 });
  }

  // Add missing methods
  async getHomePage(options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => getScraper().getHomePage(), options);
  }

  async searchSuggestions(q: string, options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => getScraper().searchSuggestions(q), options);
  }

  async getEstimatedSchedule(date?: string, options?: SafeHianimeCallOptions) {
    return SafeHianimeWrapper.safeCall(() => {
      const scraper = getScraper();
      if (date) {
        return scraper.getEstimatedSchedule(date);
      } else {
        return (scraper as any).getEstimatedSchedule();
      }
    }, options);
  }
}

export const hianime = new SafeHianimeWrapper();
