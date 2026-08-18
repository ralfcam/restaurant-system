/**
 * Opening-hour segments: domain types and pure helpers.
 *
 * A day is either closed or a list of non-overlapping service windows
 * (e.g. morning 09:00–11:00, lunch 12:00–14:00, dinner 18:00–22:00).
 * The guest booking widget and the DB trigger both use these rules.
 */

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export type OperatingSegment = {
  opens_at: string
  closes_at: string
  label: string | null
  sort_order: number
}

export type OperatingDay = {
  day_of_week: number
  is_closed: boolean
  segments: OperatingSegment[]
}

/** Flat `operating_windows` row as stored in Postgres. */
export type OperatingWindowRow = {
  id?: string
  day_of_week: number
  opens_at: string
  closes_at: string
  is_closed: boolean
  label?: string | null
  sort_order?: number
}

/**
 * Calendar / widget map value. `is_closed` drives disabled dates;
 * `segments` drive bookable times. Kept as `OperatingWindow` so existing
 * imports from availability actions keep compiling.
 */
export type OperatingWindow = OperatingDay

export const SUGGESTED_SEGMENTS: ReadonlyArray<Omit<OperatingSegment, "sort_order">> = [
  { label: "Morning", opens_at: "09:00", closes_at: "11:00" },
  { label: "Lunch", opens_at: "12:00", closes_at: "14:00" },
  { label: "Dinner", opens_at: "18:00", closes_at: "22:00" },
]

const DEFAULT_OPEN_SEGMENT: OperatingSegment = {
  label: null,
  opens_at: "09:00",
  closes_at: "22:00",
  sort_order: 0,
}

export const DEFAULT_OPERATING_DAYS: OperatingDay[] = DAY_NAMES.map((_, day_of_week) =>
  day_of_week === 0
    ? { day_of_week, is_closed: true, segments: [] }
    : { day_of_week, is_closed: false, segments: [{ ...DEFAULT_OPEN_SEGMENT }] },
)

/** Strip seconds / pad hours so PG `TIME` ("09:00:00") compares as "09:00". */
export function normalizeTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value.trim())
  if (!match) return value.trim()
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

export function isTimeWithinSegments(time: string, segments: OperatingSegment[]): boolean {
  const t = normalizeTime(time)
  if (!TIME_RE.test(t)) return false
  return segments.some((segment) => {
    const opens = normalizeTime(segment.opens_at)
    const closes = normalizeTime(segment.closes_at)
    return t >= opens && t <= closes
  })
}

export function formatSegmentsSummary(segments: OperatingSegment[]): string {
  return segments
    .map((segment) => {
      const range = `${normalizeTime(segment.opens_at)}–${normalizeTime(segment.closes_at)}`
      const label = segment.label?.trim()
      return label ? `${label} ${range}` : range
    })
    .join(", ")
}

export function generateSlotsForSegments(
  segments: OperatingSegment[],
  stepMinutes = 30,
): string[] {
  const times = new Set<string>()
  for (const segment of segments) {
    const start = timeToMinutes(segment.opens_at)
    const end = timeToMinutes(segment.closes_at)
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue
    for (let minutes = start; minutes <= end; minutes += stepMinutes) {
      if (minutes >= 24 * 60) break
      times.add(minutesToTime(minutes))
    }
  }
  return [...times].sort()
}

export function bookableTimesForDay(day: OperatingDay, stepMinutes = 30): string[] {
  if (day.is_closed) return []
  return generateSlotsForSegments(day.segments, stepMinutes)
}

export function lastBookableTime(day: OperatingDay | undefined): string | null {
  if (!day || day.is_closed || day.segments.length === 0) return null
  return day.segments.reduce((latest, segment) => {
    const close = normalizeTime(segment.closes_at)
    return close > latest ? close : latest
  }, "00:00")
}

