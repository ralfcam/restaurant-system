"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { revalidatePath } from "next/cache"
import { getOperatingWindowForDate, isDateBlocked } from "@/app/actions/availability"
import { getTodayInRestaurantTZ, getNowTimeInRestaurantTZ } from "@/lib/timezone"
import { validateReservationPayload } from "@/lib/reservations/validation"

export type ReservationRow = {
  id: string
  guest_name: string
  party_size: number
  date: string
  time: string
  status: "confirmed" | "seated" | "completed" | "cancelled" | "no_show"
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
  const validationError = validateReservationPayload(payload, getTodayInRestaurantTZ())
  if (validationError) {
    return { confCode: "", error: validationError }
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

  // conf_code is a random 4-digit suffix guarded by a DB unique constraint —
  // collisions are rare but possible, so retry with a fresh code on a
  // uniqueness violation (Postgres code 23505) instead of failing the whole
  // booking. The capacity/hours/blocked-date trigger check (P0001) is not
  // retried since re-running it would just fail again.
  const MAX_CONF_CODE_ATTEMPTS = 5
  for (let attempt = 1; attempt <= MAX_CONF_CODE_ATTEMPTS; attempt++) {
    const confCode = generateConfCode()

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        guest_name: payload.guestName.trim(),
        party_size: payload.partySize,
        date: payload.date,
        time: payload.time,
        phone: payload.phone.trim(),
        notes: payload.notes?.trim() || null,
        conf_code: confCode,
      })
      .select("conf_code")
      .single()

    if (!error) {
      revalidatePath("/admin/reservations")
      revalidatePath("/admin")
      return { confCode: data.conf_code }
    }

    console.error("[reservations] createReservation error:", error.message, error.code, error.details)

    if (error.code === "23505") {
      // Confirmation-code collision — retry with a new random code.
      continue
    }

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

  return { confCode: "", error: "Could not save your reservation. Please try again." }
}

/**
 * Admin-privileged fetch of all reservations for a given date (YYYY-MM-DD).
 * Uses the service-role client to bypass RLS — safe only in server actions,
 * and only after confirming the caller has an authenticated staff session.
 * The `date` column is a native DATE type so simple equality is correct; no
 * timezone boundary arithmetic is needed for this schema.
 */
export async function getReservationsByDate(
  date: string,
): Promise<ReservationRow[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

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

export type ReservationTableOption = {
  id: string
  label: string
  seats: number
  status: "available" | "seated" | "reserved" | "cleaning" | "out_of_service"
}

export async function getReservationTables(): Promise<ReservationTableOption[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const { data, error } = await createServiceClient()
    .from("tables")
    .select("id, label, seats, status")
    .order("label", { ascending: true })

  if (error) {
    console.error("[reservations] getReservationTables error:", error.message)
    return []
  }

  return (data ?? []) as ReservationTableOption[]
}

const RESERVATION_TRANSITIONS: Record<ReservationRow["status"], ReservationRow["status"][]> = {
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed"],
  completed: [],
  cancelled: [],
  no_show: [],
}

export async function transitionReservationStatus(
  reservationId: string,
  nextStatus: ReservationRow["status"],
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const db = createServiceClient()
  const { data: current, error: readError } = await db.from("reservations").select("status, table_label").eq("id", reservationId).single()
  if (readError || !current) return { error: "Reservation not found." }
  if (!RESERVATION_TRANSITIONS[current.status as ReservationRow["status"]].includes(nextStatus)) {
    return { error: `Cannot change ${current.status.replace("_", " ")} to ${nextStatus.replace("_", " ")}.` }
  }

  const patch: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === "completed" || nextStatus === "cancelled" || nextStatus === "no_show") patch.table_label = null
  const { error } = await db.from("reservations").update(patch).eq("id", reservationId)
  if (error) return { error: "Could not update reservation status." }
  await db.from("status_events").insert({ entity_type: "reservation", entity_id: reservationId, from_status: current.status, to_status: nextStatus })
  if (current.table_label && patch.table_label === null) {
    await db.from("tables").update({ status: "available", updated_at: new Date().toISOString() }).eq("label", current.table_label).eq("status", "reserved")
  }
  revalidatePath("/admin/reservations")
  revalidatePath("/admin/floor")
  revalidatePath("/admin")
  return {}
}

