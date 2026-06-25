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

export default function HomePage() {
  const featured = MENU_ITEMS.filter((m) => m.popular).slice(0, 3)

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-dining.png"
            alt="Warm restaurant dining room at golden hour"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-foreground/55" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
          <div className="text-background">
            <span className="inline-flex items-center gap-2 rounded-full bg-background/15 px-3 py-1 text-sm font-medium backdrop-blur">
              <Star className="size-3.5 fill-current" />
              {RESTAURANT.tagline}
            </span>
            <h1 className="mt-4 text-balance font-heading text-4xl font-semibold leading-tight md:text-6xl">
              A seat at the table, reserved in seconds.
            </h1>
            <p className="mt-4 max-w-md text-pretty text-base text-background/80 md:text-lg">
              Browse our seasonal menu, pick your time, and book instantly. No
              calls, no waiting — just great food at {RESTAURANT.name}.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button size="lg" render={<Link href="#reserve" />}>
                Reserve a table
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-background/40 bg-transparent text-background hover:bg-background/10 hover:text-background"
                render={<Link href="/menu" />}
              >
                <QrCode className="size-4" /> View menu
              </Button>
            </div>
          </div>

          <div id="reserve" className="scroll-mt-20">
            <div className="mb-3 text-background">
              <h2 className="font-heading text-2xl font-semibold">
                Book your table
              </h2>
              <p className="text-sm text-background/75">
                Real-time availability · instant confirmation
              </p>
            </div>
            <ReservationWidget />
          </div>
        </div>
      </section>

      {/* Info strip */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:grid-cols-3 md:px-6">
          <InfoItem icon={Clock} label="Hours" value={RESTAURANT.hours} />
          <InfoItem icon={MapPin} label="Location" value={RESTAURANT.address} />
          <InfoItem icon={Phone} label="Reservations" value={RESTAURANT.phone} />
        </div>
      </section>

      {/* Featured menu */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Chef&apos;s picks
            </p>
            <h2 className="mt-1 font-heading text-3xl font-semibold">
              Tonight&apos;s favorites
            </h2>
          </div>
          <Button variant="ghost" render={<Link href="/menu" />}>
            Full menu
          </Button>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-lg font-semibold">
                  {item.name}
                </h3>
                <span className="shrink-0 font-medium text-primary">
                  ${item.price}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

        {/* How it works */}
        <section className="relative isolate overflow-hidden border-t border-border">
          <Image
            src="/images/bar-counter.png"
            alt="Restaurant bar and prep counter with infused oils, spices and a point-of-sale tablet"
            fill
            sizes="100vw"
            className="-z-10 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-foreground/75" />
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
            <h2 className="text-balance text-center font-heading text-3xl font-semibold text-background">
              A better night out, end to end
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <Step
                icon={CalendarCheck}
                title="Reserve online"
                body="Pick your party size and time. We check live capacity so you never double-book."
                onImage
              />
              <Step
                icon={QrCode}
                title="Scan the menu"
                body="Mobile-friendly digital menu with prices and allergen info at your table."
                onImage
              />
              <Step
                icon={ChefHat}
                title="Cooked to order"
                body="Your order flows straight to the kitchen display for fast, accurate service."
                onImage
              />
            </div>
          </div>
        </section>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <p>
            © {new Date().getFullYear()} {RESTAURANT.name}. {RESTAURANT.address}.
          </p>
          <Link href="/admin" className="hover:text-foreground">
            Staff console
          </Link>
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
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function Step({
  icon: Icon,
  title,
  body,
  onImage = false,
}: {
  icon: React.ElementType
  title: string
  body: string
  onImage?: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-6" />
      </span>
      <h3
        className={cn(
          "mt-4 font-heading text-xl font-semibold",
          onImage && "text-background",
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "mt-2 max-w-xs text-sm leading-relaxed",
          onImage ? "text-background/80" : "text-muted-foreground",
        )}
      >
        {body}
      </p>
    </div>
  )
}
