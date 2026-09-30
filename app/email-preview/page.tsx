import { notFound } from "next/navigation";
import { resolveEmailLinkOrigin, resolveSponsorEmailLogoUrl } from "@/lib/notifications/email-brand-logo";
import { buildSponsorEmailHtml } from "@/lib/notifications/sponsor-email";

export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [logoUrl, linkOrigin] = await Promise.all([
    resolveSponsorEmailLogoUrl(),
    Promise.resolve(resolveEmailLinkOrigin()),
  ]);

  const html = buildSponsorEmailHtml({
    bid: "$25.00",
    companyName: "Example sponsor",
    email: "preview@example.com",
    paymentId: "pay_preview_12345678",
    rank: "2",
  }, false, { logoUrl, linkOrigin });

  return (
    <main
      style={{
        background: "#060c0b url('/images/darkmodebg.webp') center top / cover",
        minHeight: "100vh",
        padding: "40px 16px",
      }}
    >
      <div style={{ color: "#f6f4ee", fontFamily: "Arial, sans-serif", margin: "0 auto 18px", maxWidth: 540 }}>
        <h1 style={{ fontSize: 22, letterSpacing: "-0.5px", margin: "0 0 6px", fontWeight: 700 }}>Sponsor email preview</h1>
        <p style={{ color: "#a3b0aa", fontSize: 14, margin: 0 }}>Uses the same logo URL as live sponsor emails.</p>
      </div>
      <iframe
        title="Sponsor activation email preview"
        srcDoc={html}
        style={{ background: "#0a1210", border: "1px solid rgba(220,240,232,0.14)", borderRadius: 24, boxShadow: "0 24px 56px rgba(0,0,0,.45)", display: "block", height: 780, margin: "0 auto", maxWidth: 540, width: "100%" }}
      />
    </main>
  );
}
