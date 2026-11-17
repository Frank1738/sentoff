import type { Metadata } from "next";
import { Inter, Zilla_Slab } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { siteUrl } from "@/components/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const zilla = Zilla_Slab({
  variable: "--font-zilla",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Sent Off",
  description: "Every manager in your mini-league, rated. Built from public FPL data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${zilla.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-text">{children}</body>
      <GoogleAnalytics gaId="G-VKKG9V8QKW" />
    </html>
  );
}
