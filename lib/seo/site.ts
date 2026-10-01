import type { Metadata } from "next";

export const SITE_NAME = "StayLokal";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://staylokal.app").replace(/\/$/, "");

export const SITE_HOME_TITLE = "StayLokal — Offline privacy-first browser-based file tools";

export const SITE_DESCRIPTION =
  "Offline, privacy-first browser-based file tools for PDFs, images, video, audio & documents. No upload, no account—everything stays on your device.";

export const SITE_OG_IMAGE = "/images/pwa/icon-512.png";

/** Marketing and legal routes in sitemap.xml (sponsor UI is on `/`). */
export const PUBLIC_SITEMAP_PATHS = ["/", "/tools", "/privacy", "/donate", "/rules"] as const;

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
};

export function createPageMetadata({ title, description, path }: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const image = absoluteUrl(SITE_OG_IMAGE);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [{ url: image, width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export type SoftwareApplicationJsonLd = {
  "@context": "https://schema.org";
  "@type": "SoftwareApplication";
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: { "@type": "Offer"; price: string; priceCurrency: string };
  description: string;
  url: string;
  image?: string;
  featureList?: string[];
  author?: { "@type": "Person"; name: string; url?: string };
};

export function createSoftwareApplicationJsonLd(options: {
  name: string;
  description: string;
  url: string;
  featureList?: string[];
}): SoftwareApplicationJsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: options.name,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: options.description,
    url: options.url,
    image: absoluteUrl(SITE_OG_IMAGE),
    featureList: options.featureList,
    author: { "@type": "Person", name: "strykerin", url: "https://x.com/strykerin" },
  };
}
