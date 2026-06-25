import Link from "next/link"
import { QrCode } from "lucide-react"
import type { Metadata } from "next"
import { RESTAURANT } from "@/lib/data"
import { SiteHeader } from "@/components/site/site-header"
import { MenuBrowser } from "@/components/site/menu-browser"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: `Menu — ${RESTAURANT.name}`,
  description: "Browse our seasonal menu with prices and allergen information.",
}

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-12 text-center md:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <QrCode className="size-4" /> Digital menu
          </span>
          <h1 className="font-heading text-4xl font-semibold">
            {RESTAURANT.name} Menu
          </h1>
          <p className="max-w-md text-pretty text-muted-foreground">
            {RESTAURANT.tagline}. Tap a category to filter. Allergen info is shown
            on every dish.
          </p>
          <Button asChild className="mt-2">
            <Link href="/#reserve">Reserve a table</Link>
          </Button>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <MenuBrowser />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>
          Prices in USD. Please inform your server of any dietary requirements.
        </p>
      </footer>
    </div>
  )
}
