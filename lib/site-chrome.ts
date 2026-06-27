import type { ImageProps } from "next/image"
import { RESTAURANT } from "@/lib/data"

const SITE_LOGO_SIZE_PX = 48

export const SITE_LOGO = {
  src: "/images/logo.png",
  width: SITE_LOGO_SIZE_PX,
  height: SITE_LOGO_SIZE_PX,
  alt: `${RESTAURANT.name} logo`,
  className: "size-12 rounded-full object-cover",
} as const satisfies Pick<ImageProps, "src" | "width" | "height" | "alt" | "className">

export function shouldRenderSiteHeader(pathname: string): boolean {
  return !pathname.startsWith("/admin")
}
