/**
 * Pure table auto-assignment for the live floor plan.
 *
 * A confirmed reservation is assigned the smallest available table that fits
 * the party once restaurant-local now reaches 15 minutes before the booked
 * time. This module is dependency-free so it can be unit-tested without
 * mocking Supabase or the clock.
 */

import type { ReservationStatus, TableStatus } from "@/lib/data";
import { labelsInSameMerge } from "@/lib/floor/table-use";

export const TABLE_ASSIGNMENT_LEAD_MINUTES = 15;

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "confirmed",
  "seated",
];
const TERMINAL_RESERVATION_STATUSES: ReservationStatus[] = [
  "completed",
  "cancelled",
  "no_show",
];

export type AssignableReservation = {
  id: string;
  party_size: number;
  date: string;
  time: string;
  status: ReservationStatus;
  table_label: string | null;
  created_at?: string;
};

/** Assignment inventory only — persisted grid (`id`/`x`/`y`) is required on FloorTableView. */
export type AssignableTable = {
  id?: string;
  label: string;
  seats: number;
  status: TableStatus;
};

export type PlannedAssignment = {
  reservationId: string;
  tableLabel: string;
};

export type FloorReservationOverlay = {
  id: string;
  guestName: string;
  partySize: number;
  time: string;
  status: ReservationStatus;
};

export type FloorTableView<T extends AssignableTable = AssignableTable> = T & {
  id: string;
  x: number;
  y: number;
  displayStatus: TableStatus;
  reservation: FloorReservationOverlay | null;
};

type OverlayReservationInput = {
  id: string;
  guest_name: string;
  party_size: number;
  time: string;
  status: ReservationStatus;
  table_label: string | null;
};

const TIME_RE = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

/** Normalize a stored time (`HH:MM` or `HH:MM:SS`) to minutes past midnight. */
export function timeToMinutes(time: string): number | null {
  const match = TIME_RE.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23) return null;
  return hours * 60 + minutes;
}

/**
 * True when restaurant-local now is at or after the assignment threshold
 * (booked time minus {@link TABLE_ASSIGNMENT_LEAD_MINUTES}).
 */
export function isReservationDueForAssignment(
  reservation: Pick<
    AssignableReservation,
    "date" | "time" | "status" | "table_label"
  >,
  now: { date: string; time: string },
  leadMinutes: number = TABLE_ASSIGNMENT_LEAD_MINUTES,
): boolean {
  if (reservation.table_label) return false;
  if (reservation.status !== "confirmed") return false;
  if (reservation.date !== now.date) return false;

  const booked = timeToMinutes(reservation.time);
  const current = timeToMinutes(now.time);
  if (booked === null || current === null) return false;

  return current >= booked - leadMinutes;
}

export function selectBestTable(
  tables: AssignableTable[],
  partySize: number,
  takenLabels: ReadonlySet<string>,
): AssignableTable | null {
  const eligible = tables.filter(
    (table) =>
      table.status === "available" &&
      table.seats >= partySize &&
      !takenLabels.has(table.label),
  );
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (a.seats !== b.seats) return a.seats - b.seats;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  })[0];
}

function compareDueReservations(
  a: AssignableReservation,
  b: AssignableReservation,
): number {
  const timeA = timeToMinutes(a.time) ?? 0;
  const timeB = timeToMinutes(b.time) ?? 0;
  if (timeA !== timeB) return timeA - timeB;
  if (a.party_size !== b.party_size) return b.party_size - a.party_size;
  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
}

/**
 * Plan assignments for every due, unassigned reservation against the current
 * floor. Does not mutate inputs.
 */
export function planAutoAssignments(
  reservations: AssignableReservation[],
  tables: AssignableTable[],
  now: { date: string; time: string },
  leadMinutes: number = TABLE_ASSIGNMENT_LEAD_MINUTES,
): PlannedAssignment[] {
  const taken = new Set(
    reservations
      .filter(
        (reservation) =>
          reservation.table_label &&
          ACTIVE_RESERVATION_STATUSES.includes(reservation.status) &&
          !TERMINAL_RESERVATION_STATUSES.includes(reservation.status),
      )
      .map((reservation) => reservation.table_label as string),
  );

  const due = reservations
    .filter((reservation) =>
      isReservationDueForAssignment(reservation, now, leadMinutes),
    )
    .sort(compareDueReservations);

  const planned: PlannedAssignment[] = [];
  for (const reservation of due) {
    const table = selectBestTable(tables, reservation.party_size, taken);
    if (!table) continue;
    taken.add(table.label);
    planned.push({ reservationId: reservation.id, tableLabel: table.label });
  }
  return planned;
}

export function overlayReservationsOnTables<T extends AssignableTable>(
  tables: T[],
  reservations: OverlayReservationInput[],
  merges: Array<{ tableIds: string[] }> = [],
): FloorTableView<T>[] {
  const byLabel = new Map<string, FloorReservationOverlay>();
  for (const reservation of reservations) {
    if (!reservation.table_label) continue;
    if (!ACTIVE_RESERVATION_STATUSES.includes(reservation.status)) continue;
    const overlay: FloorReservationOverlay = {
      id: reservation.id,
      guestName: reservation.guest_name,
      partySize: reservation.party_size,
      time: reservation.time,
      status: reservation.status,
    };
    for (const label of labelsInSameMerge(
      reservation.table_label,
      tables,
      merges,
    )) {
      byLabel.set(label, overlay);
    }
  }

  return tables.map((table) => {
    const reservation = byLabel.get(table.label) ?? null;
    const displayStatus: TableStatus = reservation
      ? reservation.status === "seated"
        ? "seated"
        : "reserved"
      : table.status;
    // T may omit grid fields (AssignableTable); FloorTableView requires them for the canvas.
    return { ...table, displayStatus, reservation } as FloorTableView<T>;
  });
}
