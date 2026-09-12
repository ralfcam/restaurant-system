"use server"

import {
  computeBookingPatterns,
  computeVisitDuration,
  countOutcomeStatuses,
  isDateInInclusiveRange,
  resolveAnalyticsPeriod,
  type AnalyticsDuration,
  type AnalyticsOutcomes,
  type AnalyticsPatterns,
  type AnalyticsPeriod,
  type AnalyticsPeriodInput,
} from "@/lib/analytics/report"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

function analyticsQueryError(message: string): { error: string } {
  console.error("[analytics] getReservationAnalytics error:", message)
  return { error: "Could not load analytics." }
}

/** RA-10: aggregates only — never `guest_name`, `email`, or `phone`. */
const RESERVATION_ANALYTICS_SELECT =
  "id, status, date, completed_at, time, party_size" as const

function analyticsReservationFields(row: {
  id?: string | null
  status?: string | null
  date?: string | null
  completed_at?: string | null
  time?: string | null
  party_size?: number | null
}) {
  return {
    id: row.id,
    status: row.status,
    date: row.date,
    completed_at: row.completed_at,
    time: row.time,
    party_size: row.party_size,
  }
}

/**
 * Staff-only analytics reader. Queries are SELECT-only (RA-2): never INSERT,
 * UPDATE, or DELETE `reservations`, `tables`, or `status_events`. Fail-closed
 * (RA-8 / STAFF-LIST analogue): auth or a non-null query error returns `{ error }`
 * with a stable message (`Unauthorized.` / `Could not load analytics.`) and MUST
 * NOT include slice zeros. Genuine all-zero success omits `error`. Invalid
 * `from`/`to` or inverted range returns `{ error: "Invalid reporting period." }`
 * (RA-3). Outcomes count only `no_show` and `cancelled` (RA-5). Duration uses
 * seated-event → `completed_at` (RA-6) and never occupancy settings. Patterns are
 * restaurant-level date/weekday/hour/party_size histograms (RA-7). JSON never
 * includes guest PII (RA-10). Guest SELECT on `reservations` and `status_events`
 * stays denied for anon/authenticated (RA-9); this reader never GRANTs it.
 */
export async function getReservationAnalytics(
  period?: AnalyticsPeriodInput,
): Promise<
  | { error: string }
  | (AnalyticsPeriod &
      AnalyticsOutcomes & {
        duration: AnalyticsDuration
        patterns: AnalyticsPatterns
      })
> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const resolved = resolveAnalyticsPeriod(period)
  if ("error" in resolved) return resolved

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("reservations")
    .select(RESERVATION_ANALYTICS_SELECT)
    .gte("date", resolved.from)
    .lte("date", resolved.to)

  if (error) return analyticsQueryError(error.message)

  // RA-10: unit thenables ignore `.select()`; drop extra columns before aggregates.
  const reservations = (data ?? []).map(analyticsReservationFields)

  // RA-6 candidates only. Skip `.in()` on [] (PostgREST `in.()` errors).
  const candidateIds: string[] = []
  for (const row of reservations) {
    if (
      row.status === "completed" &&
      row.completed_at != null &&
      typeof row.id === "string" &&
      isDateInInclusiveRange(row.date, resolved)
    ) {
      candidateIds.push(row.id)
    }
  }

  let events: Parameters<typeof computeVisitDuration>[1] = []
  if (candidateIds.length > 0) {
    const { data: seatedEvents, error: eventsError } = await supabase
      .from("status_events")
      .select("entity_type, entity_id, to_status, created_at")
      .eq("entity_type", "reservation")
      .eq("to_status", "seated")
      .in("entity_id", candidateIds)

    if (eventsError) return analyticsQueryError(eventsError.message)
    events = seatedEvents ?? []
  }

  return {
    ...resolved,
    ...countOutcomeStatuses(reservations, resolved),
    duration: computeVisitDuration(reservations, events, resolved),
    patterns: computeBookingPatterns(reservations, resolved),
  }
}
