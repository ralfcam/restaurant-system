export function normalizeGuestEmail(email: string | null): string | null {
  return email?.trim().toLowerCase() || null
}

export function guestEmailFromRouteParam(param: string): string | null {
  try {
    return normalizeGuestEmail(decodeURIComponent(param))
  } catch {
    return null
  }
}

export function guestProfileHref(email: string | null): string | null {
  const key = normalizeGuestEmail(email)
  return key ? `/admin/customers/${encodeURIComponent(key)}` : null
}

export function buildGuestProfile(
  email: string,
  reservations: Array<{
    email: string
    status?: string
    date?: string
    time?: string
    party_size?: number
    guest_name?: string
    phone?: string
    notes?: string
    table_label?: string | null
  }>,
): {
  guest_name?: string
  email: string | null
  phone?: string
  notes?: string
  summary: {
    totalReservations: number
    completedVisits: number
    lastVisit: string | null
  }
  history: Array<{
    email: string
    status: string
    isVisit: boolean
    date: string
    time: string
    party_size: number
    guest_name?: string
    phone?: string
    notes?: string
    table_label?: string | null
  }>
} {
  const key = normalizeGuestEmail(email)
  const history = reservations
    .filter((row) => normalizeGuestEmail(row.email) === key)
    .map((row) => ({
      ...row,
      date: row.date ?? "",
      time: row.time ?? "",
      party_size: row.party_size as number,
      status: row.status as string,
      isVisit: row.status === "completed",
    }))
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time),
    )
  const newest = history[0]
  const lastCompleted = history.find((row) => row.isVisit)
  return {
    guest_name: newest?.guest_name,
    email: key,
    phone: newest?.phone,
    notes: newest?.notes,
    summary: {
      totalReservations: history.length,
      completedVisits: history.filter((row) => row.isVisit).length,
      lastVisit: lastCompleted?.date || null,
    },
    history,
  }
}
