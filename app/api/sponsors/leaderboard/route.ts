import { appwriteIsConfigured, listActiveSponsors } from "../../../../lib/sponsors/appwrite";
import { rankSponsors } from "../../../../lib/sponsors/ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET() {
  if (!appwriteIsConfigured()) {
    return Response.json({ configured: false, sponsors: [] }, { headers: NO_STORE });
  }

  try {
    const sponsors = await listActiveSponsors();
    return Response.json(
      { configured: true, sponsors: rankSponsors(sponsors) },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("Sponsor leaderboard failed:", error);
    return Response.json({ configured: false, sponsors: [] }, { headers: NO_STORE, status: 503 });
  }
}
