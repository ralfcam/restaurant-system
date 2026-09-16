"use server"

import { buildGuestProfile, normalizeGuestEmail } from "@/lib/guest-profiles"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

export async function getGuestProfile(
  email: string,
): Promise<{ error?: string } & Partial<ReturnType<typeof buildGuestProfile>>> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const { data, error } = await createServiceClient()
    .from("reservations")
    .select("*")
    .eq("email", normalizeGuestEmail(email))
  if (error) return { error: error.message }

  return buildGuestProfile(email, data ?? [])
}

export async function updateGuestProfilePii(input: {
  email: string
  guest_name: string
  phone: string
}): Promise<{ error?: string } | undefined> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const { error } = await createServiceClient()
    .from("reservations")
    .update({ guest_name: input.guest_name, phone: input.phone })
    .eq("email", normalizeGuestEmail(input.email))
  if (error) return { error: error.message }
}
