import { hianime } from "@/lib/hianime";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const animeEpisodeId = searchParams.get("animeEpisodeId") as string;

    if (!animeEpisodeId) {
      return Response.json({ error: "Missing animeEpisodeId parameter" }, { status: 400 });
    }

    try {
      const data = await hianime.getEpisodeServers(
        decodeURIComponent(animeEpisodeId),
        { timeout: 10000, retries: 1 }
      );

      return Response.json({ data });
    } catch {
      console.log('Episode servers fetch failed, returning fallback servers');
      // Fallback is already handled in hianime.getEpisodeServers
      return Response.json({ 
        data: [
          { name: 'HD-1', server: 'hd-1' },
          { name: 'HD-2', server: 'hd-2' },
          { name: 'MegaCloud', server: 'megacloud' },
          { name: 'StreamSB', server: 'streamsb' },
          { name: 'StreamTape', server: 'streamtape' }
        ]
      });
    }

  } catch (err) {
    console.error('Episode servers error:', err);
    return Response.json({ 
      error: "Failed to fetch episode servers",
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
