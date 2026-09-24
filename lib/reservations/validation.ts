/**
 * Pure validation for guest-submitted reservation payloads.
 *
 * This lives outside `app/actions/reservations.ts` (a `"use server"` file)
 * because Next.js Server Action files may only export async functions —
 * a synchronous, dependency-free validator belongs in its own module so it
 * can be unit tested directly without mocking Supabase or `next/cache`.
 *
 * The database trigger (`validate_reservation_availability`) enforces
 * business rules atomically (capacity, hours, blocked dates), but it cannot
 * catch malformed input — a non-date string, a negative or fractional party
 * size, a time with no colon, an invalid email, or oversized text fields.
 * Those must be rejected here so bad input never reaches the trigger or
 * gets persisted.
 */

export const RESERVATION_ONLINE_MAX_PARTY = 8

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
export const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/
// BW-13: trimmed local@domain with a `.` in the domain — not RFC 5322.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LEN = 100
const MAX_NOTES_LEN = 500

export type ReservationPayload = {
  guestName: string
  partySize: number
  date: string
  time: string
  phone: string
  email: string
  notes?: string
}

/**
 * @param today - Current date in the restaurant's timezone (YYYY-MM-DD),
 * injected so this stays a pure function that's trivial to unit test across
 * date boundaries without mocking the clock or timezone helpers.
 */
export function validateReservationPayload(
  payload: ReservationPayload,
  today: string,
): string | null {
  const guestName = payload.guestName?.trim() ?? ""
  if (!guestName) return "errors.reservation.nameRequired"
  if (guestName.length > MAX_NAME_LEN) return "errors.reservation.nameTooLong"

  if (
    typeof payload.partySize !== "number" ||
    !Number.isInteger(payload.partySize) ||
    payload.partySize < 1
  ) {
    return "errors.reservation.partySizeInvalid"
  }
  if (payload.partySize > RESERVATION_ONLINE_MAX_PARTY) {
    return "errors.reservation.partyTooLarge"
  }

  if (typeof payload.date !== "string" || !DATE_RE.test(payload.date)) {
    return "errors.reservation.dateInvalid"
  }
  // The Date constructor silently rolls over out-of-range days (e.g.
  // 2026-02-30 becomes March 2), so a NaN check alone can't catch calendar-
  // invalid dates. Reconstruct from the parsed UTC fields and compare back
  // against the requested year/month/day to detect any rollover.
  const [year, month, day] = payload.date.split("-").map(Number)
  const parsedDate = new Date(Date.UTC(year, month - 1, day))
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    return "errors.reservation.dateInvalid"
  }

  if (payload.date < today) return "errors.reservation.dateInPast"

  if (typeof payload.time !== "string" || !TIME_RE.test(payload.time)) {
    return "errors.reservation.timeInvalid"
  }

  const phone = payload.phone?.trim() ?? ""
  if (phone && !PHONE_RE.test(phone)) {
    return "errors.reservation.phoneInvalid"
  }

  const email = payload.email?.trim() ?? ""
  if (!email || !EMAIL_RE.test(email)) {
    return "errors.reservation.emailInvalid"
  }

  if (payload.notes && payload.notes.length > MAX_NOTES_LEN)
    return "errors.reservation.notesTooLong"

  return null
}
