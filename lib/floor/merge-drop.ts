/**
 * Drop-to-merge rules for /admin/floor.
 *
 * Dragging an available table onto another is the favoured merge UX.
 * These helpers stay pure so the floor chips and the inspector fallback
 * reject the same invalid combinations before calling mergeTables.
 */

import type { TableStatus } from "@/lib/data"
import { canAddTablesToMerge, canMergeTables } from "@/lib/floor/table-use"

export const FLOOR_TABLE_DRAG_MIME = "application/x-floor-table-id"

export type MergeDropTable = {
  id: string
  status: TableStatus
  displayStatus?: TableStatus
  mergeId?: string | null
  merge?: {
    id: string
    status?: TableStatus
    memberIds?: string[]
  } | null
  reservation?: unknown | null
}

export type MergeDropResult =
  | { tableIds: string[]; error?: undefined }
  | { tableIds?: undefined; error: string }

function arrangementId(table: MergeDropTable): string | null {
  return table.merge?.id ?? table.mergeId ?? null
}

function floorStatus(table: MergeDropTable): TableStatus {
  return table.displayStatus ?? table.status
}

function isAvailableUnassigned(table: MergeDropTable): boolean {
  return (
    table.status === "available" &&
    floorStatus(table) === "available" &&
    !table.reservation
  )
}

/** Available, unassigned, and not already in an arrangement — safe to merge. */
export function isDragMergeable(table: MergeDropTable): boolean {
  return isAvailableUnassigned(table) && !arrangementId(table)
}

/** Available member of an arrangement — drag out onto the floor to split. */
export function isDragSplittable(table: MergeDropTable): boolean {
  return isAvailableUnassigned(table) && Boolean(arrangementId(table))
}

export function canDragFloorTable(table: MergeDropTable): boolean {
  return isDragMergeable(table) || isDragSplittable(table)
}

export function resolveSplitDrop(
  sourceId: string,
  tables: MergeDropTable[],
): { mergeId: string; error?: undefined } | { mergeId?: undefined; error: string } {
  const source = tables.find((table) => table.id === sourceId)
  if (!source) return { error: "Tables not found." }
  const mergeId = arrangementId(source)
  if (!mergeId) return { error: "That table is not in an arrangement." }
  if (!isDragSplittable(source)) {
    return { error: "Only available arrangements can be split." }
  }
  return { mergeId }
}

function idsForDrop(table: MergeDropTable): string[] {
  if (table.merge?.memberIds && table.merge.memberIds.length >= 2) {
    return [...table.merge.memberIds]
  }
  return [table.id]
}

/**
 * Resolve a table drop: merge two free tables, or add a free table to an
 * available arrangement. Returns table ids for mergeTables, or a reason.
 */
export function resolveMergeDrop(
  sourceId: string,
  targetId: string,
  tables: MergeDropTable[],
): MergeDropResult {
  if (!sourceId || !targetId || sourceId === targetId) {
    return { error: "Drop a table onto a different table to merge." }
  }

  const source = tables.find((table) => table.id === sourceId)
  const target = tables.find((table) => table.id === targetId)
  if (!source || !target) return { error: "Tables not found." }

  const sourceMerge = arrangementId(source)
  const targetMerge = arrangementId(target)
  if (sourceMerge && targetMerge) {
    if (sourceMerge === targetMerge) {
      return { error: "Those tables are already merged." }
    }
    return { error: "Split an arrangement before combining it with another." }
  }

  const wanted = new Set([...idsForDrop(source), ...idsForDrop(target)])
  const involved = tables.filter((table) => wanted.has(table.id))
  const tableIds = involved.map((table) => table.id)

  if (involved.length !== wanted.size) return { error: "Tables not found." }

  if (involved.some((table) => table.reservation || floorStatus(table) !== "available")) {
    return { error: "Only available tables can be merged." }
  }

  const existing = involved.find((table) => arrangementId(table))
  if (!existing) {
    const reason = canMergeTables(involved)
    return reason ? { error: reason } : { tableIds }
  }

  const newcomers = involved.filter((table) => !arrangementId(table))
  const reason = canAddTablesToMerge(
    { status: existing.merge?.status ?? existing.status },
    newcomers,
  )
  return reason ? { error: reason } : { tableIds }
}
