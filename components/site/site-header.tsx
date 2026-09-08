"use client"

import { useState, useEffect } from "react"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { LockKeyhole, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import {
  shouldRenderSiteHeader,
  shouldUseLightNavText,
} from "@/lib/site-chrome"
import { useRestaurantLogo } from "@/hooks/use-restaurant-logo"
import { BrandMark } from "@/components/site/brand-mark"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet"
import { LanguageSwitcher } from "@/components/site/language-switcher"
import { isActiveNavPath } from "@/lib/i18n/localized-pathname"

export function SiteHeader({
  overDarkBackground = true,
}: { overDarkBackground?: boolean } = {}) {
  const pathname = usePathname()
  const t = useTranslations("nav")
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logoUrl } = useRestaurantLogo()
  const useLightNavText = shouldUseLightNavText(isScrolled, overDarkBackground)
  const navTextClass = useLightNavText ? "text-white" : "text-foreground"
  const mutedNavTextClass = useLightNavText
    ? "text-white/80"
    : "text-muted-foreground"

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!shouldRenderSiteHeader(pathname)) return null

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
            <BrandMark src={logoUrl} />
            <span
              className={cn(
                "font-heading text-lg font-semibold tracking-tight transition-colors duration-300",
                navTextClass,
              )}
            >
              {RESTAURANT.name}
            </span>
          </Link>
        </div>

        {/* Desktop Nav — absolutely centered */}
        <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden items-center gap-0.5 md:flex">
          <Link
            href="/menu"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-colors duration-300 hover:underline",
              navTextClass,
              isActiveNavPath(pathname, "/menu") && "font-bold",
            )}
          >
            {t("menu")}
          </Link>
        </nav>

        {/* Desktop Actions — right third */}
        <div className="w-1/3 flex items-center gap-2 justify-end hidden md:flex">
          <LanguageSwitcher
            variant={isScrolled ? "outline" : "ghost"}
            className={cn(
              "rounded-full text-xs font-medium tracking-wide transition-colors duration-300",
              mutedNavTextClass,
            )}
          />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-full text-xs font-medium tracking-wide transition-colors duration-300",
              mutedNavTextClass,
            )}
            render={<NextLink href="/admin" />}
          >
            <LockKeyhole className="size-3.5" />
            {t("staffLogin")}
          </Button>
          <Button
            size="sm"
            className="rounded-full px-5 text-xs font-medium tracking-wide"
            render={<Link href="/#reserve" />}
          >
            {t("bookTable")}
          </Button>
        </div>

        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger
            className={cn(
              "flex md:hidden rounded-lg p-2 transition-colors duration-300",
              navTextClass,
              useLightNavText ? "hover:bg-white/10" : "hover:bg-muted",
            )}
          >
            <Menu className="size-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="flex flex-col gap-4 mt-8">
              <Link
                href="/menu"
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("menu")}
              </Link>
              <LanguageSwitcher
                variant="ghost"
                className="w-full justify-start text-foreground"
              />
              <div className="border-t pt-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-foreground"
                  render={<NextLink href="/admin" />}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LockKeyhole className="size-4 mr-2" />
                  {t("staffLogin")}
                </Button>
              </div>
              <Button
                className="w-full rounded-full"
                render={<Link href="/#reserve" />}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("bookTable")}
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
