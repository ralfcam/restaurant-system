"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import {
  Clock,
  MapPin,
  Phone,
  QrCode,
  CalendarCheck,
  ChefHat,
  Star,
} from "lucide-react"
import { RESTAURANT, MENU_ITEMS } from "@/lib/data"
import NextLink from "next/link"
import { Link } from "@/i18n/navigation"
import { SiteHeader } from "@/components/site/site-header"
import { ReservationWidget } from "@/components/site/reservation-widget"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const t = useTranslations()
  const featured = MENU_ITEMS.filter((m) => m.popular).slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-dining.png"
            alt="Warm restaurant dining room at golden hour"
            fill
            priority
            className="object-cover brightness-[0.48] saturate-[0.90] animate-slow-zoom"
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/10 via-black/45 to-black/75" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center mx-auto max-w-6xl px-5 pb-20 pt-24 md:px-8 md:pt-32 md:pb-28">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              <Star className="size-2.5 fill-white text-white" />
              {t("hero.tagline")}
            </span>

            <h1
              className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tighter text-white text-balance md:text-6xl lg:text-7xl"
              style={{ textShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
            >
              {t("hero.headline")}
            </h1>

            <p className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-white/65 md:text-[17px]">
              {t("hero.subtext")}
            </p>

            <div
              id="reserve"
              className="relative mt-10 scroll-mt-8 rounded-2xl border border-white/12 bg-[oklch(0.18_0.015_40/0.72)] shadow-2xl shadow-black/40 backdrop-blur-2xl hover:scale-[1.01] transition-transform duration-500 focus-within:border-amber-500/50"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <BotanicalWatermark className="absolute -right-4 -top-4 size-44 rotate-12 opacity-[0.07] text-white" />
                <BotanicalWatermark className="absolute -bottom-6 -left-6 size-44 -rotate-12 scale-x-[-1] opacity-[0.07] text-white" />
              </div>

              <div className="relative px-6 pt-5 pb-1">
                <h2 className="font-heading text-xl font-semibold text-white">
                  {t("hero.bookTitle")}
                </h2>
                <p className="mt-0.5 text-xs tracking-wide text-white/50">
                  {t("hero.bookSubtitle")}
                </p>
              </div>

              <ReservationWidget dark />
            </div>
          </div>
        </div>

        <FourPointedStar className="absolute bottom-8 right-8 size-10 text-white/80" />

        <div className="relative z-20 w-full border-t border-white/10 bg-black/20 backdrop-blur-md">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-0 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              <InfoItem icon={Clock} label={t("info.hours")} value={RESTAURANT.hours} />
              <InfoItem icon={MapPin} label={t("info.location")} value={RESTAURANT.address} />
              <InfoItem icon={Phone} label={t("info.reservations")} value={RESTAURANT.phone} />
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-black">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-32">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                {t("picks.label")}
              </p>
              <h2 className="mt-2 font-heading text-4xl font-semibold tracking-tighter text-white text-balance md:text-5xl">
                {t("picks.title")}
              </h2>
            </div>
            <Button
              variant="ghost"
              className="hidden shrink-0 rounded-full text-sm tracking-wide sm:inline-flex"
              render={<Link href="/menu" />}
            >
              {t("picks.fullMenu")}
            </Button>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-sm transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-amber-500/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-heading text-xl text-zinc-500">
                    {item.name[0]}
                  </div>
                  <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-semibold tracking-tight text-foreground">
                    {item.price}
                  </span>
                </div>
                <h3 className="mt-5 font-heading text-lg font-semibold leading-snug tracking-tighter text-white">
                  {item.name}
                </h3>
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex sm:hidden">
            <Button variant="outline" className="w-full rounded-full" render={<Link href="/menu" />}>
              {t("picks.viewFullMenu")}
            </Button>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-t border-border">
        <Image
          src="/images/bar-counter.png"
          alt="Restaurant bar and prep counter"
          fill
          sizes="100vw"
          className="-z-10 object-cover brightness-[0.32] saturate-75"
        />
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.018_40/0.82)]" />

        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-32">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-primary">
            {t("experience.label")}
          </p>
          <h2 className="mt-3 text-balance text-center font-heading text-4xl font-semibold tracking-tighter text-white md:text-5xl">
            {t("experience.title")}
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-12">
            <Step
              icon={CalendarCheck}
              title={t("experience.step1Title")}
              body={t("experience.step1Body")}
            />
            <Step
              icon={QrCode}
              title={t("experience.step2Title")}
              body={t("experience.step2Body")}
            />
            <Step
              icon={ChefHat}
              title={t("experience.step3Title")}
              body={t("experience.step3Body")}
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 md:flex-row md:px-8">
          <p className="text-sm text-zinc-300">
            © {new Date().getFullYear()} {RESTAURANT.name}. {RESTAURANT.address}.
          </p>
          <NextLink
            href="/admin"
            className="text-sm text-zinc-300 transition-colors hover:text-zinc-100"
          >
            {t("footer.staffConsole")}
          </NextLink>
        </div>
      </footer>
    </div>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col items-center text-center md:flex-row md:text-left gap-3 md:gap-4 px-6 py-6 md:px-8">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20">
        <Icon className="size-4 text-white/70" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  )
}

function Step({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType
  title: string
  body: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
        <Icon className="size-6" strokeWidth={1.5} />
      </span>
      <h3 className="mt-5 font-heading text-xl font-semibold tracking-tighter text-white">
        {title}
      </h3>
      <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  )
}

function BotanicalWatermark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M100 180 C95 140 90 100 100 60 C110 20 120 10 120 10" />
      <path d="M97 155 C80 145 65 140 55 130" />
      <path d="M97 155 C82 148 74 142 68 132" />
      <path d="M95 130 C75 120 58 118 45 108" />
      <path d="M95 130 C78 124 68 118 58 108" />
      <path d="M96 105 C78 96 63 95 52 86" />
      <path d="M97 80 C82 72 70 72 60 64" />
      <path d="M103 145 C118 134 130 128 142 120" />
      <path d="M103 145 C120 138 130 130 138 120" />
      <path d="M104 120 C120 110 134 108 146 100" />
      <path d="M104 95 C118 86 130 84 140 76" />
      <path d="M105 70 C118 62 128 60 138 52" />
      <ellipse cx="53" cy="128" rx="5" ry="7" transform="rotate(-20 53 128)" />
      <ellipse cx="144" cy="118" rx="5" ry="7" transform="rotate(20 144 118)" />
      <ellipse cx="50" cy="104" rx="4" ry="6" transform="rotate(-15 50 104)" />
      <ellipse cx="148" cy="98" rx="4" ry="6" transform="rotate(15 148 98)" />
      <ellipse cx="58" cy="62" rx="4" ry="6" transform="rotate(-10 58 62)" />
      <ellipse cx="140" cy="74" rx="4" ry="6" transform="rotate(10 140 74)" />
    </svg>
  )
}

function FourPointedStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20 0 L22.5 17.5 L40 20 L22.5 22.5 L20 40 L17.5 22.5 L0 20 L17.5 17.5 Z" />
    </svg>
  )
}
