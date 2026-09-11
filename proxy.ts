import { runIntlMiddleware } from "@/i18n/intl-middleware"
import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"
import { updateSession } from "@/lib/supabase/proxy"
import { type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request)
  const decision = resolveLocaleRoutingDecision(request.nextUrl.pathname)

  if (decision === "skip-locale") {
    return sessionResponse
  }

  const intlResponse = await runIntlMiddleware(request)

  // getAll() flattens flags onto each cookie; rest-spread is the options bag
  // (setAll() in lib/supabase/proxy.ts nests them as `options` instead).
  const sessionCookies = sessionResponse.cookies?.getAll() ?? []
  for (const { name, value, ...options } of sessionCookies) {
    intlResponse.cookies.set(name, value, options)
  }

  return intlResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
