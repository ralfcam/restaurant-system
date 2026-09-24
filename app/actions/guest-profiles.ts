"use server"

import { buildGuestProfile, normalizeGuestEmail } from "@/lib/guest-profiles"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

export async function getGuestProfile(
  email: string,
): Promise<{ error?: string } & Partial<ReturnType<typeof buildGuestProfile>>> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const { data, error } = await createServiceClient()
    .from("reservations")
    .select("*")
    // GP-2: generated trim+lower key — not exact stored email.
    .eq("email_normalized", normalizeGuestEmail(email))
  if (error) {
    console.error("[guest-profiles] getGuestProfile:", error.message)
    return { error: "errors.guestProfiles.unmapped" }
  }

  return buildGuestProfile(email, data ?? [])
}

export async function updateGuestProfilePii(input: {
  email: string
  guest_name: string
  phone: string
}): Promise<{ error?: string } | undefined> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const { error } = await createServiceClient()
    .from("reservations")
    .update({ guest_name: input.guest_name, phone: input.phone })
    // GP-10: write the GP-2 generated-key group — not exact stored email.
    .eq("email_normalized", normalizeGuestEmail(input.email))
  if (error) {
    console.error("[guest-profiles] updateGuestProfilePii:", error.message)
    return { error: "errors.guestProfiles.unmapped" }
  }
}