export function nextSuggestedSegment(existing: OperatingSegment[]): OperatingSegment {
  const suggested = SUGGESTED_SEGMENTS[existing.length]
  if (suggested) {
    return { ...suggested, sort_order: existing.length }
  }

  const lastClose = existing.reduce((latest, segment) => {
    const close = normalizeTime(segment.closes_at)
    return close > latest ? close : latest
  }, "09:00")
  const startMinutes = Math.min(timeToMinutes(lastClose), 22 * 60)
  const endMinutes = Math.min(startMinutes + 120, 23 * 60 + 30)
  return {
    label: "Segment",
    opens_at: minutesToTime(startMinutes),
    closes_at: minutesToTime(Math.max(endMinutes, startMinutes + 30)),
    sort_order: existing.length,
  }
}

export function validateOperatingDays(days: OperatingDay[]): string | null {
  if (days.length !== 7) return "All 7 days of the week must be provided."

  const seen = new Set<number>()
  for (const day of days) {
    if (day.day_of_week < 0 || day.day_of_week > 6) {
      return "Invalid day of week."
    }
    if (seen.has(day.day_of_week)) return "Duplicate day of week."
    seen.add(day.day_of_week)

    if (day.is_closed) continue

    if (day.segments.length === 0) {
      return `${DAY_NAMES[day.day_of_week]} is open but has no segments.`
    }

    const ranges = day.segments.map((segment) => ({
      start: normalizeTime(segment.opens_at),
      end: normalizeTime(segment.closes_at),
    }))

    for (const range of ranges) {
      if (!TIME_RE.test(range.start) || !TIME_RE.test(range.end)) {
        return `${DAY_NAMES[day.day_of_week]} has an invalid segment time.`
      }
      if (range.start >= range.end) {
        return `${DAY_NAMES[day.day_of_week]} has a segment that closes before it opens.`
      }
    }

    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        return `${DAY_NAMES[day.day_of_week]} has overlapping segments.`
      }
    }
  }

  return null
}

export function groupRowsByDay(rows: OperatingWindowRow[]): OperatingDay[] {
  const byDay = new Map<number, OperatingWindowRow[]>()
  for (const row of rows) {
    const list = byDay.get(row.day_of_week) ?? []
    list.push(row)
    byDay.set(row.day_of_week, list)
  }

  return DEFAULT_OPERATING_DAYS.map((seed) => {
    const dayRows = byDay.get(seed.day_of_week)
    if (!dayRows || dayRows.length === 0) return seed

    const isClosed = dayRows.every((row) => row.is_closed)
    if (isClosed) {
      return { day_of_week: seed.day_of_week, is_closed: true, segments: [] }
    }

    const segments = dayRows
      .filter((row) => !row.is_closed)
      .sort((a, b) => {
        const order = (a.sort_order ?? 0) - (b.sort_order ?? 0)
        if (order !== 0) return order
        return normalizeTime(a.opens_at).localeCompare(normalizeTime(b.opens_at))
      })
      .map((row, index) => ({
        opens_at: normalizeTime(row.opens_at),
        closes_at: normalizeTime(row.closes_at),
        label: row.label ?? null,
        sort_order: row.sort_order ?? index,
      }))

    return {
      day_of_week: seed.day_of_week,
      is_closed: false,
      segments,
    }
  })
}

export function flattenDaysToRows(days: OperatingDay[]): OperatingWindowRow[] {
  const rows: OperatingWindowRow[] = []
  for (const day of days) {
    if (day.is_closed || day.segments.length === 0) {
      rows.push({
        day_of_week: day.day_of_week,
        opens_at: "00:00",
        closes_at: "00:00",
        is_closed: true,
        label: null,
        sort_order: 0,
      })
      continue
    }

    day.segments.forEach((segment, index) => {
      rows.push({
        day_of_week: day.day_of_week,
        opens_at: normalizeTime(segment.opens_at),
        closes_at: normalizeTime(segment.closes_at),
        is_closed: false,
        label: segment.label?.trim() || null,
        sort_order: index,
      })
    })
  }
  return rows
}

export function daysToWindowsMap(days: OperatingDay[]): Record<number, OperatingDay> {
  const map: Record<number, OperatingDay> = {}
  for (const day of days) map[day.day_of_week] = day
  return map
}
