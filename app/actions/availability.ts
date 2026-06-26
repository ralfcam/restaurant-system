"use server"

import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { getDayOfWeekInRestaurantTZ } from "@/lib/timezone"

export type OperatingWindow = {
  day_of_week: number
  opens_at: string
  closes_at: string
  is_closed: boolean
}

/**
 * Fetch the operating window for a specific day of the week.
 * Falls back to default if not configured.
 */
export async function getOperatingWindowForDate(dateISO: string): Promise<OperatingWindow | null> {
  const dayOfWeek = getDayOfWeekInRestaurantTZ(dateISO)

  // Default operating hours if not configured in database
  const DEFAULT_HOURS: Record<number, OperatingWindow> = {
    0: { day_of_week: 0, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Sunday
    1: { day_of_week: 1, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Monday
    2: { day_of_week: 2, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Tuesday
    3: { day_of_week: 3, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Wednesday
    4: { day_of_week: 4, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Thursday
    5: { day_of_week: 5, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Friday
    6: { day_of_week: 6, opens_at: "17:00", closes_at: "22:00", is_closed: false }, // Saturday
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("day_of_week", dayOfWeek)
    .single()

  // If table doesn't exist or no data, use defaults
  if (error || !data) {
    return DEFAULT_HOURS[dayOfWeek] || DEFAULT_HOURS[0]
  }

  return data as OperatingWindow
}

/**
 * Check if a specific date is blocked (e.g., holiday).
 */
export async function isDateBlocked(dateISO: string): Promise<boolean> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("blocked_date", dateISO)
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
export async function getBlockedDatesInMonth(year: number, month: number): Promise<string[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .gte("blocked_date", startDate)
    .lte("blocked_date", endDate)

  if (error) {
    console.error("[availability] getBlockedDatesInMonth error:", error.message)
    return []
  }

  return (data ?? []).map((row) => row.blocked_date)
}

/**
 * Fetch all operating windows as a map keyed by day_of_week.
 * Used by the calendar to evaluate disabled dates without per-date server calls.
 * Falls back to safe defaults (all days open) if the table doesn't exist yet.
 */
export async function getAllOperatingWindowsMap(): Promise<Record<number, OperatingWindow>> {
  const DEFAULT_HOURS: Record<number, OperatingWindow> = {
    0: { day_of_week: 0, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    1: { day_of_week: 1, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    2: { day_of_week: 2, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    3: { day_of_week: 3, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    4: { day_of_week: 4, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    5: { day_of_week: 5, opens_at: "17:00", closes_at: "22:00", is_closed: false },
    6: { day_of_week: 6, opens_at: "17:00", closes_at: "22:00", is_closed: false },
  }

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select("day_of_week, opens_at, closes_at, is_closed")

  if (error || !data || data.length === 0) {
    return DEFAULT_HOURS
  }

  const map: Record<number, OperatingWindow> = { ...DEFAULT_HOURS }
  for (const row of data) {
    map[row.day_of_week] = row as OperatingWindow
  }
  return map
}

/**
 * Fetch all blocked dates within a date range (inclusive).
 * Used by the calendar to bulk-evaluate disabled dates without per-date server calls.
 */
export async function getBlockedDatesInRange(startISO: string, endISO: string): Promise<string[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .gte("blocked_date", startISO)
    .lte("blocked_date", endISO)

  if (error) return []
  return (data ?? []).map((row) => row.blocked_date as string)
}

/**
 * Fetch all operating windows (for admin configuration page).
 */
export async function getAllOperatingWindows(): Promise<OperatingWindow[]> {
  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .order("day_of_week", { ascending: true })

  if (error) {
    console.error("[availability] getAllOperatingWindows error:", error.message)
    return []
  }

  return data as OperatingWindow[]
}

/**
 * Update an operating window (admin action).
 */
export async function updateOperatingWindow(
  dayOfWeek: number,
  updates: Partial<Omit<OperatingWindow, "day_of_week">>,
): Promise<{ error?: string }> {
  const supabase = createAnonClient()

  const { error } = await supabase
    .from("operating_windows")
    .update(updates)
    .eq("day_of_week", dayOfWeek)

  if (error) {
    console.error("[availability] updateOperatingWindow error:", error.message)
    return { error: error.message }
  }

  return {}
}

/**
 * Upsert all 7 operating windows in a single batch (admin Save Changes action).
 * Uses UPSERT so the database values persist and override the client-side seed.
 */
export async function upsertOperatingWindows(
  windows: OperatingWindow[],
): Promise<{ error?: string }> {
  const supabase = createAnonClient()

  const { error } = await supabase
    .from("operating_windows")
    .upsert(
      windows.map((w) => ({
        day_of_week: w.day_of_week,
        opens_at: w.opens_at,
        closes_at: w.closes_at,
        is_closed: w.is_closed,
      })),
      { onConflict: "day_of_week" },
    )

  if (error) {
    console.error("[availability] upsertOperatingWindows error:", error.message)
    return { error: error.message }
  }

  return {}
}

/**
 * Toggle a blocked date — inserts if not present, deletes if already blocked.
 * Returns whether the date is now blocked (true) or unblocked (false).
 */
export async function toggleBlockedDate(
  dateISO: string,
): Promise<{ blocked: boolean; error?: string }> {
  const supabase = createAnonClient()

  // Check current state
  const { data } = await supabase
    .from("blocked_dates")
    .select("blocked_date")
    .eq("blocked_date", dateISO)
    .maybeSingle()

  if (data) {
    // Already blocked — remove it
    const { error } = await supabase
      .from("blocked_dates")
      .delete()
      .eq("blocked_date", dateISO)
    if (error) return { blocked: true, error: error.message }
    return { blocked: false }
  } else {
    // Not blocked — add it
    const { error } = await supabase
      .from("blocked_dates")
      .insert({ blocked_date: dateISO, reason: null })
    if (error) return { blocked: false, error: error.message }
    return { blocked: true }
  }
}

/**
 * Add a blocked date (admin action).
 */
export async function addBlockedDate(dateISO: string, reason?: string): Promise<{ error?: string }> {
  const supabase = createAnonClient()

  const { error } = await supabase.from("blocked_dates").insert({
    blocked_date: dateISO,
    reason: reason ?? null,
  })

  if (error) {
    console.error("[availability] addBlockedDate error:", error.message)
    return { error: error.message }
  }

  return {}
}

/**
 * Remove a blocked date (admin action).
 */
export async function removeBlockedDate(dateISO: string): Promise<{ error?: string }> {
  const supabase = createAnonClient()

  const { error } = await supabase.from("blocked_dates").delete().eq("blocked_date", dateISO)

  if (error) {
    console.error("[availability] removeBlockedDate error:", error.message)
    return { error: error.message }
  }

  return {}
}
