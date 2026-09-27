import { sendSponsorActivatedEmail } from "@/lib/notifications/sponsor-email";
import { appwriteMessagingIsConfigured } from "@/lib/notifications/appwrite-messaging";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not found." }, { status: 404 });
  }

  if (!appwriteMessagingIsConfigured()) {
    return Response.json({ error: "Appwrite Messaging is not configured." }, { status: 503 });
  }

  let body: { to?: unknown };
  try {
    body = (await request.json()) as { to?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return Response.json({ error: "Provide a valid `to` email address." }, { status: 400 });
  }

  try {
    await sendSponsorActivatedEmail({
      email: to,
      companyName: "StayLokal SMTP test",
      paymentId: `pay_test_${Date.now()}`,
      rank: "1",
      bid: "$25.00",
    });
    return Response.json({ sent: true, to });
  } catch (error) {
    console.error("Dev sponsor email test failed:", error);
    return Response.json({
      error: error instanceof Error ? error.message : "Unable to send test email.",
    }, { status: 502 });
  }
}
