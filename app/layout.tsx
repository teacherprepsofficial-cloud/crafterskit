import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CraftersKit — Gauge Calculator & AI Pattern Adapter",
  description: "Using a different yarn than your pattern? CraftersKit recalculates every stitch count, yardage, and skein total for you — instantly. Free gauge calculator and AI pattern rewriter for knitters and crocheters.",
  metadataBase: new URL("https://crafterskit.com"),
  openGraph: {
    title: "CraftersKit — Gauge Calculator & AI Pattern Adapter",
    description: "Swap your yarn, keep your pattern. CraftersKit recalculates every number for you — stitch counts, yardage, skeins to buy. Free for knitters and crocheters.",
    url: "https://crafterskit.com",
    siteName: "CraftersKit",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "CraftersKit — Gauge Calculator & AI Pattern Adapter",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CraftersKit — Gauge Calculator & AI Pattern Adapter",
    description: "Swap your yarn, keep your pattern. CraftersKit recalculates every stitch count, yardage, and skein total — instantly.",
    images: ["/og-image.png"],
  },
  keywords: ["gauge calculator", "knitting gauge", "crochet gauge", "yarn substitution", "pattern adapter", "knitting calculator", "crochet calculator", "stitch count converter"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
