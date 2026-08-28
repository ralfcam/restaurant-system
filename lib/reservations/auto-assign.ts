/**
 * Pure table auto-assignment for the live floor plan.
 *
 * A confirmed reservation is assigned the smallest available table that fits
 * the party once restaurant-local now is at or after booked time minus the
 * restaurant default expected turn (90 minutes). A label is taken only when
 * another occupying window on the same date overlaps (BW-9; defaults 90+15).
 * Helpers stay free of I/O so they can be unit-tested without mocking
 * Supabase or the clock.
 */

import type { ReservationStatus, TableStatus } from "@/lib/data"
import { toAssignableTables, type TableMergeRef } from "@/lib/floor/floor-units"
import {
  DEFAULT_EXPECTED_MINUTES,
  labelsInSameMerge,
} from "@/lib/floor/table-use"
import {
  DEFAULT_SAFETY_BUFFER_MINUTES,
  nextBookableTime,
} from "@/lib/reservations/operating-hours"

/** Booked time minus expected turn; aliases {@link DEFAULT_EXPECTED_MINUTES} (90). */
export const TABLE_ASSIGNMENT_LEAD_MINUTES = DEFAULT_EXPECTED_MINUTES

/** Confirmed and seated occupy a table or covers; completed, cancelled, and no_show do not. */
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "confirmed",
  "seated",
]

export type AssignableReservation = {
  id: string
  party_size: number
  date: string
  time: string
  status: ReservationStatus
  table_label: string | null
  created_at?: string
}

/** Assignment inventory only — persisted grid (`id`/`x`/`y`) is required on FloorTableView. */
export type AssignableTable = {
  id?: string
  label: string
  seats: number
  status: TableStatus
}

export type PlannedAssignment = {
  reservationId: string
  tableLabel: string
}

export type FloorReservationOverlay = {
  id: string
  guestName: string
  partySize: number
  time: string
  status: ReservationStatus
}

export type FloorTableView<T extends AssignableTable = AssignableTable> = T & {
  id: string
  x: number
  y: number
  displayStatus: TableStatus
  reservation: FloorReservationOverlay | null
}

type OverlayReservationInput = {
  id: string
  guest_name: string
  party_size: number
  time: string
  status: ReservationStatus
  table_label: string | null
}

const TIME_RE = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/

/** Normalize a stored time (`HH:MM` or `HH:MM:SS`) to minutes past midnight. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_RE.exec(time.trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23) return null
  return hours * 60 + minutes
}

type OccupyingWindow = { startMin: number; endMin: number }
type OccupyingClaim = OccupyingWindow & { label: string }

/**
 * BW-9 occupying window on one reservation date: half-open
 * `[start, nextBookableTime(start))`. `nextBookableTime` wraps past midnight;
 * occupancy does not span the next calendar date, so a wrapped end is 24:00.
 */
export function occupyingWindowMinutes(
  start: string,
  occupancyDurationMinutes: number,
  safetyBufferMinutes: number,
): OccupyingWindow | null {
  const startMin = timeToMinutes(start)
  if (startMin === null) return null
  const endMin = timeToMinutes(
    nextBookableTime(start, occupancyDurationMinutes, safetyBufferMinutes),
  )
  if (endMin === null) return null
  return { startMin, endMin: endMin > startMin ? endMin : 24 * 60 }
}

export function occupyingWindowsOverlap(
  a: OccupyingWindow,
  b: OccupyingWindow,
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin
}

/**
 * True when restaurant-local now is at or after booked time minus expected
 * turn (default 90; {@link TABLE_ASSIGNMENT_LEAD_MINUTES}).
 */
export function isReservationDueForAssignment(
  reservation: Pick<
    AssignableReservation,
    "date" | "time" | "status" | "table_label"
  >,
  now: { date: string; time: string },
  leadMinutes: number = TABLE_ASSIGNMENT_LEAD_MINUTES,
): boolean {
  if (reservation.table_label) return false
  if (reservation.status !== "confirmed") return false
  if (reservation.date !== now.date) return false

  const booked = timeToMinutes(reservation.time)
  const current = timeToMinutes(now.time)
  if (booked === null || current === null) return false

  return current >= booked - leadMinutes
}

/**
 * Smallest seats-then-label fit. Ignores live `status` — occupancy is claims
 * and BW-9 windows, not floor status (BW-12).
 */
function pickBestFitTable(
  tables: AssignableTable[],
  partySize: number,
  takenLabels: ReadonlySet<string>,
): AssignableTable | undefined {
  return tables
    .filter(
      (table) => table.seats >= partySize && !takenLabels.has(table.label),
    )
    .sort((a, b) => {
      if (a.seats !== b.seats) return a.seats - b.seats
      return a.label.localeCompare(b.label, undefined, { numeric: true })
    })[0]
}

export function selectBestTable(
  tables: AssignableTable[],
  partySize: number,
  takenLabels: ReadonlySet<string>,
): AssignableTable | null {
  return (
    pickBestFitTable(
      tables.filter((table) => table.status === "available"),
      partySize,
      takenLabels,
    ) ?? null
  )
}

/**
 * True when `partySize` plus occupying `confirmed`/`seated` whose BW-9 window
 * overlaps `candidateTime` can be assigned to distinct units (BW-12 / FP-3).
 * Assigned `table_label` is a hard claim; unassigned occupying still consume
 * via greedy assign. Does not invent merges. After
 * {@link toAssignableTables}, drops only `out_of_service`; live `seated` /
 * `reserved` / `cleaning` stay eligible (occupancy is claims + BW-9, not
 * floor chrome). Optional `merges` (default `[]`) collapse existing staff
 * merges; an empty list leaves physical tables unmerged.
 * Omit `candidateTime` to keep the unit-fit check only.
 * Occupancy window defaults match {@link planAutoAssignments} (BW-9 90+15).
 */
