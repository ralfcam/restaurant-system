import Link from "next/link"
import Image from "next/image"
import { QrCode } from "lucide-react"
import type { Metadata } from "next"
import { RESTAURANT } from "@/lib/data"
import { getMenuItems } from "@/app/actions/menu"
import { SiteHeader } from "@/components/site/site-header"
import { MenuBrowser } from "@/components/site/menu-browser"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: `Menu — ${RESTAURANT.name}`,
  description: "Browse our seasonal menu with prices in CHF.",
}

export default async function MenuPage() {
  const items = await getMenuItems()
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative isolate overflow-hidden border-b border-border">
        <Image
          src="/images/bar-counter.png"
          alt=""
          fill
          sizes="100vw"
          priority
          className="-z-10 object-cover brightness-[0.32] saturate-75"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.018_40/0.82)]" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-12 text-center md:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
            <QrCode className="size-4" /> Digital menu
          </span>
          <h1 className="font-heading text-4xl font-semibold text-white">
            {RESTAURANT.name} Menu
          </h1>
          <p className="max-w-md text-pretty text-zinc-300">
            {RESTAURANT.tagline}. Switch between menus and languages below.
          </p>
          <Button className="mt-2" render={<Link href="/#reserve" />}>
            Reserve a table
          </Button>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <MenuBrowser initialItems={items} />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>
          Prices in CHF. Please inform your server of any dietary requirements.
        </p>
      </footer>
    </div>
  )
}
