import { appwriteIsConfigured, listActiveSponsors } from "../../../../lib/sponsors/appwrite";
import { rankSponsors } from "../../../../lib/sponsors/ranking";

export const runtime = "nodejs";

export async function GET() {
  if (!appwriteIsConfigured()) {
    return Response.json({ configured: false, sponsors: [] });
  }

  try {
    const sponsors = await listActiveSponsors();
    return Response.json({ configured: true, sponsors: rankSponsors(sponsors) });
  } catch (error) {
    console.error("Sponsor leaderboard failed:", error);
    return Response.json({ configured: false, sponsors: [] }, { status: 503 });
  }
}
