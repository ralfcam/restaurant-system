"use server"

import {
  buildGuestProfile,
  deriveGuestIncidents,
  mergeCandidateEmails,
  normalizeGuestEmail,
} from "@/lib/guest-profiles"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

export async function getGuestProfile(email: string): Promise<
  {
    error?: string
    incidents?: ReturnType<typeof deriveGuestIncidents>
  } & Partial<ReturnType<typeof buildGuestProfile>>
> {
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

  const rows = data ?? []
  return {
    ...buildGuestProfile(email, rows),
    incidents: deriveGuestIncidents(
      rows.map(
        (row: {
          status?: string | null
          date?: string | null
          time?: string | null
          cancelled_at?: string | null
          seated_at?: string | null
        }) => ({
          status: row.status ?? "",
          date: row.date ?? "",
          time: row.time ?? "",
          cancelled_at: row.cancelled_at ?? null,
          seated_at: row.seated_at ?? null,
        }),
      ),
    ),
  }
}

export async function updateGuestProfilePii(input: {
  email: string
  guest_name: string
  phone: string
}): Promise<{ ok?: true; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const { data, error } = await createServiceClient()
    .from("reservations")
    .update({ guest_name: input.guest_name, phone: input.phone })
    // GP-10: write the GP-2 generated-key group — not exact stored email.
    .eq("email_normalized", normalizeGuestEmail(input.email))
    .select("id")
  if (error) {
    console.error("[guest-profiles] updateGuestProfilePii:", error.message)
    return { error: "errors.guestProfiles.unmapped" }
  }
  if (!data?.length) return { error: "errors.guestProfiles.notFound" }
  return { ok: true }
}

export async function listGuestMergeCandidates(
  email: string,
): Promise<{ error?: string; candidates?: string[] }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const { data } = await createServiceClient()
    .from("reservations")
    .select("id, email, phone")
  return { candidates: mergeCandidateEmails(data ?? [], email) }
}

function confirmMergeUnmapped(message: string): { error: string } {
  console.error("[guest-profiles] confirmGuestMerge:", message)
  return { error: "errors.guestProfiles.unmapped" }
}

export async function confirmGuestMerge({
  survivingEmail,
  otherEmail,
}: {
  survivingEmail: string
  otherEmail: string
}): Promise<{ error?: string; ok?: true }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const surviving = normalizeGuestEmail(survivingEmail)
  const other = normalizeGuestEmail(otherEmail)
  if (surviving == null || other == null || surviving === other) {
    return { ok: true }
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from("reservations")
    .select("id, email, phone")
  if (error) return confirmMergeUnmapped(error.message)
  if (!mergeCandidateEmails(data ?? [], surviving).includes(other)) {
    return { ok: true }
  }

  const { error: updateError } = await service
    .from("reservations")
    .update({ email: surviving })
    .eq("email_normalized", other)
    .select("id")
  if (updateError) return confirmMergeUnmapped(updateError.message)
  return { ok: true }
}
