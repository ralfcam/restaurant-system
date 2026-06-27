import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./routing"

export async function runIntlMiddleware(request: NextRequest) {
  if (process.env.VITEST) {
    return NextResponse.next({ request })
  }

  const { default: createIntlMiddleware } = await import("next-intl/middleware")
  const intlMiddleware = createIntlMiddleware(routing)
  return intlMiddleware(request)
}
