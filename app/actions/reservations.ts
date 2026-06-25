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
