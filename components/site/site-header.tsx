"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LockKeyhole, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"

const LINKS = [
  { href: "/menu", label: "Menu" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // The homepage has its own inline header overlaid on the hero.
  if (pathname === "/") return null

  return (
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
            <Image
              src="/images/logo.png"
              alt={`${RESTAURANT.name} logo`}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
            <span className={cn("font-heading text-lg font-semibold tracking-tight transition-colors duration-300", isScrolled ? "text-foreground" : "text-white")}>
              {RESTAURANT.name}
            </span>
          </Link>
        </div>

        {/* Desktop Nav — absolutely centered */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-colors duration-300 hover:underline",
                isScrolled ? "text-foreground" : "text-white",
                pathname === link.href && "font-bold",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions — right third */}
        <div className="w-1/3 flex items-center gap-2 justify-end hidden md:flex">
          <Button
            variant="ghost"
            size="sm"
            className={cn("rounded-full text-xs font-medium tracking-wide transition-colors duration-300", isScrolled ? "text-muted-foreground" : "text-white/80")}
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

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className={cn("flex md:hidden rounded-lg p-2 transition-colors duration-300", isScrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10")}>
            <Menu className="size-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col gap-4 mt-8">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
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
  )
}
