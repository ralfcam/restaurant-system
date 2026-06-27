import { runIntlMiddleware } from "@/i18n/intl-middleware"
import { resolveLocaleRoutingDecision } from "@/i18n/middleware-scope"
import { updateSession } from "@/lib/supabase/proxy"
import { type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const sessionResponse = await updateSession(request)
  const decision = resolveLocaleRoutingDecision(request.nextUrl.pathname)

  if (decision === "skip-locale") {
    return sessionResponse
  }

  const intlResponse = await runIntlMiddleware(request)

  for (const { name, value } of sessionResponse.cookies?.getAll() ?? []) {
    intlResponse.cookies.set(name, value)
  }

  return intlResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
