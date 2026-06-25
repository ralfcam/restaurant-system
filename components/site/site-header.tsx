"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UtensilsCrossed, LockKeyhole } from "lucide-react"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import { Button } from "@/components/ui/button"

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
]

export function SiteHeader() {
  const pathname = usePathname()
  // The homepage has its own inline header overlaid on the hero.
  if (pathname === "/") return null
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <UtensilsCrossed className="size-4" strokeWidth={1.75} />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">
            {RESTAURANT.name}
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden rounded-full text-xs font-medium tracking-wide text-muted-foreground sm:inline-flex"
            render={<Link href="/admin" />}
          >
            <LockKeyhole className="size-3.5" />
            Staff login
          </Button>
          <Button
            size="sm"
            className="rounded-full px-5 text-xs font-medium tracking-wide"
            render={<Link href="/#reserve" />}
          >
            Book a table
          </Button>
        </div>
      </div>
    </header>
  )
}
