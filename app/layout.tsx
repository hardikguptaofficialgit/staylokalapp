import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik_Doodle_Shadow } from "next/font/google";
import CloudflareWebAnalytics from "@/components/app/CloudflareWebAnalytics";
import PwaRegister from "@/components/app/PwaRegister";
import PwaThemeColor from "@/components/app/PwaThemeColor";
import "./styles/main.css";
import { THEME_STORAGE_KEY } from "@/lib/app/theme";

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

export const metadata: Metadata = {
  title: "StayLokal - Private file tools that run on your device.",
  description: "StayLokal is a local-first file utility desk for PDFs, images, video, audio, and more.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StayLokal",
  },
  themeColor: "#080808",
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
            __html: `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();`,
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
