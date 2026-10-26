import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
 title: {
 default: "Social Cleaner — Digital Footprint Inventory",
 template: "%s · Social Cleaner",
 },
 description:
 "Discover your public digital footprint, review real accounts, and remove what you no longer want online.",
 robots: { index: false, follow: false },
 applicationName: "Social Cleaner",
};

export const viewport: Viewport = {
 themeColor: "#000000",
 width: "device-width",
 initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
 return (
 <html lang="en">
 <head>
 <link
 rel="preload"
 href="/fonts/manrope-latin.woff2"
 as="font"
 type="font/woff2"
 crossOrigin="anonymous"
 />
 <link
 rel="preload"
 href="/fonts/manrope-latin-ext.woff2"
 as="font"
 type="font/woff2"
 crossOrigin="anonymous"
 />
 </head>
 <body className="min-h-screen bg-canvas text-fg antialiased">{children}</body>
 </html>
 );
}
