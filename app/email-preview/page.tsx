import { notFound } from "next/navigation";
import { buildSponsorEmailHtml } from "@/lib/notifications/resend";

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const html = buildSponsorEmailHtml({
    bid: "$25.00",
    companyName: "Example sponsor",
    email: "preview@example.com",
    paymentId: "pay_preview_12345678",
    rank: "2",
  });

  return (
    <main
      style={{
        background: "#071312 url('/chatbg.png') center / cover fixed",
        minHeight: "100vh",
        padding: "40px 16px",
      }}
    >
      <div style={{ color: "#f6f4ee", fontFamily: "Arial, sans-serif", margin: "0 auto 18px", maxWidth: 600 }}>
        <div style={{ color: "#9dd2c3", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          StayLokal
        </div>
        <h1 style={{ fontSize: 28, letterSpacing: "-1px", margin: "8px 0 6px" }}>Sponsor email preview</h1>
        <p style={{ color: "#bdc8c2", fontSize: 14, margin: 0 }}>
          The email automatically adapts to the recipient’s light or dark color scheme.
        </p>
      </div>
      <iframe
        title="Sponsor activation email preview"
        srcDoc={html}
        style={{ background: "#071312", border: "1px solid rgba(220,240,232,.25)", borderRadius: 18, boxShadow: "0 20px 55px rgba(0,0,0,.35)", display: "block", height: 760, margin: "0 auto", maxWidth: 600, width: "100%" }}
      />
    </main>
  );
}
