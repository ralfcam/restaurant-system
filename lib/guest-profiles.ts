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

export function normalizeGuestPhone(
  phone: string | null | undefined,
): string | null {
  if (phone == null) return null
  return phone.trim().replaceAll(" ", "") || null
}

export function mergeCandidateEmails(
  rows: Array<{
    email: string | null
    phone: string | null
    guest_name?: string | null
  }>,
  email: string | null,
): string[] {
  const subject = normalizeGuestEmail(email)
  if (subject == null) return []

  const subjectPhones = new Set<string>()
  for (const row of rows) {
    if (normalizeGuestEmail(row.email) !== subject) continue
    const phone = normalizeGuestPhone(row.phone)
    if (phone != null) subjectPhones.add(phone)
  }

  const candidateEmails = new Set<string>()
  for (const row of rows) {
    const rowEmail = normalizeGuestEmail(row.email)
    if (rowEmail == null || rowEmail === subject) continue
    const phone = normalizeGuestPhone(row.phone)
    if (phone != null && subjectPhones.has(phone)) {
      candidateEmails.add(rowEmail)
    }
  }
  return [...candidateEmails].sort()
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
    id?: string
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
    id?: string
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
      id: row.id,
      email: row.email,
      guest_name: row.guest_name,
      phone: row.phone,
      notes: row.notes,
      date: row.date ?? "",
      time: row.time ?? "",
      party_size: row.party_size as number,
      table_label: row.table_label,
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

function firstFilterString(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (!Array.isArray(value)) return undefined
  for (const item of value) {
    if (typeof item === "string") return item
  }
  return undefined
}

type GuestSegmentFilters = {
  name?: string
  phone?: string
  minCompleted?: number
  hasNoShow?: boolean
  lastVisitOnOrBefore?: string
}

export function parseGuestSegmentFilters(params: {
  name?: unknown
  phone?: unknown
  minCompleted?: unknown
  hasNoShow?: unknown
  lastVisitOnOrBefore?: unknown
}): GuestSegmentFilters {
  const filters: GuestSegmentFilters = {}

  const name = firstFilterString(params.name)?.trim()
  if (name) filters.name = name
  const phone = firstFilterString(params.phone)?.trim()
  if (phone) filters.phone = phone

  const minCompleted = firstFilterString(params.minCompleted)
  if (minCompleted != null && /^\d+$/.test(minCompleted)) {
    filters.minCompleted = Number(minCompleted)
  }

  const hasNoShow = firstFilterString(params.hasNoShow)
  if (hasNoShow === "true" || hasNoShow === "on" || hasNoShow === "1") {
    filters.hasNoShow = true
  }

  const lastVisitOnOrBefore = firstFilterString(params.lastVisitOnOrBefore)
  if (
    lastVisitOnOrBefore != null &&
    /^\d{4}-\d{2}-\d{2}$/.test(lastVisitOnOrBefore)
  ) {
    filters.lastVisitOnOrBefore = lastVisitOnOrBefore
  }

  return filters
}

export function segmentGuests(
  rows: Array<{
    email: string | null
    guest_name: string | null
    phone: string | null
    date: string | null
    time: string | null
    status?: string | null
  }>,
  filters?: GuestSegmentFilters,
): Array<{
  email: string
  guest_name: string | null
  phone: string | null
  href: string | null
}> {
  const nameFilter = filters?.name?.trim().toLowerCase() ?? ""
  const phoneFilter = filters?.phone?.trim() ?? ""
  const minCompleted = filters?.minCompleted
  const requireNoShow = filters?.hasNoShow === true
  const lastVisitOnOrBefore = filters?.lastVisitOnOrBefore ?? ""

  type Row = (typeof rows)[number]
  const byEmail = new Map<
    string,
    {
      newest: Row
      completedCount: number
      hasNoShow: boolean
      newestCompleted: Row | null
    }
  >()

  const isNewer = (row: Row, current: Row) => {
    const dateCmp = (row.date ?? "").localeCompare(current.date ?? "")
    if (dateCmp !== 0) return dateCmp > 0
    // Equal date and time keeps the row already stored.
    return (row.time ?? "").localeCompare(current.time ?? "") > 0
  }

  for (const row of rows) {
    const email = normalizeGuestEmail(row.email)
    if (email == null) continue
    let group = byEmail.get(email)
    if (group == null) {
      group = {
        newest: row,
        completedCount: 0,
        hasNoShow: false,
        newestCompleted: null,
      }
      byEmail.set(email, group)
    } else if (isNewer(row, group.newest)) {
      group.newest = row
    }
    if (row.status === "completed") {
      group.completedCount += 1
      if (
        group.newestCompleted == null ||
        isNewer(row, group.newestCompleted)
      ) {
        group.newestCompleted = row
      }
    } else if (row.status === "no_show") {
      group.hasNoShow = true
    }
  }

  return [...byEmail.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, group]) => {
      const name = group.newest.guest_name
      if (
        nameFilter !== "" &&
        (name == null || !name.toLowerCase().includes(nameFilter))
      ) {
        return false
      }
      const phone = group.newest.phone
      if (
        phoneFilter !== "" &&
        (phone == null || !phone.includes(phoneFilter))
      ) {
        return false
      }
      if (minCompleted != null && group.completedCount < minCompleted) {
        return false
      }
      if (requireNoShow && !group.hasNoShow) return false
      if (lastVisitOnOrBefore !== "") {
        if (group.newestCompleted == null) return false
        const lastDate = group.newestCompleted.date ?? ""
        if (lastDate > lastVisitOnOrBefore) return false
      }
      return true
    })
    .map(([email, group]) => ({
      email,
      guest_name: group.newest.guest_name ?? null,
      phone: group.newest.phone ?? null,
      href: guestProfileHref(email),
    }))
}
