"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { revalidatePath } from "next/cache"

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

export async function createReservation(payload: {
  guestName: string
  partySize: number
  date: string
  time: string
  phone: string
  notes?: string
}): Promise<{ confCode: string; error?: string }> {
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
 *  - It's in the past (today only)
 *  - Adding `partySize` covers would exceed the restaurant's total seating capacity
 */
export async function getAvailableSlots(
  date: string,
  partySize: number,
): Promise<SlotAvailability[]> {
  const TIME_SLOTS = [
    "17:00", "17:30", "18:00", "18:30", "19:00",
    "19:30", "20:00", "20:30", "21:00", "21:30",
  ]
  // Total covers the restaurant can seat at once (sum of all table seats).
  const TOTAL_CAPACITY = 38 // 2+2+4+4+6+4+2+8+4+2

  const supabase = createAnonClient()

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

  // "Now" in local restaurant time — block past slots on today's date.
  const todayISO = new Date().toISOString().slice(0, 10)
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()

  return TIME_SLOTS.map((time) => {
    // Block past times on today.
    if (date === todayISO) {
      const [h, m] = time.split(":").map(Number)
      if (h * 60 + m <= nowMinutes) return { time, available: false }
    }
    // Block if adding this party exceeds capacity.
    const booked = bookedBySlot[time] ?? 0
    return { time, available: booked + partySize <= TOTAL_CAPACITY }
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
