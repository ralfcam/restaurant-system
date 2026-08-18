/**
 * Floor-plan table silhouette from seat capacity.
 *
 * Odd covers → round; even covers → square. Used by `/admin/floor` chips and
 * by table create/update so persisted `shape` matches what staff see.
 */

export type TableSilhouette = "round" | "square"

export function tableShapeForSeats(seats: number): TableSilhouette {
  const n = Math.max(1, Math.min(12, Math.round(seats)))
  return n % 2 === 0 ? "square" : "round"
}

/** Equal-sided chip so even tables stay square and odd tables stay circular. */
export function tableChipSizeClass(seats: number): string {
  const n = Math.max(1, Math.min(12, Math.round(seats)))
  if (n <= 2) return "size-20"
  if (n <= 4) return "size-24"
  if (n <= 8) return "size-28"
  return "size-32"
}
