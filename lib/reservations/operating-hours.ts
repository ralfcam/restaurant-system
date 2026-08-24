/**
 * Opening-hour segments: domain types and pure helpers.
 *
 * A day is either closed or a list of non-overlapping service windows
 * (e.g. morning 09:00–11:00, lunch 12:00–14:00, dinner 18:00–22:00).
 * The guest booking widget and the DB trigger both use these rules.
 */

import { DEFAULT_EXPECTED_MINUTES } from "@/lib/floor/table-use"

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
const MINUTES_PER_DAY = 24 * 60

export type OperatingSegment = {
  opens_at: string
  closes_at: string
  label: string | null
  sort_order: number
  /** Present only when non-blank. Persist via flatten as SQL NULL when omitted. */
  guest_note?: string | null
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
  /** Always set on flatten so replace_operating_windows can store/clear NULL. */
  guest_note?: string | null
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

/** Clock-face minutes in `[0, 1440)`. `minutesToTime` itself does not wrap. */
function wrapMinutesOfDay(totalMinutes: number): number {
  return ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

/** Slot end time: start plus duration, wrapping modulo 24h (never `24:30`). */
export function slotUntilTime(
  start: string,
  durationMinutes: number = DEFAULT_EXPECTED_MINUTES,
): string {
  return minutesToTime(wrapMinutesOfDay(timeToMinutes(start) + durationMinutes))
}

/** Inclusive: both `opens_at` and `closes_at` are bookable instants. */
function segmentContainsTimeInclusive(segment: OperatingSegment, time: string): boolean {
  return time >= normalizeTime(segment.opens_at) && time <= normalizeTime(segment.closes_at)
}

/**
 * Whether `time` is bookable in any segment. Booking validation stays inclusive
 * (both endpoints) because slot generation emits `closes_at` (`minutes <= end`)
 * and the last slot of the day (e.g. Dinner 22:00) must remain bookable.
 * Exclusive grouping is assignment-only — see `assignSegmentForTime`.
 */
export function isTimeWithinSegments(time: string, segments: OperatingSegment[]): boolean {
  const t = normalizeTime(time)
  if (!TIME_RE.test(t)) return false
  return assignSegmentForTime(t, segments) !== undefined
}

/**
 * BW-1: a time belongs to exactly one segment. Prefer the last segment whose
 * `opens_at` equals the time and whose window contains it; otherwise the first
 * inclusive match. Shared Lunch-close / Afternoon-open (14:00) therefore belongs
 * to Afternoon. An inverted window that merely opens at the query time cannot
 * steal membership.
 */
export function assignSegmentForTime(
  time: string,
  segments: OperatingSegment[],
): OperatingSegment | undefined {
  const t = normalizeTime(time)
  const containing = segments.filter((segment) => segmentContainsTimeInclusive(segment, t))
  const openingAtTime = containing.findLast(
    (segment) => normalizeTime(segment.opens_at) === t,
  )
  return openingAtTime ?? containing[0]
}

type BookableSlotGroup = {
  label: string
  times: string[]
  guest_note?: string
}

/** Blank/whitespace → undefined so guest payloads omit the key (BW-4). Persist with `?? null`. */
function trimmedGuestNote(value: string | null | undefined): string | undefined {
  const note = value?.trim()
  return note ? note : undefined
}

function segmentTimeRange(segment: OperatingSegment): string {
  return `${normalizeTime(segment.opens_at)}–${normalizeTime(segment.closes_at)}`
}

function toBookableSlotGroup(
  segment: OperatingSegment,
  times: string[],
): BookableSlotGroup {
  const group: BookableSlotGroup = {
    label: segment.label?.trim() || segmentTimeRange(segment),
    times,
  }
  const note = trimmedGuestNote(segment.guest_note)
  if (note) group.guest_note = note
  return group
}

/**
 * BW-4: group bookable times by segment `sort_order`. Membership is BW-1
 * (`assignSegmentForTime`); empty groups are omitted; unlabeled headings
 * fall back to the time range; blank `guest_note` is omitted from the payload.
 */
export function groupBookableSlots(
  times: string[],
  segments: OperatingSegment[],
): BookableSlotGroup[] {
  const timesBySegment = new Map<OperatingSegment, string[]>()
  for (const time of times) {
    const segment = assignSegmentForTime(time, segments)
    if (!segment) continue
    const bucket = timesBySegment.get(segment)
    if (bucket) bucket.push(time)
    else timesBySegment.set(segment, [time])
  }

  return [...segments]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap((segment) => {
      const segmentTimes = timesBySegment.get(segment)
      return segmentTimes ? [toBookableSlotGroup(segment, segmentTimes)] : []
    })
}

export function formatSegmentsSummary(segments: OperatingSegment[]): string {
  return segments
    .map((segment) => {
      const range = segmentTimeRange(segment)
      const label = segment.label?.trim()
      return label ? `${label} ${range}` : range
    })
    .join(", ")
}

const DAY_LABELS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const

/**
 * Builds a compact, guest-facing weekly summary from the operational schedule.
 * Consecutive Monday-first days with identical hours are grouped together.
 */
export function summarizeOperatingDays(days: OperatingDay[]): string {
  if (days.length === 0) return "Hours unavailable"

  const byDay = new Map(days.map((day) => [day.day_of_week, day]))
  const ordered = MONDAY_FIRST.map((dayOfWeek) => {
    const day = byDay.get(dayOfWeek)
    const summary = !day || day.is_closed || day.segments.length === 0
      ? "Closed"
      : formatSegmentsSummary(day.segments)
    return { dayOfWeek, summary }
  })

  const groups: Array<{ start: number; end: number; summary: string }> = []
  for (const entry of ordered) {
    const previous = groups.at(-1)
    if (previous?.summary === entry.summary) {
      previous.end = entry.dayOfWeek
    } else {
      groups.push({ start: entry.dayOfWeek, end: entry.dayOfWeek, summary: entry.summary })
    }
  }

  return groups
    .map(({ start, end, summary }) => {
      const daysLabel = start === end
        ? DAY_LABELS_SHORT[start]
        : `${DAY_LABELS_SHORT[start]}–${DAY_LABELS_SHORT[end]}`
      return `${daysLabel} · ${summary}`
    })
    .join("; ")
}

export const ALLOWED_SLOT_INTERVALS = [15, 30, 60] as const
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30
export type SlotIntervalMinutes = (typeof ALLOWED_SLOT_INTERVALS)[number]

/** BW-3: guest slot spacing is 15, 30, or 60 minutes; anything else is 30. */
export function clampSlotIntervalMinutes(
  minutes: number,
): SlotIntervalMinutes {
  for (const allowed of ALLOWED_SLOT_INTERVALS) {
    if (minutes === allowed) return allowed
  }
  return DEFAULT_SLOT_INTERVAL_MINUTES
}

export function generateSlotsForSegments(
  segments: OperatingSegment[],
  stepMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
): string[] {
  const times = new Set<string>()
  for (const segment of segments) {
    const start = timeToMinutes(segment.opens_at)
    const end = timeToMinutes(segment.closes_at)
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) continue
    for (let minutes = start; minutes <= end; minutes += stepMinutes) {
      if (minutes >= MINUTES_PER_DAY) break
      times.add(minutesToTime(minutes))
    }
  }
  return [...times].sort()
}

export function bookableTimesForDay(
  day: OperatingDay,
  stepMinutes = DEFAULT_SLOT_INTERVAL_MINUTES,
): string[] {
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
      .map((row, index) => {
        const note = trimmedGuestNote(row.guest_note)
        return {
          opens_at: normalizeTime(row.opens_at),
          closes_at: normalizeTime(row.closes_at),
          label: row.label ?? null,
          sort_order: row.sort_order ?? index,
          ...(note ? { guest_note: note } : {}),
        }
      })

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
        guest_note: null,
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
        guest_note: trimmedGuestNote(segment.guest_note) ?? null,
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
