"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { RESTAURANT } from "@/lib/data"
import { SITE_LOGO } from "@/lib/site-chrome"

/**
 * Uploaded logo only. Returns null when none is set — the platform ships
 * without a bundled brand mark so a new restaurant bootstraps from the
 * name alone.
 */
export function BrandMark({
  src,
  alt,
  size = SITE_LOGO.width,
  className,
}: {
  src: string | null | undefined
  alt?: string
  size?: number
  className?: string
}) {
  const t = useTranslations("staff.branding")
  const resolvedAlt = alt ?? t("logoAlt", { name: RESTAURANT.name })
  if (!src) return null

  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={resolvedAlt}
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </span>
  )
}
