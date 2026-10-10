import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastViewport } from "@/components/LmsToast";

// Use the Geist assets shipped with the pinned Next.js package so builds work offline.
const geistSans = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "LumenTrail",
  icons: { icon: "/lumentrail-icon-dark.png", apple: "/lumentrail-icon-dark.png" },
  description: "Learning Paths, interactive games, and student progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}<ToastViewport /></body>
    </html>
  );
}
