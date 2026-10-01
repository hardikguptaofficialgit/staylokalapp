import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rubik_Doodle_Shadow } from "next/font/google";
import CloudflareWebAnalytics from "@/components/app/CloudflareWebAnalytics";
import PwaRegister from "@/components/app/PwaRegister";
import PwaThemeColor from "@/components/app/PwaThemeColor";
import "./styles/main.css";
import { THEME_STORAGE_KEY } from "@/lib/app/theme";
import { SITE_DESCRIPTION, SITE_HOME_TITLE, SITE_NAME, SITE_OG_IMAGE, SITE_URL, absoluteUrl } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rubikDoodleShadow = Rubik_Doodle_Shadow({
  weight: "400",
  variable: "--font-rubik-doodle-shadow",
  subsets: ["latin"],
});

const defaultOgImage = absoluteUrl(SITE_OG_IMAGE);

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_HOME_TITLE,
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: SITE_HOME_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: defaultOgImage, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_HOME_TITLE,
    description: SITE_DESCRIPTION,
    images: [defaultOgImage],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StayLokal",
  },
  icons: {
    icon: [
      { url: "/images/pwa/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/images/pwa/icon-192.png"],
    apple: [{ url: "/images/pwa/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#080808",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${rubikDoodleShadow.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="${THEME_STORAGE_KEY}";var t=localStorage.getItem(k);if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;var bg=t==="light"?"/images/lightmodebg.webp":"/images/darkmodebg.webp";var l=document.createElement("link");l.rel="preload";l.as="image";l.href=bg;document.head.appendChild(l);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <CloudflareWebAnalytics />
        <PwaRegister />
        <PwaThemeColor />
        {children}
      </body>
    </html>
  );
}
