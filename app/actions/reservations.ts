"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAnonClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { revalidatePath } from "next/cache"
import {
  getOperatingWindowForDate,
  isDateBlocked,
} from "@/app/actions/availability"
import {
  getTodayInRestaurantTZ,
  getNowTimeInRestaurantTZ,
} from "@/lib/timezone"
import { validateReservationPayload } from "@/lib/reservations/validation"
import {
  bookableTimesForDay,
  clampSafetyBufferMinutes,
  clampSlotIntervalMinutes,
  DEFAULT_SAFETY_BUFFER_MINUTES,
  formatSegmentsSummary,
  isTimeWithinSegments,
  nextBookableTime,
  normalizeTime,
} from "@/lib/reservations/operating-hours"
import {
  clampExpectedMinutes,
  DEFAULT_EXPECTED_MINUTES,
} from "@/lib/floor/table-use"
import type { TableStatus } from "@/lib/data"
import {
  ACTIVE_RESERVATION_STATUSES,
  canSeatPartyOnTables,
  occupyingWindowMinutes,
  occupyingWindowsOverlap,
  planAutoAssignments,
  type AssignableReservation,
  type AssignableTable,
  type PlannedAssignment,
} from "@/lib/reservations/auto-assign"
import {
  expireDueMerges,
  getActiveMerges,
  getTables,
  syncTableGroupStatus,
  type PersistedMerge,
  type PersistedTable,
} from "@/app/actions/operations"
import { toAssignableTables, type TableMergeRef } from "@/lib/floor/floor-units"

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
  const validationError = validateReservationPayload(
    payload,
    getTodayInRestaurantTZ(),
  )
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

  if (!isTimeWithinSegments(payload.time, operatingWindow.segments)) {
    const summary = formatSegmentsSummary(operatingWindow.segments)
    return {
      confCode: "",
      error: summary
        ? `Reservations are only available during ${summary}.`
        : "This time is outside operating hours.",
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

    // Note: no `.select()` after insert. The `public` role only has an
    // INSERT policy on reservations (no SELECT — guest PII must never be
    // readable by anonymous clients), and PostgREST's `select()` after a
    // write requires SELECT privileges to return the row, which RLS would
    // reject with 42501. The confirmation code is generated client-side
    // before the insert, so there's nothing to read back.
    const { error } = await supabase.from("reservations").insert({
      guest_name: payload.guestName.trim(),
      party_size: payload.partySize,
      date: payload.date,
      time: payload.time,
      phone: payload.phone.trim(),
      notes: payload.notes?.trim() || null,
      conf_code: confCode,
    })

    if (!error) {
      revalidatePath("/admin/reservations")
      revalidatePath("/admin")
      return { confCode }
    }

    console.error(
      "[reservations] createReservation error:",
      error.message,
      error.code,
      error.details,
    )

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

    return {
      confCode: "",
      error: "Could not save your reservation. Please try again.",
    }
  }

  return {
    confCode: "",
    error: "Could not save your reservation. Please try again.",
  }
}

/**
 * Admin-privileged fetch of all reservations for a given date (YYYY-MM-DD).
 * Uses the service-role client to bypass RLS — safe only in server actions,
 * and only after confirming the caller has an authenticated staff session.
 * Fail-closed (STAFF-LIST): auth or query failure returns
 * `{ reservations: [], error }` with a stable message (`Unauthorized.` /
 * `Could not load reservations.`), never a successful empty array. Success
 * with no rows is `{ reservations: [] }` and no `error` field.
 * The `date` column is a native DATE type so simple equality is correct; no
 * timezone boundary arithmetic is needed for this schema.
 */
export async function getReservationsByDate(
  date: string,
): Promise<{ reservations: ReservationRow[]; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { reservations: [], error: "Unauthorized." }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .order("time", { ascending: true })

  if (error) {
    console.error("[reservations] getReservationsByDate error:", error.message)
    return { reservations: [], error: "Could not load reservations." }
  }

  return { reservations: (data ?? []) as ReservationRow[] }
}

