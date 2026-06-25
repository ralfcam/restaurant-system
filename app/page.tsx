"use client"

import { useState, useEffect } from "react"
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
  Menu,
  LockKeyhole,
} from "lucide-react"
import { RESTAURANT, MENU_ITEMS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ReservationWidget } from "@/components/site/reservation-widget"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

// Map featured item ids to their real dish photos
const DISH_IMAGES: Record<string, string> = {
  m1: "/images/menu/burrata.png",
  m3: "/images/menu/tagliatelle.png",
  m6: "/images/menu/branzino.png",
}

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const featured = MENU_ITEMS.filter((m) => m.popular).slice(0, 3)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Background photo */}
        <div className="absolute inset-0">
          <Image
            src="/images/hero-dining.png"
            alt="Warm restaurant dining room at golden hour"
            fill
            priority
            className="object-cover brightness-[0.42] saturate-[0.80] animate-slow-zoom"
          />
          {/* Dynamic radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black/20 via-black/50 to-black/80" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* ── Inline header (overlaid on hero) ── */}
        <header
          className={cn(
            "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300",
            isScrolled
              ? "bg-background/80 backdrop-blur-md border-b border-border/60 shadow-sm"
              : "bg-transparent border-transparent",
          )}
        >
          <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
            {/* Logo — left third */}
            <div className="w-1/3 flex items-center justify-start">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-md bg-white/15 text-white backdrop-blur-sm">
                  <UtensilsCrossed className={cn("size-3.5 transition-colors duration-300", isScrolled ? "text-foreground" : "text-white")} strokeWidth={1.75} />
                </span>
                <span className={cn("font-heading text-base font-semibold tracking-widest uppercase transition-colors duration-300", isScrolled ? "text-foreground" : "text-white")}>
                  {RESTAURANT.name}
                </span>
              </Link>
            </div>
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden items-center gap-1 md:flex">
              <Link
                href="/menu"
                className={cn("rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors duration-300 hover:underline", isScrolled ? "text-foreground" : "text-white")}
              >
                Menu
              </Link>
            </nav>
            {/* Staff — right third */}
            <div className="w-1/3 flex items-center gap-2 justify-end hidden md:flex">
              <Link
                href="/admin"
                className={cn("rounded-full px-4 py-1.5 text-xs font-medium tracking-widest uppercase transition-colors duration-300", isScrolled ? "border border-border/60 bg-transparent text-foreground hover:bg-muted" : "border border-white/20 bg-white/10 text-white/80 backdrop-blur-sm hover:bg-white/20 hover:text-white")}
              >
                Staff
              </Link>
            </div>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className={cn("flex md:hidden rounded-lg p-2 transition-colors duration-300", isScrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10")}>
                  <Menu className="size-5" />
                  <span className="sr-only">Open menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link
                    href="/menu"
                    className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Menu
                  </Link>
                  <div className="border-t pt-4">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-foreground"
                      render={<Link href="/admin" />}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <LockKeyhole className="size-4 mr-2" />
                      Staff login
                    </Button>
                  </div>
                  <Button
                    className="w-full rounded-full"
                    render={<Link href="/#reserve" />}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Book a table
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex flex-1 flex-col justify-center mx-auto max-w-6xl px-5 pb-20 pt-24 md:px-8 md:pt-32 md:pb-28">
          <div className="max-w-xl">
            {/* Tag pill */}
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
              <Star className="size-2.5 fill-white text-white" />
              Seasonal Italian Kitchen &amp; Wine Bar
            </span>

            {/* Headline */}
            <h1 className="mt-6 font-heading text-5xl font-semibold leading-[1.05] tracking-tighter text-white text-balance md:text-6xl lg:text-7xl" style={{ textShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
              A seat at the table, reserved in seconds.
            </h1>

            {/* Subtext */}
            <p className="mt-5 max-w-sm text-pretty text-base leading-relaxed text-white/65 md:text-[17px]">
              Browse our seasonal menu, pick your time, and book instantly. No
              calls, no waiting — just great food at {RESTAURANT.name}.
            </p>

            {/* ── Booking card ── */}
            <div id="reserve" className="relative mt-10 scroll-mt-8 rounded-2xl border border-white/12 bg-[oklch(0.18_0.015_40/0.72)] shadow-2xl shadow-black/40 backdrop-blur-2xl hover:scale-[1.01] transition-transform duration-500 focus-within:border-amber-500/50">
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

        {/* ── Info strip (dark glass overlay) ── */}
        <div className="relative z-20 w-full border-t border-white/10 bg-black/20 backdrop-blur-md">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-0 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              <InfoItem icon={Clock}  label="Hours"        value={RESTAURANT.hours}   />
              <InfoItem icon={MapPin} label="Location"     value={RESTAURANT.address} />
              <InfoItem icon={Phone}  label="Reservations" value={RESTAURANT.phone}   />
            </div>
          </div>
        </div>
      </section>

      {/* ── Chef's picks ─────────────────────────────────────────────── */}
      <section className="relative bg-black">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-32">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
                Chef&apos;s picks
              </p>
              <h2 className="mt-2 font-heading text-4xl font-semibold tracking-tighter text-white text-balance md:text-5xl">
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
                className="group relative overflow-hidden rounded-2xl bg-zinc-900 border border-white/10 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20 hover:border-white/20"
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
                  <div className="flex h-52 items-center justify-center bg-zinc-800">
                    <span className="text-3xl font-heading text-zinc-700">
                      {item.name[0]}
                    </span>
                    <span className="absolute right-3.5 top-3.5 rounded-full bg-background/90 px-3 py-1 text-sm font-semibold tracking-tight text-foreground">
                      ${item.price}
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="p-5">
                  <h3 className="font-heading text-lg font-semibold leading-snug tracking-tighter text-white">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400 line-clamp-2">
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

        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-32">
          <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-primary">
            The experience
          </p>
          <h2 className="mt-3 text-balance text-center font-heading text-4xl font-semibold tracking-tighter text-white md:text-5xl">
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
      <footer className="border-t border-white/10 bg-black/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 md:flex-row md:px-8">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} {RESTAURANT.name}. {RESTAURANT.address}.
          </p>
          <Link
            href="/admin"
            className="text-sm text-zinc-500 transition-colors hover:text-white"
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
      <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-zinc-400">
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
