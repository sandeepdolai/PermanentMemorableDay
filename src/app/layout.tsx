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

/**
 * Blocking theme script — runs BEFORE first paint (inline in <head>), so a
 * dark-mode device never sees a white flash. Reads the user's saved mode
 * ("light" | "dark" | "system", default system) from localStorage, resolves
 * it against the OS preference, and stamps `dark` + `color-scheme` onto
 * <html> immediately. Kept tiny + dependency-free on purpose.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('md-theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;if(d){e.classList.add('dark');}e.style.colorScheme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute('content',d?'#0A0A0C':'#f5f5f7');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
