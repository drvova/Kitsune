import { hianime } from "@/lib/hianime";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const { id } = params;
    const data = await hianime.getEpisodes(id, { timeout: 10000, retries: 1 });
    return Response.json({ data });
  } catch (err) {
    console.error('Episodes error:', err);
    return Response.json({ 
      error: "Failed to fetch episodes",
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
