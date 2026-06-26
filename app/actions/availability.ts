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

  const supabase = createAnonClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("day_of_week", dayOfWeek)
    .single()

  if (error) {
    console.error("[availability] getOperatingWindowForDate error:", error.message)
    // Return default if fetch fails
    return null
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

  if (error) {
    console.error("[availability] isDateBlocked error:", error.message)
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
