/**
 * Staff date-list empty copy (STAFF-LIST). Load-error text wins; otherwise
 * status/name-phone flags choose filter-empty vs date-empty. Row counts are
 * the caller snapshot (tests pass them) and are not consulted.
 */
const FILTER_EMPTY = "No reservations match your filters."
const DATE_EMPTY = "No reservations for this date."

export function staffListEmptyCopy({
  error,
  statusFilterActive,
  nameOrPhoneFilterActive,
}: {
  error?: string
  loadedCount: number
  filteredCount: number
  statusFilterActive: boolean
  nameOrPhoneFilterActive: boolean
}): string {
  if (error) return error
  if (statusFilterActive || nameOrPhoneFilterActive) return FILTER_EMPTY
  return DATE_EMPTY
}
