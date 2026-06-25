/**
 * A plain Supabase client using the anon key with no session/cookie handling.
 * Use this in server actions that must run without an authenticated session
 * (e.g. public guest reservation inserts that rely on RLS anon policies).
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
