import type { TableStatus } from "@/lib/data"
import { DEFAULT_EXPECTED_MINUTES } from "@/lib/floor/table-use"
import {
  ACTIVE_RESERVATION_STATUSES,
  occupyingWindowMinutes,
  occupyingWindowsOverlap,
  type AssignableReservation,
} from "@/lib/reservations/auto-assign"
import { DEFAULT_SAFETY_BUFFER_MINUTES } from "@/lib/reservations/operating-hours"

type OccupancyBag = {
  candidate: Pick<AssignableReservation, "id" | "date" | "time">
  occupying: Array<
    Pick<
      AssignableReservation,
      "id" | "date" | "time" | "status" | "table_label"
    >
  >
}

/**
 * Manual-assign dropdown inventory (FP-5): available tables that fit the
 * party (`seats >= partySize`). The reservation's current label is always
 * kept, even when undersize or not available. Optional occupancy omits
 * labels claimed by overlapping same-date occupying rows (BW-9 90+15);
 * the candidate's own occupying row is skipped so its label is not a
 * foreign claim.
 */
export function selectableTablesForAssignment<
  T extends { label: string; seats: number; status: TableStatus },
>(
  tables: T[],
  partySize: number,
  currentLabel?: string,
  occupancy?: OccupancyBag,
): T[] {
  const claimed = claimedOccupyingLabels(occupancy)
  return tables.filter((table) => {
    if (table.label === currentLabel) return true
    if (claimed.has(table.label)) return false
    return table.status === "available" && table.seats >= partySize
  })
}

function claimedOccupyingLabels(occupancy?: OccupancyBag): Set<string> {
  if (!occupancy) return new Set()
  const candidateWindow = occupyingWindowMinutes(
    occupancy.candidate.time,
    DEFAULT_EXPECTED_MINUTES,
    DEFAULT_SAFETY_BUFFER_MINUTES,
  )
  if (!candidateWindow) return new Set()

  const labels = new Set<string>()
  for (const row of occupancy.occupying) {
    if (row.id === occupancy.candidate.id) continue
    if (row.date !== occupancy.candidate.date) continue
    if (!row.table_label) continue
    if (!ACTIVE_RESERVATION_STATUSES.includes(row.status)) continue
    const window = occupyingWindowMinutes(
      row.time,
      DEFAULT_EXPECTED_MINUTES,
      DEFAULT_SAFETY_BUFFER_MINUTES,
    )
    if (window && occupyingWindowsOverlap(candidateWindow, window)) {
      labels.add(row.table_label)
    }
  }
  return labels
}
