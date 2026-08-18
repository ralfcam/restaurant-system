/**
 * Group persisted tables + temporary merges for the live floor and auto-assign.
 */

import type { TableStatus } from "@/lib/data"
import type { AssignableTable, FloorTableView } from "@/lib/reservations/auto-assign"
import {
  mergeLabel,
  mergeSeatCapacity,
  sharedTableStatus,
} from "@/lib/floor/table-use"

export { labelsInSameMerge } from "@/lib/floor/table-use"

export type TableMergeRef = {
  id: string
  expectedMinutes: number
  expiresAt: string
  status: TableStatus
  tableIds: string[]
}

export type FloorMergeView = {
  id: string
  label: string
  seats: number
  expectedMinutes: number
  expiresAt: string
  status: TableStatus
  memberIds: string[]
  memberLabels: string[]
}

export type FloorTableWithMerge<T extends AssignableTable = AssignableTable> = FloorTableView<T> & {
  merge: FloorMergeView | null
}

export function buildMergeView(
  merge: TableMergeRef,
  tables: Array<{ id?: string; label: string; seats: number; status: TableStatus }>,
): FloorMergeView | null {
  const members = tables.filter((table) => table.id && merge.tableIds.includes(table.id))
  if (members.length < 2) return null
  return {
    id: merge.id,
    label: mergeLabel(members),
    seats: mergeSeatCapacity(members),
    expectedMinutes: merge.expectedMinutes,
    expiresAt: merge.expiresAt,
    status: sharedTableStatus(members.map((table) => table.status)),
    memberIds: members.map((table) => table.id) as string[],
    memberLabels: members.map((table) => table.label),
  }
}

/**
 * Collapse each active merge into one assignable table: primary (lowest
 * label) keeps the assignment key; seats are the sum of members.
 */
export function toAssignableTables<T extends AssignableTable>(
  tables: T[],
  merges: TableMergeRef[],
): T[] {
  const byId = new Map(tables.filter((table) => table.id).map((table) => [table.id as string, table]))
  const consumed = new Set<string>()
  const collapsed: T[] = []

  for (const merge of merges) {
    const members = merge.tableIds
      .map((id) => byId.get(id))
      .filter((table): table is T => Boolean(table))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
    if (members.length < 2) continue
    for (const member of members) {
      if (member.id) consumed.add(member.id)
    }
    collapsed.push({
      ...members[0],
      seats: mergeSeatCapacity(members),
      status: sharedTableStatus(members.map((member) => member.status)),
    })
  }

  for (const table of tables) {
    if (table.id && consumed.has(table.id)) continue
    collapsed.push(table)
  }

  return collapsed.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}

export function attachMergesToTables<T extends AssignableTable>(
  tables: FloorTableView<T>[],
  merges: TableMergeRef[],
): FloorTableWithMerge<T>[] {
  const views = new Map(
    merges
      .map((merge) => buildMergeView(merge, tables))
      .filter((view): view is FloorMergeView => view !== null)
      .map((view) => [view.id, view]),
  )

  return tables.map((table) => {
    const merge = table.id
      ? [...views.values()].find((view) => view.memberIds.includes(table.id as string)) ?? null
      : null
    return { ...table, merge }
  })
}

export function groupTablesForDisplay<T extends { id?: string; merge?: FloorMergeView | null }>(
  tables: T[],
): Array<{ mergeId: string | null; tables: T[] }> {
  const groups: Array<{ mergeId: string | null; tables: T[] }> = []
  const seen = new Set<string>()

  for (const table of tables) {
    const mergeId = table.merge?.id ?? null
    if (mergeId) {
      if (seen.has(mergeId)) continue
      seen.add(mergeId)
      groups.push({
        mergeId,
        tables: tables.filter((row) => row.merge?.id === mergeId),
      })
      continue
    }
    groups.push({ mergeId: null, tables: [table] })
  }

  return groups
}
