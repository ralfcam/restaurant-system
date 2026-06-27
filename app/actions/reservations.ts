"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { revalidatePath } from "next/cache"
import { getOperatingWindowForDate, isDateBlocked } from "@/app/actions/availability"
import { getTodayInRestaurantTZ, getNowTimeInRestaurantTZ } from "@/lib/timezone"

export type ReservationRow = {
  id: string
  guest_name: string
  party_size: number
  date: string
  time: string
  status: "confirmed" | "seated" | "completed" | "cancelled"
  phone: string
  notes: string | null
  table_label: string | null
  conf_code: string
  created_at: string
}

function generateConfCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000)
  return `TVL-${n}`
}

const ONLINE_MAX_PARTY = 8

export async function createReservation(payload: {
  guestName: string
  partySize: number
  date: string
  time: string
  phone: string
  notes?: string
}): Promise<{ confCode: string; error?: string }> {
  // Hard server-side cap — cannot be bypassed by client-side manipulation.
  if (payload.partySize > ONLINE_MAX_PARTY) {
    return {
      confCode: "",
      error: `Online reservations are limited to a maximum of ${ONLINE_MAX_PARTY} people. For larger groups please call us directly.`,
    }
  }

  // Validate against operating hours and blocked dates (server-side enforcement)
  const dateIsBlocked = await isDateBlocked(payload.date)
  if (dateIsBlocked) {
    return {
      confCode: "",
      error: "This date is not available for reservations.",
    }
  }

  const operatingWindow = await getOperatingWindowForDate(payload.date)
  if (!operatingWindow || operatingWindow.is_closed) {
    return {
      confCode: "",
      error: "The restaurant is closed on this date.",
    }
  }

  const opensAt = operatingWindow.opens_at ?? "09:00"
  const closesAt = operatingWindow.closes_at ?? "22:00"

  if (payload.time < opensAt || payload.time > closesAt) {
    return {
      confCode: "",
      error: `Reservations are only available between ${opensAt} and ${closesAt}.`,
    }
  }

  // Use a plain anon client (no session required) for public guest bookings.
  const supabase = createAnonClient()
  const confCode = generateConfCode()

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      guest_name: payload.guestName,
      party_size: payload.partySize,
      date: payload.date,
      time: payload.time,
      phone: payload.phone,
      notes: payload.notes ?? null,
      conf_code: confCode,
    })
    .select("conf_code")
    .single()

  if (error) {
    console.error("[reservations] createReservation error:", error.message, error.code, error.details)

    // PostgreSQL trigger raises use ERRCODE P0001 (raise_exception).
    // Supabase surfaces these as code "P0001" on the error object.
    // Expose the trigger message directly — it is safe, user-facing prose.
    if (error.code === "P0001" && error.message) {
      // Strip the Postgres "ERROR: " prefix if present and return clean text.
      const clean = error.message.replace(/^ERROR:\s*/i, "").trim()
      return { confCode: "", error: clean }
    }

    return { confCode: "", error: "Could not save your reservation. Please try again." }
  }

  revalidatePath("/admin/reservations")
  revalidatePath("/admin")
  return { confCode: data.conf_code }
}

export async function getReservationsForDate(
  date: string,
): Promise<ReservationRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true })

  if (error) {
    console.error("[reservations] getReservationsForDate error:", error.message)
    return []
  }

  return data as ReservationRow[]
}

/**
 * Admin-privileged fetch of all reservations for a given date (YYYY-MM-DD).
 * Uses the service-role client to bypass RLS — safe only in server actions.
 * The `date` column is a native DATE type so simple equality is correct; no
 * timezone boundary arithmetic is needed for this schema.
 */
export async function getReservationsByDate(
  date: string,
): Promise<ReservationRow[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true })

  if (error) {
    console.error("[reservations] getReservationsByDate error:", error.message)
    return []
  }

  return (data ?? []) as ReservationRow[]
}

