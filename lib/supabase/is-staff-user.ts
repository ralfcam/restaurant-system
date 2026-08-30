import type { User } from "@supabase/supabase-js"

/** True when JWT `app_metadata.role` is the string `"staff"`. */
export function isStaffUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "staff"
}
