import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Noto_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { Providers } from "@/app/providers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Clinique Mrabeut - Votre sante, notre priorite",
  description:
    "La Clinique Mrabeut vous accueille avec une equipe medicale qualifiee et des equipements modernes pour prendre soin de vous et de votre famille.",
  icons: {
    icon: "/assets/green-logo-small.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#56B893",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" dir="ltr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoArabic.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
