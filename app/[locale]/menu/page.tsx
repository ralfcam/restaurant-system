import { QrCode } from "lucide-react"
import Image from "next/image"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { RESTAURANT } from "@/lib/data"
import { getMenuItems } from "@/app/actions/menu"
import { Link } from "@/i18n/navigation"
import { SiteHeader } from "@/components/site/site-header"
import { MenuBrowser } from "@/components/site/menu-browser"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

type PageProps = {
  params: Promise<{ locale: "fr" | "en" }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "menuPage" })

  return {
    title: `${t("title", { name: RESTAURANT.name })} — ${RESTAURANT.name}`,
    description: t("description", { tagline: RESTAURANT.tagline }),
  }
}

export default async function MenuPage({ params }: PageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("menuPage")
  const items = await getMenuItems()

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative isolate overflow-hidden border-b border-border">
        <Image
          src="/images/bar-counter.png"
          alt="Restaurant bar and prep counter"
          fill
          sizes="100vw"
          priority
          className="-z-10 object-cover brightness-[0.32] saturate-75"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.018_40/0.82)]" />

        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 pb-12 pt-24 text-center md:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
            <QrCode className="size-4" /> {t("badge")}
          </span>
          <h1 className="font-heading text-4xl font-semibold text-white">
            {t("title", { name: RESTAURANT.name })}
          </h1>
          <p className="max-w-md text-pretty text-white/65">
            {t("description", { tagline: RESTAURANT.tagline })}
          </p>
          <Button className="mt-2" render={<Link href="/#reserve" />}>
            {t("reserve")}
          </Button>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <MenuBrowser initialItems={items} locale={locale} />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>{t("footerNote")}</p>
      </footer>
    </div>
  )
}
