export type LocaleRoutingDecision = "skip-locale" | "localize"

const LOCALE_EXCLUDED_PREFIXES = ["/admin", "/api", "/auth"] as const

export function resolveLocaleRoutingDecision(
  pathname: string,
): LocaleRoutingDecision {
  if (
    LOCALE_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return "skip-locale"
  }

  return "localize"
}
