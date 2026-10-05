import { dateTimeToUTC } from "@/lib/timezone"

const LATE_CANCEL_MS = 24 * 60 * 60 * 1000
const DELAY_MS = 15 * 60 * 1000

export function deriveGuestIncidents(
  rows: {
    status: string
    date: string
    time: string
    cancelled_at: string | null
    seated_at?: string | null
  }[],
): { type: string; date: string }[] {
  const incidents: { type: string; date: string }[] = []
  for (const row of rows) {
    if (row.status === "no_show" && row.date) {
      incidents.push({ type: "no_show", date: row.date })
    }
    if (
      row.status === "cancelled" &&
      row.cancelled_at != null &&
      row.date &&
      row.time &&
      Date.parse(row.cancelled_at) >=
        dateTimeToUTC(row.date, row.time).getTime() - LATE_CANCEL_MS
    ) {
      incidents.push({ type: "late_cancel", date: row.date })
    }
    if (
      (row.status === "seated" || row.status === "completed") &&
      row.seated_at &&
      row.date &&
      row.time &&
      Date.parse(row.seated_at) >
        dateTimeToUTC(row.date, row.time).getTime() + DELAY_MS
    ) {
      incidents.push({ type: "delay", date: row.date })
    }
  }
  return incidents
}

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
