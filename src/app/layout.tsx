import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ConsentBanner from "@/components/ConsentBanner";
import PWARegister from "@/components/PWARegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import BackgroundOrbs from "@/components/BackgroundOrbs";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travlr - Map Your World",
  description: "Discover and share amazing places with friends. Create collections, save pins, and explore the world together.",
  applicationName: "Travlr",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Travlr",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  keywords: [
    "travel",
    "maps",
    "places",
    "collections",
    "pins",
    "social",
    "discover",
    "explore",
  ],
  authors: [{ name: "Travlr" }],
  creator: "Travlr",
  publisher: "Travlr",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://travlr.app",
    siteName: "Travlr",
    title: "Travlr - Map Your World",
    description: "Discover and share amazing places with friends",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Travlr",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Travlr - Map Your World",
    description: "Discover and share amazing places with friends",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E05C3A' },
    { media: '(prefers-color-scheme: dark)', color: '#E05C3A' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Travlr" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
      </head>
      <body
        className={`${inter.variable} ${playfairDisplay.variable} antialiased`}
      >
        <PWARegister />
        <BackgroundOrbs />
        {children}
        <ConsentBanner />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
