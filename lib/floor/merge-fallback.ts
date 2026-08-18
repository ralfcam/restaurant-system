/**
 * Merge persistence helpers.
 *
 * Dedicated `table_merges` / `table_merge_members` relations are preferred.
 * When those are missing from Postgres or the PostgREST schema cache, full
 * arrangement state is stored on `status_events`. Live DBs check
 * `status_events_entity_type_check` (`table` | `reservation` | `order`), so
 * fallback rows must use `entity_type = table` — `table_merge` is rejected.
 */

import type { TableStatus } from "@/lib/data"
import { mergeLabel, mergeSeatCapacity } from "@/lib/floor/table-use"

/** Must stay inside `status_events_entity_type_check` on the live database. */
export const MERGE_EVENT_TYPE = "table"

export type MergeStatePayload = {
  v: 1
  tableIds: string[]
  expectedMinutes: number
  expiresAt: string
  status: TableStatus
  label: string
  seats: number
}

export type MergeEventRow = {
  entity_id: string
  to_status: string | null
  reason: string | null
  created_at?: string
}

export function isMissingRelationError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false
  const message = error.message ?? ""
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table/i.test(message) ||
    /relation .+ does not exist/i.test(message) ||
    /schema cache/i.test(message)
  )
}

export function encodeMergeState(payload: MergeStatePayload): string {
  return JSON.stringify(payload)
}

export function decodeMergeState(reason: string | null | undefined): MergeStatePayload | null {
  if (!reason?.startsWith("{")) return null
  try {
    const parsed = JSON.parse(reason) as Partial<MergeStatePayload>
    if (parsed.v !== 1 || !Array.isArray(parsed.tableIds) || parsed.tableIds.length < 2) {
      return null
    }
    if (!parsed.expiresAt || !parsed.status) return null
    return {
      v: 1,
      tableIds: parsed.tableIds.map(String),
      expectedMinutes: Number(parsed.expectedMinutes) || 90,
      expiresAt: String(parsed.expiresAt),
      status: parsed.status,
      label: String(parsed.label ?? ""),
      seats: Number(parsed.seats) || 0,
    }
  } catch {
    return null
  }
}

export function mergeStateFromTables(
  tableIds: string[],
  tables: Array<{ id: string; label: string; seats: number }>,
  fields: { expectedMinutes: number; expiresAt: string; status: TableStatus },
): MergeStatePayload {
  const members = tableIds
    .map((id) => tables.find((table) => table.id === id))
    .filter((table): table is { id: string; label: string; seats: number } => Boolean(table))
  return {
    v: 1,
    tableIds: members.map((table) => table.id),
    expectedMinutes: fields.expectedMinutes,
    expiresAt: fields.expiresAt,
    status: fields.status,
    label: mergeLabel(members),
    seats: mergeSeatCapacity(members),
  }
}

const DISSOLVED = new Set(["split", "expired"])

export type FallbackMerge = MergeStatePayload & { id: string }

/** Latest event per merge id; dissolved arrangements are omitted. */
export function activeMergesFromEvents(events: MergeEventRow[]): FallbackMerge[] {
  const latest = new Map<string, MergeEventRow>()
  const ordered = [...events].sort((a, b) =>
    String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  )
  for (const event of ordered) {
    latest.set(String(event.entity_id), event)
  }

  const active: FallbackMerge[] = []
  for (const [id, event] of latest) {
    if (DISSOLVED.has(String(event.to_status))) continue
    const payload = decodeMergeState(event.reason)
    if (!payload) continue
    active.push({ ...payload, id })
  }
  return active
}