export type ReservationTableOption = {
  id: string
  label: string
  seats: number
  status: "available" | "seated" | "reserved" | "cleaning" | "out_of_service"
  groupLabel?: string
}

export async function getReservationTables(): Promise<
  ReservationTableOption[]
> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const [tables, merges] = await Promise.all([getTables(), getActiveMerges()])
  return toAssignableTables(tables, merges).map((table) => {
    const merge = merges.find((row) => row.tableIds.includes(table.id))
    return {
      id: table.id,
      label: table.label,
      seats: table.seats,
      status: table.status,
      groupLabel: merge?.label,
    }
  })
}

const RESERVATION_TRANSITIONS: Record<
  ReservationRow["status"],
  ReservationRow["status"][]
> = {
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
  const { data: current, error: readError } = await db
    .from("reservations")
    .select("status, table_label")
    .eq("id", reservationId)
    .single()
  if (readError || !current) return { error: "Reservation not found." }
  if (
    !RESERVATION_TRANSITIONS[
      current.status as ReservationRow["status"]
    ].includes(nextStatus)
  ) {
    return {
      error: `Cannot change ${current.status.replace("_", " ")} to ${nextStatus.replace("_", " ")}.`,
    }
  }

  const patch: Record<string, unknown> = { status: nextStatus }
  if (
    nextStatus === "completed" ||
    nextStatus === "cancelled" ||
    nextStatus === "no_show"
  )
    patch.table_label = null
  const { error } = await db
    .from("reservations")
    .update(patch)
    .eq("id", reservationId)
  if (error) return { error: "Could not update reservation status." }
  await db.from("status_events").insert({
    entity_type: "reservation",
    entity_id: reservationId,
    from_status: current.status,
    to_status: nextStatus,
  })
  if (nextStatus === "seated" && current.table_label) {
    await syncTableGroupStatus(current.table_label, "seated")
  }
  if (current.table_label && patch.table_label === null) {
    await syncTableGroupStatus(current.table_label, "available")
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
  if (reservationError || !reservation)
    return { error: "Reservation not found." }

  const { data: latest, error: eventError } = await db
    .from("status_events")
    .select("id, from_status, to_status")
    .eq("entity_type", "reservation")
    .eq("entity_id", reservationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (eventError || !latest)
    return { error: "There is no status change to undo." }
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

  const { data: table, error: tableError } = label
    ? await db
        .from("tables")
        .select("label, seats")
        .eq("label", label)
        .maybeSingle()
    : { data: null, error: null }
  if (label && (tableError || !table))
    return { error: "That table is no longer available." }

  const { data: reservation, error: reservationError } = await db
    .from("reservations")
    .select("id, date, time, status, table_label, party_size")
    .eq("id", reservationId)
    .single()
  if (reservationError || !reservation)
    return { error: "Reservation not found." }
  if (["completed", "cancelled", "no_show"].includes(reservation.status))
    return { error: "Closed reservations cannot be assigned." }
  if (table && table.seats < reservation.party_size)
    return { error: "That table does not have enough seats for this party." }
  if (label && label !== reservation.table_label) {
    const { data: settings } = await db
      .from("restaurant_settings")
      .select("occupancy_duration_minutes, safety_buffer_minutes")
      .eq("id", 1)
      .maybeSingle()
    const occupancyDurationMinutes = occupancyDurationFromSettings(
      settings?.occupancy_duration_minutes,
    )
    const safetyBufferMinutes = clampSafetyBufferMinutes(
      settings?.safety_buffer_minutes ?? DEFAULT_SAFETY_BUFFER_MINUTES,
    )
    const window = occupyingWindowMinutes(
      reservation.time,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )
    if (window) {
      // minimality: keep select/eq/in/order so auto-assign-action mocks still
      // work; filter table_label in memory.
      const { data: occupying, error: occupyingError } = await db
        .from("reservations")
        .select("id, time, table_label")
        .eq("date", reservation.date)
        .in("status", ACTIVE_RESERVATION_STATUSES)
        .order("time", { ascending: true })
      if (occupyingError) {
        return { error: "Could not update the table assignment." }
      }
      const conflict = (occupying ?? []).some((row) => {
        if (row.id === reservationId || row.table_label !== label) return false
        const other = occupyingWindowMinutes(
          row.time,
          occupancyDurationMinutes,
          safetyBufferMinutes,
        )
        return other !== null && occupyingWindowsOverlap(window, other)
      })
      if (conflict) {
        return {
          error: "That table is already reserved for an overlapping time.",
        }
      }
    }
  }
  if (label && reservation.table_label && reservation.table_label !== label) {
    await syncTableGroupStatus(reservation.table_label, "available")
  }

  const { error } = await db
    .from("reservations")
    .update({ table_label: label })
    .eq("id", reservationId)
  if (error) {
    console.error("[reservations] assignReservationTable error:", error.message)
    return { error: "Could not update the table assignment." }
  }
  if (label) {
    const tableStatus = reservation.status === "seated" ? "seated" : "reserved"
    await syncTableGroupStatus(label, tableStatus)
  } else if (reservation.table_label) {
    await syncTableGroupStatus(reservation.table_label, "available")
  }
  await db.from("status_events").insert({
    entity_type: "reservation",
    entity_id: reservationId,
    from_status: reservation.table_label,
    to_status: label ?? "unassigned",
    reason: "table assignment",
  })

  revalidatePath("/admin/reservations")
  revalidatePath("/admin/floor")
  return {}
}

export type FloorSnapshot = {
  tables: PersistedTable[]
  reservations: ReservationRow[]
  assigned: PlannedAssignment[]
  merges: PersistedMerge[]
}

/**
 * Assigns due, unassigned confirmed reservations to the smallest available
 * table that fits. Staff-only. Safe to call on every floor-plan refresh.
 */
export async function autoAssignDueReservations(): Promise<{
  assigned: PlannedAssignment[]
  error?: string
}> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return { assigned: [], error: "Unauthorized." }

  const now = {
    date: getTodayInRestaurantTZ(),
    time: getNowTimeInRestaurantTZ(),
  }
  const db = createServiceClient()

  const { data: reservations, error: reservationError } = await db
    .from("reservations")
    .select("*")
    .eq("date", now.date)
    .in("status", ACTIVE_RESERVATION_STATUSES)
    .order("time", { ascending: true })

  if (reservationError) {
    console.error(
      "[reservations] autoAssignDueReservations:",
      reservationError.message,
    )
    return { assigned: [], error: "Could not load reservations." }
  }

  const { data: tables, error: tableError } = await db
    .from("tables")
    .select("id, label, seats, status")
    .order("label", { ascending: true })

  if (tableError) {
    console.error(
      "[reservations] autoAssignDueReservations tables:",
      tableError.message,
    )
    return { assigned: [], error: "Could not load tables." }
  }

  const merges = await getActiveMerges()
  const assignable = toAssignableTables(tables ?? [], merges)
  const planned = planAutoAssignments(reservations ?? [], assignable, now)
  const assigned: PlannedAssignment[] = []
  for (const plan of planned) {
    const result = await assignReservationTable(
      plan.reservationId,
      plan.tableLabel,
    )
    if (!result.error) assigned.push(plan)
  }

  if (assigned.length > 0) {
    revalidatePath("/admin/reservations")
    revalidatePath("/admin/floor")
    revalidatePath("/admin")
  }
  return { assigned }
}

/** Live floor payload: auto-assign due reservations, then return tables + today's book. */
export async function getFloorSnapshot(date: string): Promise<FloorSnapshot> {
  const staffUser = await requireStaffUser()
  if (!staffUser)
    return { tables: [], reservations: [], assigned: [], merges: [] }

  await expireDueMerges()
  const { assigned } = await autoAssignDueReservations()
  const [tables, { reservations }, merges] = await Promise.all([
    getTables(),
    getReservationsByDate(date),
    getActiveMerges(),
  ])
  return { tables, reservations, assigned, merges }
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

function occupancyDurationFromSettings(
  minutes: number | null | undefined,
): number {
  return clampExpectedMinutes(minutes ?? DEFAULT_EXPECTED_MINUTES)
}

/**
 * Guest-readable occupancy duration for the until-badge (BW-2).
 * Named apart from the staff-gated `getOccupancyDurationMinutes` in branding
 * so a wrong import cannot silently pin the badge at the unauthenticated default.
 */
export async function getGuestOccupancyDurationMinutes(): Promise<number> {
  const db = createServiceClient()
  const { data, error } = await db
    .from("restaurant_settings")
    .select("occupancy_duration_minutes")
    .eq("id", 1)
    .maybeSingle()
  if (error) {
    console.error(
      "[reservations] getGuestOccupancyDurationMinutes:",
      error.message,
    )
  }
  return occupancyDurationFromSettings(data?.occupancy_duration_minutes)
}

/**
 * Returns which times from `bookableTimesForDay` are still bookable for a
 * given date + party size. Slot spacing is
 * `restaurant_settings.slot_interval_minutes`, clamped to 15 / 30 / 60
 * (BW-5 — one generator). Occupancy (BW-9) is applied to those generated
 * times: the first free slot after a hold is the first generated instant
 * at or after exclusive-end (20:45 on a 30-minute grid is 21:00).
 * A slot is unavailable when:
 *  - The date is blocked (holiday, special closure)
 *  - The date falls outside operating hours
 *  - It's in the past (today only)
 *  - Occupying covers on the half-open window
 *    `[start, nextBookableTime(start))` plus `partySize` exceed total seats
 *  - Table-fit fails (BW-12): occupying overlapping parties plus `partySize`
 *    cannot be assigned to distinct units, even when covers still fit
 */
export async function getAvailableSlots(
  date: string,
  partySize: number,
): Promise<SlotAvailability[]> {
  const dateIsBlocked = await isDateBlocked(date)
  const operatingWindow = await getOperatingWindowForDate(date)

  if (dateIsBlocked || !operatingWindow || operatingWindow.is_closed) {
    return []
  }

  const db = createServiceClient()
  const { data: settings, error: settingsError } = await db
    .from("restaurant_settings")
    .select(
      "slot_interval_minutes, occupancy_duration_minutes, safety_buffer_minutes",
    )
    .eq("id", 1)
    .maybeSingle()
  if (settingsError) {
    console.error(
      "[reservations] getAvailableSlots settings error:",
      settingsError.message,
    )
  }
  const stepMinutes = clampSlotIntervalMinutes(
    settings?.slot_interval_minutes ?? 30,
  )
  const occupancyDurationMinutes = occupancyDurationFromSettings(
    settings?.occupancy_duration_minutes,
  )
  const safetyBufferMinutes = clampSafetyBufferMinutes(
    settings?.safety_buffer_minutes ?? 15,
  )

  const generatedSlots = bookableTimesForDay(operatingWindow, stepMinutes)
  if (generatedSlots.length === 0) {
    return []
  }

  // Inventory + merges are independent of each other; staff-gated
  // `getActiveMerges` returns [] without a session, so load with service-role.
  const [tableResult, mergeResult, memberResult] = await Promise.all([
    db.from("tables").select("id, label, seats, status"),
    db.from("table_merges").select("id, expected_minutes, expires_at, status"),
    db.from("table_merge_members").select("merge_id, table_id"),
  ])
  const { data: tableRows, error: tableError } = tableResult
  const { data: mergeRows, error: mergeError } = mergeResult
  const { data: memberRows, error: memberError } = memberResult
  if (tableError) {
    console.error(
      "[reservations] getAvailableSlots table capacity error:",
      tableError.message,
    )
  }
  if (mergeError) {
    console.error(
      "[reservations] getAvailableSlots merges error:",
      mergeError.message,
    )
  }
  if (memberError) {
    console.error(
      "[reservations] getAvailableSlots merge members error:",
      memberError.message,
    )
  }
  const totalCapacity = (tableRows ?? []).reduce(
    (sum, row) => sum + (row.seats ?? 0),
    0,
  )
  // Keep unlabeled capacity stubs (e.g. `{ seats: 40 }`) as one unit; do not
  // drop them. Missing label/status/id stay valid when `seats >= partySize`.
  const assignableTables: AssignableTable[] = (tableRows ?? []).map((row) => {
    const table: AssignableTable = {
      label: row.label != null ? String(row.label) : "",
      seats: Number(row.seats ?? 0),
      status: row.status ? (row.status as TableStatus) : "available",
    }
    if (row.id != null && String(row.id) !== "") table.id = String(row.id)
    return table
  })

  const merges: TableMergeRef[] = (
    mergeError || memberError ? [] : (mergeRows ?? [])
  ).flatMap((merge) => {
    const tableIds = (memberRows ?? [])
      .filter((row) => row.merge_id === merge.id)
      .map((row) => String(row.table_id))
    if (tableIds.length < 2) return []
    return [
      {
        id: String(merge.id),
        expectedMinutes: clampExpectedMinutes(
          Number(merge.expected_minutes ?? DEFAULT_EXPECTED_MINUTES),
        ),
        expiresAt: String(merge.expires_at ?? ""),
        status: merge.status ? (merge.status as TableStatus) : "available",
        tableIds,
      },
    ]
  })

  // Reservations carry PII (guest name, phone, notes) and are not publicly
  // readable — RLS only grants anon INSERT, not SELECT. This preview only
  // needs an aggregated cover count per slot (no PII ever reaches the
  // client), so it's computed server-side with the service-role client and
  // reduced to booleans below. This mirrors the same total-seats capacity
  // rule enforced atomically by the `validate_reservation_availability`
  // database trigger on insert, keeping both checks in sync.
  const { data, error } = await db
    .from("reservations")
    .select("id, time, party_size, status, table_label, created_at")
    .eq("date", date)
    .in("status", ACTIVE_RESERVATION_STATUSES)

  if (error) {
    console.error("[reservations] getAvailableSlots error:", error.message)
    // Fail open so the widget is never completely blocked.
    return generatedSlots.map((time) => ({ time, available: true }))
  }

  // Sum occupying covers on the half-open occupancy window
  // [start, nextBookableTime(start)), not same-slot-only.
  // Postgres TIME serializes as HH:MM:SS; generated slots are HH:MM.
  // Compare exclusive-end to generatedSlots only (BW-5) — do not emit a
  // slot at the free instant unless bookableTimesForDay already did.
  const bookedBySlot: Record<string, number> = {}
  const occupying: AssignableReservation[] = []
  for (const row of data ?? []) {
    if (!ACTIVE_RESERVATION_STATUSES.includes(row.status)) continue
    const start = normalizeTime(row.time)
    const exclusiveEnd = nextBookableTime(
      start,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )
    for (const generated of generatedSlots) {
      if (generated >= start && generated < exclusiveEnd) {
        bookedBySlot[generated] =
          (bookedBySlot[generated] ?? 0) + row.party_size
      }
    }
    if (row.id == null) continue
    occupying.push({
      id: String(row.id),
      party_size: Number(row.party_size),
      date,
      time: start,
      status: row.status,
      table_label: row.table_label ? String(row.table_label) : null,
      created_at: typeof row.created_at === "string" ? row.created_at : "",
    })
  }

  // "Now" in local restaurant timezone — block past slots on today's date.
  const todayISO = getTodayInRestaurantTZ()
  const nowTime = getNowTimeInRestaurantTZ()

  return generatedSlots.map((time) => {
    // Slots are generated from segments; keep a defensive in-segment check.
    if (!isTimeWithinSegments(time, operatingWindow.segments)) {
      return { time, available: false }
    }

    // Block past times on today.
    if (date === todayISO && time <= nowTime) {
      return { time, available: false }
    }

    const booked = bookedBySlot[time] ?? 0
    const coversFit = booked + partySize <= totalCapacity
    const tableFit = canSeatPartyOnTables(
      assignableTables,
      partySize,
      occupying,
      time,
      merges,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )

    return { time, available: coversFit && tableFit }
  })
}
