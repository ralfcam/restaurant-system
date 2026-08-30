/**
 * Authorization guard for privileged server actions.
 *
 * Many staff-only actions (reservations, orders, tables, menu, scheduling)
 * use `createServiceClient()` to write to the database. The service-role key
 * bypasses Row Level Security entirely, so without an explicit staff-claim check
 * those actions would be callable by anyone who can reach the Server Action
 * endpoint directly — regardless of whether they ever loaded an /admin, /pos,
 * or /kds page (middleware only gates page navigations, not the action POST
 * endpoints themselves).
 *
 * Call this at the top of every privileged action and bail out if it returns
 * `null`. Staff is JWT `app_metadata.role === "staff"` — not `user_metadata`
 * and not merely a valid session.
 */
import { isStaffUser } from "@/lib/supabase/is-staff-user"
import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export { isStaffUser }

export async function requireStaffUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isStaffUser(user) ? user : null
}
