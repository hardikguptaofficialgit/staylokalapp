import type { Metadata } from "next";
import { Geist, Geist_Mono, Rubik_Doodle_Shadow } from "next/font/google";
import "./globals.css";

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
  title: "StayLokal — Private file tools that run on your device.",
  description: "StayLokal is a local-first file utility desk for PDFs, images, video, audio, and more.",
  icons: {
    icon: [{ url: "/images/logo.png", type: "image/png" }],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
