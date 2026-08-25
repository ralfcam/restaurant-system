"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { SITE_LOGO } from "@/lib/site-chrome"

/**
 * Uploaded logo only. Returns null when none is set — the platform ships
 * without a bundled brand mark so a new restaurant bootstraps from the
 * name alone.
 */
export function BrandMark({
  src,
  alt = SITE_LOGO.alt,
  size = SITE_LOGO.width,
  className,
}: {
  src: string | null | undefined
  alt?: string
  size?: number
  className?: string
}) {
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
        alt={alt}
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </span>
  )
}
