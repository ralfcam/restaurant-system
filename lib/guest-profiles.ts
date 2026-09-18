export function normalizeGuestEmail(email: string | null): string | null {
  return email?.trim().toLowerCase() || null
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
  }>,
): {
  guest_name?: string
  email: string | null
  phone?: string
  notes?: string
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
  return {
    guest_name: newest?.guest_name,
    email: key,
    phone: newest?.phone,
    notes: newest?.notes,
    history,
  }
}
