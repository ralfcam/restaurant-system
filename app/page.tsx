import Link from "next/link"
import Image from "next/image"
import {
  Clock,
  MapPin,
  Phone,
  QrCode,
  CalendarCheck,
  ChefHat,
  Star,
  UtensilsCrossed,
} from "lucide-react"
import { RESTAURANT, MENU_ITEMS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ReservationWidget } from "@/components/site/reservation-widget"
import { Button } from "@/components/ui/button"

// Map featured item ids to their real dish photos
const DISH_IMAGES: Record<string, string> = {
  m1: "/images/menu/burrata.png",
  m3: "/images/menu/tagliatelle.png",
  m6: "/images/menu/branzino.png",
}

export default function HomePage() {
  const featured = MENU_ITEMS.filter((m) => m.popular).slice(0, 3)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-dining.png"
            alt="Warm restaurant dining room at golden hour"
            fill
            priority
            className="object-cover brightness-[0.42] saturate-[0.80]"
          />
          {/* Left-heavy vignette so text stays readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* ── Inline header (overlaid on hero) ── */}
        <header className="relative z-20 mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-white backdrop-blur-sm">
              <UtensilsCrossed className="size-3.5" strokeWidth={1.75} />
            </span>
            <span className="font-heading text-base font-semibold tracking-widest text-white uppercase">
              {RESTAURANT.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "/", label: "Home" },
              { href: "/menu", label: "Menu" },
              { href: "/#reserve", label: "Reserve" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-2 text-xs font-medium uppercase tracking-widest text-white/70 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/admin"
            className="hidden rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-widest text-white/80 uppercase backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:block"
          >
            Staff
          </Link>
        </header>

        {/* ── Hero content ── */}
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-10 md:px-8 md:pt-14 md:pb-28">
          <div className="max-w-xl">
            {/* Tag pill */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              <Star className="size-2.5 fill-white text-white" />
              Seasonal Italian Kitchen &amp; Wine Bar
            </span>

            {/* Headline */}
            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tight text-white text-balance md:text-6xl lg:text-7xl">
              A seat at the table, reserved in seconds.
            </h1>

            {/* Subtext */}
            <p className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-white/65 md:text-[17px]">
              Browse our seasonal menu, pick your time, and book instantly. No
              calls, no waiting — just great food at {RESTAURANT.name}.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="#reserve"
                className="inline-flex h-11 items-center rounded-full bg-primary px-7 text-sm font-semibold tracking-wide text-white shadow-lg shadow-primary/30 transition-opacity hover:opacity-90"
              >
                Reserve a table
              </Link>
              <Link
                href="/menu"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 text-sm font-semibold tracking-wide text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <QrCode className="size-4" strokeWidth={1.5} />
                View menu
              </Link>
            </div>

            {/* ── Booking card ── */}
            <div id="reserve" className="relative mt-10 scroll-mt-8 rounded-2xl border border-white/12 bg-[oklch(0.18_0.015_40/0.72)] shadow-2xl shadow-black/40 backdrop-blur-2xl">
              {/* Botanical watermarks clipped inside their own overflow-hidden layer */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <BotanicalWatermark className="absolute -right-4 -top-4 size-44 rotate-12 opacity-[0.07] text-white" />
                <BotanicalWatermark className="absolute -bottom-6 -left-6 size-44 -rotate-12 scale-x-[-1] opacity-[0.07] text-white" />
              </div>

              {/* Card header */}
              <div className="relative px-6 pt-5 pb-1">
                <h2 className="font-heading text-xl font-semibold text-white">
                  Book your table
                </h2>
                <p className="mt-0.5 text-xs tracking-wide text-white/50">
                  Real-time availability · Instant confirmation
                </p>
              </div>

              {/* Widget (dark-skinned) */}
              <ReservationWidget dark />
            </div>
          </div>
        </div>

        {/* 4-pointed star accent */}
        <FourPointedStar className="absolute bottom-8 right-8 size-10 text-white/80" />
      </section>

      {/* ── Info strip ───────────────────────────────────────────────── */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <div className="grid gap-0 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            <InfoItem icon={Clock}  label="Hours"        value={RESTAURANT.hours}   />
            <InfoItem icon={MapPin} label="Location"     value={RESTAURANT.address} />
            <InfoItem icon={Phone}  label="Reservations" value={RESTAURANT.phone}   />
          </div>
        </div>
      </section>

      {/* ── Chef's picks ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
              Chef&apos;s picks
            </p>
            <h2 className="mt-2 font-heading text-4xl font-semibold tracking-tight md:text-5xl">
              Tonight&apos;s favorites
            </h2>
          </div>
          <Button
            variant="ghost"
            className="hidden shrink-0 rounded-full text-sm tracking-wide sm:inline-flex"
            render={<Link href="/menu" />}
          >
            Full menu →
          </Button>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => {
            const img = DISH_IMAGES[item.id]
            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-foreground/8"
              >
                {/* Dish photo */}
                {img ? (
                  <div className="relative h-52 w-full overflow-hidden">
                    <Image
                      src={img}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Price pill */}
                    <span className="absolute right-3.5 top-3.5 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold tracking-tight text-foreground backdrop-blur-sm">
                      ${item.price}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-52 items-center justify-center bg-secondary">
                    <span className="text-3xl font-heading text-muted-foreground/30">
                      {item.name[0]}
                    </span>
                    <span className="absolute right-3.5 top-3.5 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold tracking-tight text-foreground">
                      ${item.price}
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="p-5">
                  <h3 className="font-heading text-lg font-semibold leading-snug tracking-tight">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex sm:hidden">
          <Button variant="outline" className="w-full rounded-full" render={<Link href="/menu" />}>
            View full menu
          </Button>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-t border-border">
        <Image
          src="/images/bar-counter.png"
          alt="Restaurant bar and prep counter"
          fill
          sizes="100vw"
          className="-z-10 object-cover brightness-[0.32] saturate-75"
        />
        {/* Warm dark overlay */}
        <div className="absolute inset-0 -z-10 bg-[oklch(0.18_0.018_40/0.82)]" />

        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-primary">
            The experience
          </p>
          <h2 className="mt-3 text-balance text-center font-heading text-4xl font-semibold tracking-tight text-background md:text-5xl">
            A better night out, end to end
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3 md:gap-12">
            <Step icon={CalendarCheck} title="Reserve online"   body="Pick your party size and time. We check live capacity so you never double-book." />
            <Step icon={QrCode}        title="Scan the menu"    body="Mobile-friendly digital menu with prices and allergen info at your table." />
            <Step icon={ChefHat}       title="Cooked to order"  body="Your order flows straight to the kitchen display for fast, accurate service." />
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 md:flex-row md:px-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {RESTAURANT.name}. {RESTAURANT.address}.
          </p>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Staff console
          </Link>
        </div>
      </footer>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

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
    <div className="flex items-center gap-4 px-6 py-5 first:pl-0 last:pr-0 md:px-8">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-primary">
        <Icon className="size-4" strokeWidth={1.5} />
      </span>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
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
      <h3 className="mt-5 font-heading text-xl font-semibold tracking-tight text-background">
        {title}
      </h3>
      <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-background/60">
        {body}
      </p>
    </div>
  )
}

/** Etched olive-branch botanical SVG watermark */
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
      {/* Main stem */}
      <path d="M100 180 C95 140 90 100 100 60 C110 20 120 10 120 10" />
      {/* Branches left */}
      <path d="M97 155 C80 145 65 140 55 130" />
      <path d="M97 155 C82 148 74 142 68 132" />
      <path d="M95 130 C75 120 58 118 45 108" />
      <path d="M95 130 C78 124 68 118 58 108" />
      <path d="M96 105 C78 96 63 95 52 86" />
      <path d="M97 80 C82 72 70 72 60 64" />
      {/* Branches right */}
      <path d="M103 145 C118 134 130 128 142 120" />
      <path d="M103 145 C120 138 130 130 138 120" />
      <path d="M104 120 C120 110 134 108 146 100" />
      <path d="M104 95 C118 86 130 84 140 76" />
      <path d="M105 70 C118 62 128 60 138 52" />
      {/* Olive fruits */}
      <ellipse cx="53" cy="128" rx="5" ry="7" transform="rotate(-20 53 128)" />
      <ellipse cx="144" cy="118" rx="5" ry="7" transform="rotate(20 144 118)" />
      <ellipse cx="50" cy="104" rx="4" ry="6" transform="rotate(-15 50 104)" />
      <ellipse cx="148" cy="98" rx="4" ry="6" transform="rotate(15 148 98)" />
      <ellipse cx="58" cy="62" rx="4" ry="6" transform="rotate(-10 58 62)" />
      <ellipse cx="140" cy="74" rx="4" ry="6" transform="rotate(10 140 74)" />
    </svg>
  )
}

/** 4-pointed decorative star */
function FourPointedStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20 0 L22.5 17.5 L40 20 L22.5 22.5 L20 40 L17.5 22.5 L0 20 L17.5 17.5 Z" />
    </svg>
  )
}
