import { hianime } from "@/lib/hianime";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await hianime.getInfo(id, { timeout: 10000, retries: 1 });
    return Response.json({ data });
  } catch (err) {
    console.error('Anime info error:', err);
    return Response.json({ 
      error: "Failed to fetch anime info",
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
