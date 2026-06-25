"use server"

import { createClient } from "@/lib/supabase/server"
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

export async function createReservation(payload: {
  guestName: string
  partySize: number
  date: string
  time: string
  phone: string
  notes?: string
}): Promise<{ confCode: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      guest_name: payload.guestName,
      party_size: payload.partySize,
      date: payload.date,
      time: payload.time,
      phone: payload.phone,
      notes: payload.notes ?? null,
    })
    .select("conf_code")
    .single()

  if (error) {
    console.error("[v0] createReservation error:", error.message)
    return { confCode: "", error: error.message }
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
    console.error("[v0] getReservationsForDate error:", error.message)
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
    console.error("[v0] updateReservationStatus error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/admin/reservations")
  revalidatePath("/admin")
  return {}
}
