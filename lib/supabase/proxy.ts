import { isStaffUser } from "@/lib/supabase/is-staff-user"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const STAFF_PATHS = ["/admin", "/pos", "/kds"] as const

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isStaffPath = STAFF_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  )

  if (isStaffPath && !isStaffUser(user)) {
    const url = request.nextUrl.clone()
    url.pathname = user ? "/" : "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
