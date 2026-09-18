import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MemorableDay — Make Every Moment Memorable",
  description:
    "MemorableDay is the interactive moment experience platform. Create, send and track beautiful, personalized, interactive digital experiences — moments recipients remember.",
  keywords: [
    "MemorableDay",
    "interactive experiences",
    "digital moments",
    "experience builder",
    "3D greetings",
  ],
  authors: [{ name: "MemorableDay" }],
  openGraph: {
    title: "MemorableDay — Make Every Moment Memorable",
    description:
      "Create, send and track beautiful, personalized, interactive digital experiences.",
    siteName: "MemorableDay",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
