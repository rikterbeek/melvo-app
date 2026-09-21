import type { Metadata, Viewport } from "next";
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
  title: "Melvo",
  description:
    "Melvo turns your product ideas into reviewed, shippable software.",
};

// Explicit so a phone lays the hero out at device width instead of zooming out
// of a desktop-width page; `maximum-scale` is left unset so users can zoom.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {/* No `overflow-x-hidden` here on purpose: it would hide horizontal
          overflow rather than prevent it, and would mask the very defect the
          no-horizontal-scrolling test exists to catch. */}
      <body className="flex min-h-svh flex-col">
        {children}
      </body>
    </html>
  );
}
