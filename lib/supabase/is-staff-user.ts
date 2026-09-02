import type { User } from "@supabase/supabase-js"

/**
 * True when JWT `app_metadata.role` is the string `"super_admin"`.
 * Argument is `object` (not `User`) so partial test fixtures type-check;
 * only `app_metadata.role` is read.
 */
export function isSuperAdminUser(user: object | null | undefined): boolean {
  return (user as User | null | undefined)?.app_metadata?.role === "super_admin"
}

/** True when JWT `app_metadata.role` is `"staff"`, or super-admin (implies staff). */
export function isStaffUser(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "staff" || isSuperAdminUser(user)
}
