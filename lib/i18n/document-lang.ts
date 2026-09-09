import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"

export function resolveDocumentLang(pathname: string): "fr" | "en" {
  if (resolveLocaleRoutingDecision(pathname) === "skip-locale") {
    return "en"
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en"
  }

  return "fr"
}
