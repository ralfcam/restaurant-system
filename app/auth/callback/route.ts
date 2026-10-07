import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const requested = searchParams.get("next") ?? "/admin"
  const next =
    requested.startsWith("/") &&
    requested.charAt(1) !== "/" &&
    requested.charAt(1) !== "\\" &&
    !requested.includes("://")
      ? requested
      : "/admin"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
