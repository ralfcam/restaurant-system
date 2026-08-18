import type { ImageProps } from "next/image"
import { RESTAURANT } from "@/lib/data"

const SITE_LOGO_SIZE_PX = 48

/**
 * Size and alt for an uploaded logo. There is no bundled default mark —
 * surfaces render the restaurant name alone until staff upload one.
 */
export const SITE_LOGO = {
  width: SITE_LOGO_SIZE_PX,
  height: SITE_LOGO_SIZE_PX,
  alt: `${RESTAURANT.name} logo`,
  className: "size-12 rounded-full object-cover",
} as const satisfies Pick<ImageProps, "width" | "height" | "alt" | "className">

export function shouldRenderSiteHeader(pathname: string): boolean {
  return !pathname.startsWith("/admin")
}
