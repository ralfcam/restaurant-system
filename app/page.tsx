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
} from "lucide-react"
import { RESTAURANT, MENU_ITEMS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/site/site-header"
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
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-dining.png"
            alt="Warm restaurant dining room at golden hour"
            fill
            priority
            className="object-cover brightness-[0.45] saturate-[0.85]"
          />
          {/* warm amber vignette */}
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/60 via-foreground/40 to-foreground/20" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left — headline */}
          <div className="text-background">
            <span className="inline-flex items-center gap-2 rounded-full border border-background/25 bg-background/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-widest backdrop-blur-sm">
              <Star className="size-3 fill-current opacity-80" />
              {RESTAURANT.tagline}
            </span>
            <h1 className="mt-5 text-balance font-heading text-5xl font-semibold leading-[1.08] tracking-tight md:text-7xl">
              A seat at the table, reserved in seconds.
            </h1>
            <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-background/70 md:text-lg">
              Browse our seasonal menu, pick your time, and book instantly. No
              calls, no waiting — just great food at {RESTAURANT.name}.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="rounded-full px-7 text-sm font-medium tracking-wide"
                render={<Link href="#reserve" />}
              >
                Reserve a table
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full border border-background/30 px-7 text-sm font-medium tracking-wide text-background hover:bg-background/10 hover:text-background"
                render={<Link href="/menu" />}
              >
                <QrCode className="size-4" /> View menu
              </Button>
            </div>
          </div>

          {/* Right — booking widget */}
          <div id="reserve" className="scroll-mt-24">
            <div className="mb-4 text-background">
              <h2 className="font-heading text-2xl font-semibold tracking-tight">
                Book your table
              </h2>
              <p className="mt-1 text-sm text-background/65 tracking-wide">
                Real-time availability · instant confirmation
              </p>
            </div>
            {/* Frosted glass widget wrapper */}
            <div className="overflow-hidden rounded-2xl border border-background/15 bg-background/[0.08] shadow-2xl shadow-foreground/30 backdrop-blur-xl">
              <ReservationWidget />
            </div>
          </div>
        </div>
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
