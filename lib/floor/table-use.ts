/**
 * Expected table turn time and temporary merge rules for /admin/floor.
 *
 * Pure helpers so status, duration, and capacity stay consistent in the UI
 * and in server actions without hitting Supabase.
 */

import type { TableStatus } from "@/lib/data"

export const DEFAULT_EXPECTED_MINUTES = 90
export const MIN_EXPECTED_MINUTES = 30
export const MAX_EXPECTED_MINUTES = 240
export const EXPECTED_MINUTES_STEP = 15

export function clampExpectedMinutes(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EXPECTED_MINUTES
  const stepped =
    Math.round(value / EXPECTED_MINUTES_STEP) * EXPECTED_MINUTES_STEP
  return Math.max(MIN_EXPECTED_MINUTES, Math.min(MAX_EXPECTED_MINUTES, stepped))
}

export function defaultMergeExpectedMinutes(
  tables: Array<{ expectedMinutes: number }>,
): number {
  if (tables.length === 0) return DEFAULT_EXPECTED_MINUTES
  return clampExpectedMinutes(
    Math.max(...tables.map((table) => table.expectedMinutes)),
  )
}

export function mergeSeatCapacity(tables: Array<{ seats: number }>): number {
  return tables.reduce((sum, table) => sum + table.seats, 0)
}

export function mergeLabel(tables: Array<{ label: string }>): string {
  return [...tables]
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    )
    .map((table) => table.label)
    .join("+")
}

export function mergeExpiresAt(from: Date, expectedMinutes: number): Date {
  return new Date(
    from.getTime() + clampExpectedMinutes(expectedMinutes) * 60_000,
  )
}

export function isMergeExpired(expiresAt: Date | string, now: Date): boolean {
  return new Date(expiresAt).getTime() <= now.getTime()
}

/**
 * Available and out-of-service end a temporary arrangement: tables go back
 * to independent inventory. Reserved / seated / cleaning keep the group
 * so status changes apply to every member.
 */
export function dissolvesMerge(status: TableStatus): boolean {
  return status === "available" || status === "out_of_service"
}

/** Reserved and seated start (or refresh) the expected-use clock. */
export function restartsMergeClock(status: TableStatus): boolean {
  return status === "reserved" || status === "seated"
}

export function canMergeTables(
  tables: Array<{ status: TableStatus; mergeId?: string | null }>,
): string | null {
  if (tables.length < 2) return "Select at least two tables to merge."
  if (tables.some((table) => table.mergeId)) {
    return "A selected table is already in an arrangement."
  }
  if (tables.some((table) => table.status !== "available")) {
    return "Only available tables can be merged."
  }
  return null
}

export function canAddTablesToMerge(
  merge: { status: TableStatus },
  newcomers: Array<{ status: TableStatus; mergeId?: string | null }>,
): string | null {
  if (merge.status !== "available") {
    return "Only available arrangements can take another table."
  }
  if (newcomers.length === 0)
    return "A selected table is already in an arrangement."
  if (newcomers.some((table) => table.mergeId)) {
    return "A selected table is already in an arrangement."
  }
  if (newcomers.some((table) => table.status !== "available")) {
    return "Only available tables can be merged."
  }
  return null
}

/** Unused available arrangements expire when their expected time elapses. */
export function shouldExpireMerge(
  merge: { status: TableStatus; expiresAt: string | Date },
  now: Date,
): boolean {
  return merge.status === "available" && isMergeExpired(merge.expiresAt, now)
}

export function remainingMinutes(expiresAt: string | Date, now: Date): number {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000),
  )
}

export function formatDurationMinutes(minutes: number): string {
  const n = Math.max(0, Math.round(minutes))
  if (n < 60) return `${n} min`
  const hours = Math.floor(n / 60)
  const rest = n % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export function labelsInSameMerge(
  label: string,
  tables: Array<{ id?: string; label: string }>,
  merges: Array<{ tableIds: string[] }>,
): string[] {
  const table = tables.find((row) => row.label === label)
  if (!table?.id) return [label]
  const merge = merges.find((row) => row.tableIds.includes(table.id as string))
  if (!merge) return [label]
  const members = tables.filter(
    (row) => row.id && merge.tableIds.includes(row.id),
  )
  return members.length >= 2 ? members.map((row) => row.label) : [label]
}

export function sharedTableStatus(statuses: TableStatus[]): TableStatus {
  if (statuses.length === 0) return "available"
  if (statuses.every((status) => status === statuses[0])) return statuses[0]
  if (statuses.includes("seated")) return "seated"
  if (statuses.includes("reserved")) return "reserved"
  if (statuses.includes("cleaning")) return "cleaning"
  if (statuses.includes("out_of_service")) return "out_of_service"
  return "available"
}
