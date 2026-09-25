import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"

export function resolveDocumentLang(pathname: string): "fr" | "en" {
  // /api is skip-locale but stays English. Other skip-locale paths are staff/auth.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return "en"
  }

  if (resolveLocaleRoutingDecision(pathname) === "skip-locale") {
    return "fr"
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en"
  }

  return "fr"
}
