"use server"

import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { getDayOfWeekInRestaurantTZ } from "@/lib/timezone"
import {
  type OperatingDay,
  type OperatingWindow,
  type OperatingWindowRow,
  DEFAULT_OPERATING_DAYS,
  daysToWindowsMap,
  flattenDaysToRows,
  groupRowsByDay,
  validateOperatingDays,
} from "@/lib/reservations/operating-hours"

export type {
  OperatingDay,
  OperatingSegment,
  OperatingWindow,
  OperatingWindowRow,
} from "@/lib/reservations/operating-hours"

const WINDOW_COLUMNS =
  "day_of_week, opens_at, closes_at, is_closed, label, sort_order, guest_note"

/**
 * Detects PostgREST schema-cache / missing-table errors. These occur when the
 * `blocked_dates` table doesn't exist yet or the PostgREST cache is stale
 * (codes PGRST116 / PGRST205, or messages mentioning the schema cache).
 */
function isSchemaCacheError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  return (
    error.code === "PGRST116" ||
    error.code === "PGRST205" ||
    (error.message?.toLowerCase().includes("schema cache") ?? false) ||
    (error.message?.toLowerCase().includes("does not exist") ?? false)
  )
}

function defaultDay(dayOfWeek: number): OperatingDay {
  return DEFAULT_OPERATING_DAYS[dayOfWeek] ?? DEFAULT_OPERATING_DAYS[0]
}

/**
 * Fetch the operating day (closed flag + opening-hour segments) for a date.
 * Falls back to the seeded default if not configured.
 */
export async function getOperatingWindowForDate(
  dateISO: string,
): Promise<OperatingDay> {
  const dayOfWeek = getDayOfWeekInRestaurantTZ(dateISO)

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select(WINDOW_COLUMNS)
    .eq("day_of_week", dayOfWeek)
    .order("sort_order", { ascending: true })

  if (error || !data || data.length === 0) {
    return defaultDay(dayOfWeek)
  }

  return (
    groupRowsByDay(data as OperatingWindowRow[])[dayOfWeek] ??
    defaultDay(dayOfWeek)
  )
}

/**
 * Check if a specific date is blocked (e.g., holiday).
 */
export async function isDateBlocked(dateISO: string): Promise<boolean> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("date")
    .eq("date", dateISO)
    .maybeSingle()

  // If table doesn't exist, assume no dates are blocked (fail open)
  if (error) {
    return false
  }

  return data !== null
}

/**
 * Get all blocked dates in a given month (for calendar visualization).
 */
export async function getBlockedDatesInMonth(
  year: number,
  month: number,
): Promise<string[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("date")
    .gte("date", startDate)
    .lte("date", endDate)

  if (error) {
    console.error("[availability] getBlockedDatesInMonth error:", error.message)
    return []
  }

  return (data ?? []).map((row) => row.date as string)
}

/**
 * Fetch all operating days as a map keyed by day_of_week.
 * Used by the calendar to evaluate disabled dates without per-date server calls.
 * Falls back to safe defaults if the table doesn't exist yet.
 */
export async function getAllOperatingWindowsMap(): Promise<
  Record<number, OperatingWindow>
> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select(WINDOW_COLUMNS)
    .order("sort_order", { ascending: true })

  if (error || !data || data.length === 0) {
    return daysToWindowsMap(DEFAULT_OPERATING_DAYS)
  }

  return daysToWindowsMap(groupRowsByDay(data as OperatingWindowRow[]))
}

/**
 * Fetch all blocked dates within a date range (inclusive).
 * Used by the calendar to bulk-evaluate disabled dates without per-date server calls.
 */
export async function getBlockedDatesInRange(
  startISO: string,
  endISO: string,
): Promise<string[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("date")
    .gte("date", startISO)
    .lte("date", endISO)

  if (error) return []
  return (data ?? []).map((row) => row.date as string)
}

/**
 * Fetch all operating days (for admin configuration page).
 */
export async function getAllOperatingWindows(): Promise<OperatingDay[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select(WINDOW_COLUMNS)
    .order("day_of_week", { ascending: true })
    .order("sort_order", { ascending: true })

  if (error) {
    console.error("[availability] getAllOperatingWindows error:", error.message)
    return []
  }

  return groupRowsByDay((data ?? []) as OperatingWindowRow[])
}

/**
 * Replace the full weekly opening-hour schedule in one staff-authorized batch.
 * Accepts seven `OperatingDay` values (closed flag + segments).
 * Returns a strict { success: true } | { success: false; error: string } contract.
 */
export async function upsertOperatingWindows(
  days: OperatingDay[],
): Promise<{ success: true } | { success: false; error: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { success: false, error: "Unauthorized." }

  const validationError = validateOperatingDays(days)
  if (validationError) return { success: false, error: validationError }

  const supabase = createServiceClient()
  const rows = flattenDaysToRows(days)

  const { error } = await supabase.rpc("replace_operating_windows", {
    p_windows: rows,
  })

  if (error) {
    console.error("[availability] upsertOperatingWindows error:", error.message)
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Toggle a blocked date — inserts if not present, deletes if already blocked.
 * This is the single canonical write path for blocked dates — there are
 * intentionally no separate add/remove variants, since a toggle can't drift
 * out of sync with the calendar's displayed state.
 * Returns whether the date is now blocked (true) or unblocked (false).
 */
export async function toggleBlockedDate(
  dateISO: string,
): Promise<{ blocked: boolean; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { blocked: false, error: "Unauthorized." }

  // Strictly re-format the incoming string through the restaurant timezone to
  // guarantee the payload is always YYYY-MM-DD in Europe/Zurich, regardless of
  // the caller's locale or clock skew.
  const safeISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateISO + "T12:00:00")) // noon anchors the date safely

  const supabase = createServiceClient()

  // Check current state
  const { data, error: selectError } = await supabase
    .from("blocked_dates")
    .select("date")
    .eq("date", safeISO)
    .maybeSingle()

  // Surface schema-cache / missing-table errors with a recognizable PGRST code
  // prefix so the client can render an action-oriented message.
  if (selectError && isSchemaCacheError(selectError)) {
    return { blocked: false, error: `PGRST116: ${selectError.message}` }
  }
  if (selectError) {
    return { blocked: false, error: selectError.message }
  }

  if (data) {
    // Already blocked — remove it
    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("date", safeISO)
    if (error) {
      if (isSchemaCacheError(error))
        return { blocked: true, error: `PGRST116: ${error.message}` }
      return { blocked: true, error: error.message }
    }
    return { blocked: false }
  } else {
    // Not blocked — add it
    const { error } = await supabase
      .from("blocked_dates")
      .insert({ date: safeISO, reason: "Admin blocked" })
    if (error) {
      if (isSchemaCacheError(error))
        return { blocked: false, error: `PGRST116: ${error.message}` }
      return { blocked: false, error: error.message }
    }
    return { blocked: true }
  }
}
