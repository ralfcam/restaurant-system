import "server-only"
import { isHttpsUrl } from "@/lib/marketing/https-url"
import { createServiceClient } from "@/lib/supabase/service"

const DEFAULT_REVIEW_EMAIL_DELAY_HOURS = 24
const MIN_REVIEW_EMAIL_DELAY_HOURS = 0
const MAX_REVIEW_EMAIL_DELAY_HOURS = 72
const HOUR_MS = 60 * 60 * 1000

/** PV-5: 0–72 inclusive; invalid including NaN / out of range → 24 (not bound-clamp). */
function clampReviewEmailDelayHours(hours: unknown): number {
  if (
    typeof hours === "number" &&
    Number.isInteger(hours) &&
    hours >= MIN_REVIEW_EMAIL_DELAY_HOURS &&
    hours <= MAX_REVIEW_EMAIL_DELAY_HOURS
  ) {
    return hours
  }
  return DEFAULT_REVIEW_EMAIL_DELAY_HOURS
}

/** Elapsed clock is `completed_at` only; missing/invalid timestamps never become due. */
function isReviewEmailDue(
  completedAt: string | null | undefined,
  delayHours: number,
  now: Date,
): boolean {
  const completedMs = Date.parse(String(completedAt ?? ""))
  if (!Number.isFinite(completedMs)) return false
  return now.getTime() >= completedMs + delayHours * HOUR_MS
}

/** `&` first so later entities are not re-escaped. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/** PV-7: latest copy as text + Maps URL as an href (staff-entered; no locale swap). */
function reviewEmailHtml(copy: string, mapsUrl: string): string {
  const safeCopy = escapeHtml(copy)
  const safeHref = escapeHtml(mapsUrl)
  return `${safeCopy}<a href="${safeHref}">${safeHref}</a>`
}

type ReservationSnapshot = {
  email?: string | null
  status?: string | null
  completed_at?: string | null
}

type SendRow = {
  reservation_id?: string
  sent_at?: string | null
  reservations?: ReservationSnapshot | null
}

/** PV-8: stamp `review_email_sends.sent_at` only — never reservations or occupancy. */
export async function processDueReviewEmails({
  mailer,
  now,
}: {
  mailer: { send: (payload?: unknown) => unknown }
  now?: Date
}): Promise<void> {
  const db = createServiceClient()
  const clock = now ?? new Date()

  const { data: settings, error: settingsError } = await db
    .from("restaurant_settings")
    .select(
      "review_email_enabled, review_email_copy, review_email_maps_url, review_email_delay_hours",
    )
    .eq("id", 1)
    .maybeSingle()

  if (settingsError) {
    console.error(
      "[marketing] processDueReviewEmails settings:",
      settingsError.message,
    )
    return
  }

  const copy = String(settings?.review_email_copy ?? "")
  const mapsUrl = String(settings?.review_email_maps_url ?? "")
  const settingsAllowSend =
    settings?.review_email_enabled === true &&
    copy.trim().length > 0 &&
    isHttpsUrl(mapsUrl)

  if (!settingsAllowSend) return

  const delayHours = clampReviewEmailDelayHours(
    settings?.review_email_delay_hours,
  )

  const { data: sends, error: sendsError } = await db
    .from("review_email_sends")
    .select(
      "reservation_id, sent_at, reservations(email, status, completed_at)",
    )
    .is("sent_at", null)

  if (sendsError) {
    console.error(
      "[marketing] processDueReviewEmails sends:",
      sendsError.message,
    )
    return
  }

  for (const row of (sends ?? []) as SendRow[]) {
    const reservation = row.reservations
    const email = reservation?.email
    if (
      !row.reservation_id ||
      typeof email !== "string" ||
      email.trim() === "" ||
      reservation?.status !== "completed" ||
      !isReviewEmailDue(reservation?.completed_at, delayHours, clock)
    ) {
      continue
    }
    const sentAt = clock.toISOString()
    // PV-6: exclusive CAS on sent_at before mailer; empty select = lost claim.
    const { data: claimed, error: claimError } = await db
      .from("review_email_sends")
      .update({ sent_at: sentAt })
      .eq("reservation_id", row.reservation_id)
      .is("sent_at", null)
      .select("reservation_id")

    if (claimError) {
      console.error(
        "[marketing] processDueReviewEmails claim:",
        claimError.message,
      )
      continue
    }
    if (!claimed?.length) continue

    try {
      await mailer.send({
        to: email,
        html: reviewEmailHtml(copy, mapsUrl),
      })
    } catch (error) {
      await db
        .from("review_email_sends")
        .update({ sent_at: null })
        .eq("reservation_id", row.reservation_id)
      throw error
    }
  }
}
