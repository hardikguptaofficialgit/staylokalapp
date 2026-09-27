import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik_Doodle_Shadow } from "next/font/google";
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
  icons: {
    icon: [
      { url: "/images/logo.png", type: "image/png" },
      { url: "/images/logo.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: ["/images/logo.png"],
    apple: [{ url: "/images/logo.png", type: "image/png" }],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
