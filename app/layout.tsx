import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google"
import { headers } from "next/headers"
import { resolveDocumentLang } from "@/lib/i18n/document-lang"
import { DocumentLangSync } from "@/lib/i18n/document-lang-sync"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Restaurant Link — Restaurant Management & Reservations",
  description:
    "Reservations, digital menus, floor planning, POS and kitchen display — one platform to run your restaurant.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

function pathnameFromRequestHeaders(headerStore: Headers): string {
  const raw =
    headerStore.get("x-url") ??
    headerStore.get("x-pathname") ??
    headerStore.get("next-url")

  if (raw) {
    if (raw.startsWith("/")) {
      return raw.split("?")[0] || "/"
    }

    try {
      return new URL(raw).pathname
    } catch {
      // fall through to next-intl / staff defaults
    }
  }

  const intlLocale = headerStore.get("x-next-intl-locale")
  if (intlLocale === "en") return "/en"
  if (intlLocale === "fr") return "/"
  // Staff / auth skip locale middleware, so the intl header is absent.
  return "/admin"
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headerStore = await headers()
  const lang = resolveDocumentLang(pathnameFromRequestHeaders(headerStore))

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${geistMono.variable} ${playfair.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <DocumentLangSync />
        {children}
        <Toaster />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
