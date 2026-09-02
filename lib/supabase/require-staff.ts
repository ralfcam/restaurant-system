/**
 * Authorization guards for privileged server actions.
 *
 * Many privileged actions (reservations, orders, tables, menu, scheduling,
 * branding, booking config) use `createServiceClient()` to write to the
 * database. The service-role key bypasses Row Level Security entirely, so
 * without an explicit JWT-claim check those actions would be callable by
 * anyone who can reach the Server Action endpoint directly — regardless of
 * whether they ever loaded an /admin, /pos, or /kds page (middleware only
 * gates page navigations, not the action POST endpoints themselves).
 *
 * Call `requireStaffUser` or `requireSuperAdminUser` at the top of every
 * privileged action and bail out if it returns `null`. Both gates read
 * JWT `app_metadata.role` only — not `user_metadata` and not merely a valid
 * session. Staff (`"staff"`) does not satisfy `requireSuperAdminUser`.
 */
import { isStaffUser, isSuperAdminUser } from "@/lib/supabase/is-staff-user"
import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"

export { isStaffUser, isSuperAdminUser }

export async function requireStaffUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isStaffUser(user) ? user : null
}

export async function requireSuperAdminUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isSuperAdminUser(user) ? user : null
}
