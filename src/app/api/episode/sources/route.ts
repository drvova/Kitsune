import { hianime } from "@/lib/hianime";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const episodeId = searchParams.get("animeEpisodeId") as string;
    const server = searchParams.get("server") as string;
    const category = searchParams.get("category") as "sub" | "dub" | "raw";

    if (!episodeId) {
      return Response.json({ error: "Missing episodeId parameter" }, { status: 400 });
    }

    try {
      const data = await hianime.getEpisodeSources(
        decodeURIComponent(episodeId),
        server,
        category,
        { timeout: 20000, retries: 2 }
      );

      return Response.json({ data });
    } catch (error) {
      console.error('All episode sources attempts failed:', error);
      return Response.json({
        error: "No working servers found for this episode",
        details: error instanceof Error ? error.message : "All available servers failed to provide sources",
        suggestion: "Try again later or check if the episode is available"
      }, { status: 404 });
    }

  } catch (err) {
    console.error('Episode sources error:', err);
    return Response.json({ 
      error: "Failed to fetch episode sources",
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
