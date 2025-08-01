import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TapRanked - Smart Loyalty Programs for Blacksburg Businesses",
  description: "NFC-powered digital loyalty programs with competitive leaderboards. Help your Blacksburg business build stronger customer relationships with gamified rewards and real-time analytics.",
  keywords: ["loyalty programs", "NFC technology", "customer retention", "Blacksburg business", "Virginia Tech", "digital rewards", "leaderboards", "customer analytics", "punch cards"],
  authors: [{ name: "TapRanked" }],
  creator: "TapRanked",
  publisher: "TapRanked",
  robots: "index, follow",
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
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