/** Fetch reservations across a date range (or all if no bounds given). */
export async function getReservations(opts?: {
  from?: string
  to?: string
}): Promise<ReservationRow[]> {
  const supabase = await createClient()

  let query = supabase
    .from("reservations")
    .select("*")
    .order("date", { ascending: true })
    .order("time", { ascending: true })

  if (opts?.from) query = query.gte("date", opts.from)
  if (opts?.to) query = query.lte("date", opts.to)

  const { data, error } = await query

  if (error) {
    console.error("[reservations] getReservations error:", error.message)
    return []
  }

  return data as ReservationRow[]
}

export type SlotAvailability = {
  time: string
  available: boolean
}

/**
 * Returns which TIME_SLOTS are still bookable for a given date + party size.
 * A slot is unavailable when:
 *  - The date is blocked (holiday, special closure)
 *  - The date falls outside operating hours
 *  - It's in the past (today only)
 *  - Adding `partySize` covers would exceed the restaurant's total seating capacity
 */
export async function getAvailableSlots(
  date: string,
  partySize: number,
): Promise<SlotAvailability[]> {
  // Full-day slot grid: 09:00 → 21:30 in 30-minute increments (last seating
  // before the 22:00 standard close). The operating-window comparison below
  // narrows this to each day's actual configured hours.
  const TIME_SLOTS: string[] = []
  for (let h = 9; h <= 21; h++) {
    const hh = String(h).padStart(2, "0")
    TIME_SLOTS.push(`${hh}:00`, `${hh}:30`)
  }
  // Total covers the restaurant can seat at once (sum of all table seats).
  const TOTAL_CAPACITY = 38 // 2+2+4+4+6+4+2+8+4+2

  const supabase = createAnonClient()

  // Check if the requested date is blocked
  const dateIsBlocked = await isDateBlocked(date)
  if (dateIsBlocked) {
    // Entire date is unavailable
    return TIME_SLOTS.map((time) => ({ time, available: false }))
  }

  // Check operating window for the day of week
  const operatingWindow = await getOperatingWindowForDate(date)
  if (!operatingWindow || operatingWindow.is_closed) {
    // Restaurant is closed on this day
    return TIME_SLOTS.map((time) => ({ time, available: false }))
  }

  // Guard against DB rows with null time columns — fall back to the global
  // 09:00–22:00 baseline so the comparison never evaluates against undefined.
  const opensAt = operatingWindow.opens_at ?? "09:00"
  const closesAt = operatingWindow.closes_at ?? "22:00"

  // Fetch all confirmed/seated reservations for this date.
  const { data, error } = await supabase
    .from("reservations")
    .select("time, party_size")
    .eq("date", date)
    .in("status", ["confirmed", "seated"])

  if (error) {
    console.error("[reservations] getAvailableSlots error:", error.message)
    // Fail open so the widget is never completely blocked.
    return TIME_SLOTS.map((time) => ({ time, available: true }))
  }

  // Sum booked covers per slot.
  const bookedBySlot: Record<string, number> = {}
  for (const row of data ?? []) {
    bookedBySlot[row.time] = (bookedBySlot[row.time] ?? 0) + row.party_size
  }

  // "Now" in local restaurant timezone — block past slots on today's date.
  const todayISO = getTodayInRestaurantTZ()
  const nowTime = getNowTimeInRestaurantTZ()

  return TIME_SLOTS.map((time) => {
    // Block times outside operating hours
    if (time < opensAt || time > closesAt) {
      return { time, available: false }
    }

    // Block past times on today.
    if (date === todayISO && time <= nowTime) {
      return { time, available: false }
    }

    // Block if adding this party exceeds capacity.
    const booked = bookedBySlot[time] ?? 0
    const available = booked + partySize <= TOTAL_CAPACITY

    return { time, available }
  })
}

export async function updateReservationStatus(
  id: string,
  status: ReservationRow["status"],
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("reservations")
    .update({ status })
    .eq("id", id)

  if (error) {
    console.error("[reservations] updateReservationStatus error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/admin/reservations")
  revalidatePath("/admin")
  return {}
}