export async function undoReservationStatus(
  reservationId: string,
): Promise<{ error?: string; restoredStatus?: ReservationRow["status"] }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const db = createServiceClient()
  const { data: reservation, error: reservationError } = await db
    .from("reservations")
    .select("status, table_label")
    .eq("id", reservationId)
    .single()
  if (reservationError || !reservation) return { error: "Reservation not found." }

  const { data: latest, error: eventError } = await db
    .from("status_events")
    .select("id, from_status, to_status")
    .eq("entity_type", "reservation")
    .eq("entity_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (eventError || !latest) return { error: "There is no status change to undo." }
  if (latest.to_status !== reservation.status || !latest.from_status) {
    return { error: "This status change is no longer the latest change." }
  }

  const restoredStatus = latest.from_status as ReservationRow["status"]
  const { error: updateError } = await db
    .from("reservations")
    .update({ status: restoredStatus })
    .eq("id", reservationId)
    .eq("status", reservation.status)
  if (updateError) return { error: "Could not undo the status change." }

  await db.from("status_events").insert({
    entity_type: "reservation",
    entity_id: reservationId,
    from_status: reservation.status,
    to_status: restoredStatus,
    reason: `undo:${latest.id}`,
  })
  revalidatePath("/admin/reservations")
  revalidatePath("/admin/floor")
  revalidatePath("/admin")
  return { restoredStatus }
}

export async function assignReservationTable(
  reservationId: string,
  tableLabel: string | null,
): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { error: "Unauthorized." }

  const db = createServiceClient()
  const label = tableLabel?.trim() || null

  if (label) {
    const { data: table, error: tableError } = await db
      .from("tables")
      .select("label")
      .eq("label", label)
      .maybeSingle()

    if (tableError || !table) return { error: "That table is no longer available." }
  }

  const { data: reservation, error: reservationError } = await db.from("reservations").select("status, table_label").eq("id", reservationId).single()
  if (reservationError || !reservation) return { error: "Reservation not found." }
  if (["completed", "cancelled", "no_show"].includes(reservation.status)) return { error: "Closed reservations cannot be assigned." }
  if (label && reservation.table_label && reservation.table_label !== label) {
    await db.from("tables").update({ status: "available", updated_at: new Date().toISOString() }).eq("label", reservation.table_label).eq("status", "reserved")
  }

  const { error } = await db.from("reservations").update({ table_label: label }).eq("id", reservationId)
  if (error) {
    console.error("[reservations] assignReservationTable error:", error.message)
    return { error: "Could not update the table assignment." }
  }
  if (label) await db.from("tables").update({ status: "reserved", updated_at: new Date().toISOString() }).eq("label", label).in("status", ["available", "reserved"])
  await db.from("status_events").insert({ entity_type: "reservation", entity_id: reservationId, from_status: reservation.table_label, to_status: label ?? "unassigned", reason: "table assignment" })

  revalidatePath("/admin/reservations")
  revalidatePath("/admin/floor")
  return {}
}

/** Fetch reservations across a date range (or all if no bounds given). */
export async function getReservations(opts?: {
  from?: string
  to?: string
}): Promise<ReservationRow[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

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

  // Reservations carry PII (guest name, phone, notes) and are not publicly
  // readable — RLS only grants anon INSERT, not SELECT. This preview only
  // needs an aggregated cover count per slot (no PII ever reaches the
  // client), so it's computed server-side with the service-role client and
  // reduced to booleans below. This mirrors the same total-seats capacity
  // rule enforced atomically by the `validate_reservation_availability`
  // database trigger on insert, keeping both checks in sync.
  const db = createServiceClient()

  const { data: tableRows, error: tableError } = await db.from("tables").select("seats")
  if (tableError) {
    console.error("[reservations] getAvailableSlots table capacity error:", tableError.message)
  }
  const totalCapacity = (tableRows ?? []).reduce((sum, row) => sum + (row.seats ?? 0), 0)

  // Fetch all confirmed/seated reservations for this date.
  const { data, error } = await db
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
    const available = booked + partySize <= totalCapacity

    return { time, available }
  })
}
