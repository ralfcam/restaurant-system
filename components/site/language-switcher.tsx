"use client"

import { Globe } from "lucide-react"
import { useLocale } from "next-intl"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { localizedPathname } from "@/lib/i18n/localized-pathname"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher({
  className,
  variant = "outline",
}: {
  className?: string
  variant?: "outline" | "ghost"
}) {
  const locale = useLocale() as "fr" | "en"
  const pathname = usePathname() ?? "/"
  const targetLocale = locale === "fr" ? "en" : "fr"
  const href = localizedPathname(pathname, targetLocale)

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className ?? "gap-2"}
      data-testid="language-switcher"
      render={<NextLink href={href} />}
    >
      <Globe className="size-4" />
      {locale === "fr" ? "EN" : "FR"}
    </Button>
  )
}
