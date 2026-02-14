import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { ServiceWorkerRegister } from "@/components/service-worker-register"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "TapRanked - Smart Loyalty Programs for Blacksburg Businesses",
  description: "NFC-powered digital loyalty programs with competitive leaderboards. Help your Blacksburg business build stronger customer relationships with gamified rewards and real-time analytics.",
  keywords: ["loyalty programs", "NFC technology", "customer retention", "Blacksburg business", "Virginia Tech", "digital rewards", "leaderboards", "customer analytics", "punch cards"],
  authors: [{ name: "TapRanked" }],
  creator: "TapRanked",
  publisher: "TapRanked",
  robots: "index, follow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TapRanked",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "TapRanked - Smart Loyalty Programs for Blacksburg Businesses",
    description: "Transform your business with NFC-powered loyalty programs featuring competitive leaderboards, real-time analytics, and gamified customer experiences specifically designed for Blacksburg businesses.",
    url: "https://tapranked.com",
    siteName: "TapRanked",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TapRanked - Smart Loyalty Programs for Blacksburg",
    description: "NFC-powered loyalty programs with competitive leaderboards for Blacksburg businesses. Increase customer retention with gamified rewards.",
    creator: "@tapranked",
  },
  alternates: {
    canonical: "https://tapranked.com",
  },
  category: "Business Software",
  classification: "Customer Loyalty Software",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <meta name="theme-color" content="#991B1B" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.svg" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.svg" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128x128.svg" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
  -webkit-tap-highlight-color: rgba(153, 27, 27, 0.1);
  -webkit-text-size-adjust: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  overscroll-behavior-y: contain;
  touch-action: pan-y pinch-zoom;
}

/* Better touch targets for mobile */
button, a, input, select, textarea {
  min-height: 44px;
  touch-action: manipulation;
}

/* Prevent zoom on input focus for iOS */
@media screen and (max-width: 768px) {
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="tel"],
  input[type="number"],
  select,
  textarea {
    font-size: 16px !important;
  }
}

/* Smooth scrolling for mobile */
* {
  -webkit-overflow-scrolling: touch;
}

/* Remove tap highlight on iOS */
a, button {
  -webkit-tap-highlight-color: rgba(153, 27, 27, 0.1);
}
        `}</style>
      </head>
      <body className={GeistSans.className}>
        <ServiceWorkerRegister />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
