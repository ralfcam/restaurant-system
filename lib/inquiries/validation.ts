/**
 * Pure validation for staff-submitted event inquiry payloads.
 *
 * This lives outside `app/actions/inquiries.ts` (a `"use server"` file)
 * because Next.js Server Action files may only export async functions —
 * a synchronous, dependency-free validator belongs in its own module.
 *
 * Do not reuse `validateReservationPayload`: that caps party size at 8
 * (booking-rules AC-1). EI-4 allows `party_size >= 1` with no online cap.
 * Phone and email reuse the guest-booking patterns (`PHONE_RE` / BW-13
 * `EMAIL_RE`) so inquiry contact rules cannot drift from reservations.
 */

import { EMAIL_RE, PHONE_RE } from "@/lib/reservations/validation"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export type InquiryCreateInput = {
  guest_name?: unknown
  requested_date?: unknown
  party_size?: unknown
  email?: unknown
  phone?: unknown
  kind?: unknown
  notes?: unknown
}

export type InquiryInsertRow = {
  guest_name: string
  requested_date: string
  party_size: number
  email: string | null
  phone: string | null
  kind?: "group" | "private_event"
  notes?: string
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function validateInquiryPayload(
  payload: InquiryCreateInput,
): { error: string } | { row: InquiryInsertRow } {
  const guest_name = trimmed(payload.guest_name)
  if (!guest_name) return { error: "errors.inquiries.nameRequired" }

  if (
    typeof payload.party_size !== "number" ||
    !Number.isInteger(payload.party_size) ||
    payload.party_size < 1
  ) {
    return { error: "errors.inquiries.partySizeInvalid" }
  }

  if (
    typeof payload.requested_date !== "string" ||
    !DATE_RE.test(payload.requested_date)
  ) {
    return { error: "errors.inquiries.dateInvalid" }
  }

  const email = trimmed(payload.email)
  const phone = trimmed(payload.phone)
  if (!email && !phone) {
    return { error: "errors.inquiries.contactRequired" }
  }
  if (email && !EMAIL_RE.test(email)) {
    return { error: "errors.inquiries.emailInvalid" }
  }
  if (phone && !PHONE_RE.test(phone)) {
    return { error: "errors.inquiries.phoneInvalid" }
  }

  let kind: InquiryInsertRow["kind"]
  if (payload.kind != null && payload.kind !== "") {
    if (payload.kind !== "group" && payload.kind !== "private_event") {
      return { error: "errors.inquiries.kindInvalid" }
    }
    kind = payload.kind
  }

  const notes = trimmed(payload.notes)

  const row: InquiryInsertRow = {
    guest_name,
    requested_date: payload.requested_date,
    party_size: payload.party_size,
    email: email || null,
    phone: phone || null,
  }
  if (kind) row.kind = kind
  if (notes) row.notes = notes
  return { row }
}