export function canSeatPartyOnTables(
  tables: AssignableTable[],
  partySize: number,
  occupying: AssignableReservation[],
  candidateTime?: string,
  merges: TableMergeRef[] = [],
  occupancyDurationMinutes: number = DEFAULT_EXPECTED_MINUTES,
  safetyBufferMinutes: number = DEFAULT_SAFETY_BUFFER_MINUTES,
): boolean {
  const units = toAssignableTables(tables, merges).filter(
    (table) => table.status !== "out_of_service",
  )
  if (candidateTime === undefined) {
    return units.some((table) => table.seats >= partySize)
  }

  const windowOf = (time: string) =>
    occupyingWindowMinutes(time, occupancyDurationMinutes, safetyBufferMinutes)

  const candidateWindow = windowOf(candidateTime)
  if (!candidateWindow) return false

  const overlapping = occupying.filter((reservation) => {
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) return false
    const window = windowOf(reservation.time)
    return window !== null && occupyingWindowsOverlap(window, candidateWindow)
  })

  const taken = new Set(
    overlapping.flatMap((reservation) =>
      reservation.table_label ? [reservation.table_label] : [],
    ),
  )

  const toPlace: Pick<AssignableReservation, "party_size" | "created_at">[] = [
    ...overlapping.filter((reservation) => !reservation.table_label),
    { party_size: partySize },
  ]
  toPlace.sort((a, b) => {
    if (a.party_size !== b.party_size) return b.party_size - a.party_size
    if (!a.created_at && b.created_at) return 1
    if (a.created_at && !b.created_at) return -1
    return (a.created_at ?? "").localeCompare(b.created_at ?? "")
  })

  for (const party of toPlace) {
    const table = pickBestFitTable(units, party.party_size, taken)
    if (!table) return false
    taken.add(table.label)
  }
  return true
}

function compareDueReservations(
  a: AssignableReservation,
  b: AssignableReservation,
): number {
  const timeA = timeToMinutes(a.time) ?? 0
  const timeB = timeToMinutes(b.time) ?? 0
  if (timeA !== timeB) return timeA - timeB
  if (a.party_size !== b.party_size) return b.party_size - a.party_size
  return (a.created_at ?? "").localeCompare(b.created_at ?? "")
}

/**
 * Plan assignments for every due, unassigned reservation against the current
 * floor. A label is taken only when an occupying claim on the same date
 * overlaps this reservation's BW-9 window (defaults 90+15). Does not mutate
 * inputs.
 */
export function planAutoAssignments(
  reservations: AssignableReservation[],
  tables: AssignableTable[],
  now: { date: string; time: string },
  leadMinutes: number = TABLE_ASSIGNMENT_LEAD_MINUTES,
  occupancyDurationMinutes: number = DEFAULT_EXPECTED_MINUTES,
  safetyBufferMinutes: number = DEFAULT_SAFETY_BUFFER_MINUTES,
): PlannedAssignment[] {
  const windowOf = (time: string) =>
    occupyingWindowMinutes(time, occupancyDurationMinutes, safetyBufferMinutes)

  const claims: OccupyingClaim[] = []
  for (const reservation of reservations) {
    if (
      !reservation.table_label ||
      reservation.date !== now.date ||
      !ACTIVE_RESERVATION_STATUSES.includes(reservation.status)
    ) {
      continue
    }
    const window = windowOf(reservation.time)
    if (window) claims.push({ label: reservation.table_label, ...window })
  }

  const due = reservations
    .filter((reservation) =>
      isReservationDueForAssignment(reservation, now, leadMinutes),
    )
    .sort(compareDueReservations)

  const planned: PlannedAssignment[] = []
  for (const reservation of due) {
    const window = windowOf(reservation.time)
    if (!window) continue
    const taken = new Set(
      claims
        .filter((claim) => occupyingWindowsOverlap(claim, window))
        .map((claim) => claim.label),
    )
    const table = selectBestTable(tables, reservation.party_size, taken)
    if (!table) continue
    claims.push({ label: table.label, ...window })
    planned.push({ reservationId: reservation.id, tableLabel: table.label })
  }
  return planned
}

export function overlayReservationsOnTables<T extends AssignableTable>(
  tables: T[],
  reservations: OverlayReservationInput[],
  merges: Array<{ tableIds: string[] }> = [],
): FloorTableView<T>[] {
  const byLabel = new Map<string, FloorReservationOverlay>()
  for (const reservation of reservations) {
    if (!reservation.table_label) continue
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) continue
    const overlay: FloorReservationOverlay = {
      id: reservation.id,
      guestName: reservation.guest_name,
      partySize: reservation.party_size,
      time: reservation.time,
      status: reservation.status,
    }
    for (const label of labelsInSameMerge(
      reservation.table_label,
      tables,
      merges,
    )) {
      byLabel.set(label, overlay)
    }
  }

  return tables.map((table) => {
    const reservation = byLabel.get(table.label) ?? null
    const displayStatus: TableStatus = reservation
      ? reservation.status === "seated"
        ? "seated"
        : "reserved"
      : table.status
    // T may omit grid fields (AssignableTable); FloorTableView requires them for the canvas.
    return { ...table, displayStatus, reservation } as FloorTableView<T>
  })
}
