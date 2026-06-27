import { routing } from "@/i18n/routing"

type Locale = (typeof routing.locales)[number]

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (locale === routing.defaultLocale) {
      continue
    }

    if (pathname === `/${locale}`) {
      return "/"
    }

    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1)
    }
  }

  return pathname
}

export function localizedPathname(
  pathname: string,
  targetLocale: Locale,
): string {
  const pathWithoutLocale = stripLocalePrefix(pathname)

  if (targetLocale === routing.defaultLocale) {
    return pathWithoutLocale || "/"
  }

  if (pathWithoutLocale === "/") {
    return `/${targetLocale}`
  }

  return `/${targetLocale}${pathWithoutLocale}`
}
