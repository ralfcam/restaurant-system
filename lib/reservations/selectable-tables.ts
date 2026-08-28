import type { TableStatus } from "@/lib/data"

/**
 * Manual-assign dropdown inventory (FP-5): available tables that fit the
 * party (`seats >= partySize`). The reservation's current label is always
 * kept, even when undersize or not available.
 */
export function selectableTablesForAssignment<
  T extends { label: string; seats: number; status: TableStatus },
>(tables: T[], partySize: number, currentLabel?: string): T[] {
  return tables.filter((table) => {
    if (table.label === currentLabel) return true
    return table.status === "available" && table.seats >= partySize
  })
}
