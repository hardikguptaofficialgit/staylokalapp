import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/app/LegalPageShell";
import { FOUNDER_X_HANDLE, FOUNDER_X_URL } from "@/lib/app/site-links";
import { createPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy policy · StayLokal",
  description:
    "How StayLokal handles files locally, what leaves your device for donations and sponsors, and how to contact us. No upload for processing.",
  path: "/privacy",
});

const LAST_UPDATED = "September 30, 2026";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Privacy policy"
      intro={
        <>
          StayLokal is built to process your files on your device. This page explains what stays local,
          what our servers see, and how payments and sponsor listings work.
        </>
      }
    >
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <section>
        <h2>Local file processing</h2>
        <p>
          When you use StayLokal&apos;s file tools, your documents, images, audio, and video are read and
          transformed in your browser. We do not upload those working files to StayLokal servers for
          processing, storage, or training.
        </p>
        <p>
          Large optional assets (for example FFmpeg WASM, OCR models, or background-removal models) are
          downloaded to your browser from StayLokal or its CDN and run locally. Your source files are not
          sent to those model vendors as part of normal tool use.
        </p>
      </section>

      <section>
        <h2>What we store on your device</h2>
        <ul>
          <li>
            <strong>Theme preference</strong> — light or dark mode in your browser&apos;s local storage.
          </li>
          <li>
            <strong>Files in memory</strong> — while the tab is open, queued files live in browser memory
            until you clear them or close the page.
          </li>
        </ul>
        <p>
          We do not use advertising trackers. We may use{" "}
          <a href="https://www.cloudflare.com/web-analytics/" rel="noreferrer noopener" target="_blank">
            Cloudflare Web Analytics
          </a>{" "}
          on the public site for aggregated page views and performance metrics (no ad profiling). File-tool
          processing still happens locally in your browser.
        </p>
      </section>

      <section>
        <h2>Donations</h2>
        <p>
          Optional donations are handled by{" "}
          <a href="https://dodopayments.com" rel="noreferrer noopener" target="_blank">Dodo Payments</a>.
          When you donate, you leave StayLokal for Dodo&apos;s hosted checkout. Payment details (card or wallet
          data) are collected by Dodo under their policies, not stored by StayLokal.
        </p>
        <p>
          Our server may receive payment identifiers and amounts from Dodo to confirm a donation and show
          success on return. See also our{" "}
          <Link href="/donate">donate page</Link> — 50% of donations and sponsor payments are pledged to
          charity.
        </p>
      </section>

      <section>
        <h2>Sponsor leaderboard</h2>
        <p>
          Sponsor placements are optional and separate from local file tools. If you claim a spot, you submit
          business details (company name, description, destination link, optional logo, and bid). That
          information is stored on our backend (Appwrite) and shown publicly when your payment is verified.
        </p>
        <p>
          Sponsor checkout is also processed by Dodo Payments. Activation happens after a signed webhook, not
          merely when you return from checkout. Full placement terms are in our{" "}
          <Link href="/rules">sponsor rules</Link>.
        </p>
      </section>

      <section>
        <h2>Hosting and security</h2>
        <p>
          The public website and API routes run on Cloudflare Workers. Standard hosting logs (IP address,
          request path, timestamps) may be retained by the platform for security and reliability. We use
          security headers including a Content Security Policy; see the application source for current
          configuration.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          StayLokal is a general-purpose utility site. We do not knowingly collect personal information from
          children. If you believe a child submitted sponsor or payment data in error, contact us and we will
          take reasonable steps to remove it.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update this policy as the product changes. The &quot;Last updated&quot; date at the top will
          change when we do. Continued use of the site after an update means you accept the revised policy.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions, charity nonprofit suggestions, or any support:{" "}
          <a href={FOUNDER_X_URL} rel="noreferrer noopener" target="_blank">
            message {FOUNDER_X_HANDLE} on X
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
