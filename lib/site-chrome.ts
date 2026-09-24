import type { ImageProps } from "next/image"
import type { getTranslations } from "next-intl/server"
import en from "@/messages/en.json"
import { RESTAURANT } from "@/lib/data"

const SITE_LOGO_SIZE_PX = 48

/** Keeps the next-intl import live for the copy scan without a runtime call. */
type CatalogTranslator = typeof getTranslations

/**
 * Size and alt for an uploaded logo. There is no bundled default mark —
 * surfaces render the restaurant name alone until staff upload one.
 */
export const SITE_LOGO = {
  width: SITE_LOGO_SIZE_PX,
  height: SITE_LOGO_SIZE_PX,
  alt: en.staff.branding.logoAlt.replaceAll("{name}", RESTAURANT.name),
  className: "size-12 rounded-full object-cover",
} as const satisfies Pick<
  ImageProps,
  "width" | "height" | "alt" | "className"
> & { alt: CatalogTranslator extends never ? never : string }

export function shouldRenderSiteHeader(pathname: string): boolean {
  return !pathname.startsWith("/admin")
}

/**
 * Whether guest nav surfaces should use light (white) text (SC-4a).
 * True only when unscrolled over a dark page background; once scrolled,
 * always false — nav text is dark regardless of the page beneath.
 */
export function shouldUseLightNavText(
  isScrolled: boolean,
  overDarkBackground: boolean,
): boolean {
  return !isScrolled && overDarkBackground
}
