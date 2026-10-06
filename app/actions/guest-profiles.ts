"use server"

import {
  buildGuestProfile,
  deriveGuestIncidents,
  mergeCandidateEmails,
  normalizeGuestEmail,
  segmentGuests,
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

const POSTGREST_MAX_ROWS = 1000

type GuestMergeReservationRow = {
  id: string
  email: string | null
  phone: string | null
}

async function readAllGuestMergeRows(
  db: ReturnType<typeof createServiceClient>,
): Promise<{
  data: GuestMergeReservationRow[] | null
  error: { message: string } | null
}> {
  const rows: GuestMergeReservationRow[] = []
  for (let start = 0; ; start += POSTGREST_MAX_ROWS) {
    const page = await db
      .from("reservations")
      .select("id, email, phone")
      .order("id", { ascending: true })
      .range(start, start + POSTGREST_MAX_ROWS - 1)
    if (page.error) return page
    const pageRows = (page.data ?? []) as GuestMergeReservationRow[]
    rows.push(...pageRows)
    if (pageRows.length < POSTGREST_MAX_ROWS) {
      return { data: rows, error: null }
    }
  }
}

export async function listGuestMergeCandidates(
  email: string,
): Promise<{ error?: string; candidates?: string[] }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const { data } = await readAllGuestMergeRows(createServiceClient())
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
  const { data, error } = await readAllGuestMergeRows(service)
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

export async function listGuestSegments(
  filters?: NonNullable<Parameters<typeof segmentGuests>[1]>,
): Promise<{
  error?: "errors.guestProfiles.unauthorized" | "errors.guestProfiles.unmapped"
  guests?: ReturnType<typeof segmentGuests>
}> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "errors.guestProfiles.unauthorized" }

  const db = createServiceClient()
  const rows: Parameters<typeof segmentGuests>[0] = []
  for (let start = 0; ; start += POSTGREST_MAX_ROWS) {
    const page = await db
      .from("reservations")
      .select("email, guest_name, phone, status, date, time")
      .order("id", { ascending: true })
      .range(start, start + POSTGREST_MAX_ROWS - 1)
    if (page.error) {
      console.error("[guest-profiles] listGuestSegments:", page.error.message)
      return { error: "errors.guestProfiles.unmapped" }
    }
    const pageRows = (page.data ?? []) as Parameters<typeof segmentGuests>[0]
    rows.push(...pageRows)
    if (pageRows.length < POSTGREST_MAX_ROWS) {
      return { guests: segmentGuests(rows, filters) }
    }
  }
}
