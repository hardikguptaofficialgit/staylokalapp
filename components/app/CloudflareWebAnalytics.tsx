import Script from "next/script";

const token = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN?.trim();

/** Privacy-friendly page views + Web Vitals via Cloudflare Web Analytics (manual beacon). */
export default function CloudflareWebAnalytics() {
  if (!token) return null;

  return (
    <Script
      id="cf-web-analytics"
      type="module"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
