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

/** One allowlisted slot time plus optional per-slot cover cap (CL-1 / CL-2). */
type BookableSlot = {
  time: string
  max_covers?: number | null
}

export type OperatingSegment = {
  opens_at: string
  closes_at: string
  label: string | null
  sort_order: number
  /** Present only when non-blank. Persist via flatten as SQL NULL when omitted. */
  guest_note?: string | null
  /** CL-3 / BW-19: null / omitted = no extra service cover cap. */
  max_covers?: number | null
  /** Empty/omitted = every generated time in the segment stays bookable (BW-18). */
  bookable_slots?: BookableSlot[]
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
  /** Always set on flatten (open rows) so replace_operating_windows can store/clear NULL. */
  max_covers?: number | null
  /** Always set on flatten (open rows) so replace_operating_windows can store/clear []. */
  bookable_slots?: BookableSlot[]
}

/**
 * Calendar / widget map value. `is_closed` drives disabled dates;
 * `segments` drive bookable times. Kept as `OperatingWindow` so existing
 * imports from availability actions keep compiling.
 */
export type OperatingWindow = OperatingDay

export const SUGGESTED_SEGMENTS: ReadonlyArray<
  Omit<OperatingSegment, "sort_order">
> = [
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

export const DEFAULT_OPERATING_DAYS: OperatingDay[] = DAY_NAMES.map(
  (_, day_of_week) =>
    day_of_week === 0
      ? { day_of_week, is_closed: true, segments: [] }
      : {
          day_of_week,
          is_closed: false,
          segments: [{ ...DEFAULT_OPEN_SEGMENT }],
        },
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

/** Display clock after adding minutes, wrapping modulo 24h (never `24:30`). */
function addMinutesWrapped(start: string, addedMinutes: number): string {
  return minutesToTime(wrapMinutesOfDay(timeToMinutes(start) + addedMinutes))
}

/**
 * BW-2 until-badge: start plus occupancy duration (default 90), wrapping
 * modulo 24h (never `24:30`). Does not add the safety buffer.
 */
export function slotUntilTime(
  start: string,
  occupancyDurationMinutes: number = DEFAULT_EXPECTED_MINUTES,
): string {
  return addMinutesWrapped(start, occupancyDurationMinutes)
}

export const MIN_SAFETY_BUFFER_MINUTES = 0
export const MAX_SAFETY_BUFFER_MINUTES = 60
export const SAFETY_BUFFER_STEP_MINUTES = 5
export const DEFAULT_SAFETY_BUFFER_MINUTES = 15

/**
 * BW-9 next-bookable instant: start plus occupancy plus safety buffer
 * (defaults 90 + 15), wrapping modulo 24h. Separate from the until-badge.
 */
export function nextBookableTime(
  start: string,
  occupancyDurationMinutes: number = DEFAULT_EXPECTED_MINUTES,
  safetyBufferMinutes: number = DEFAULT_SAFETY_BUFFER_MINUTES,
): string {
  return addMinutesWrapped(
    start,
    occupancyDurationMinutes + safetyBufferMinutes,
  )
}

/**
 * BW-11: safety buffer is 0–60 inclusive, step 5. Invalid including NaN
 * and values outside that range → 15 (unlike occupancy, which bound-clamps
 * via `clampExpectedMinutes` in table-use — no second 30–240 helper here).
 */
export function clampSafetyBufferMinutes(minutes: number): number {
  if (
    !Number.isFinite(minutes) ||
    minutes < MIN_SAFETY_BUFFER_MINUTES ||
    minutes > MAX_SAFETY_BUFFER_MINUTES
  ) {
    return DEFAULT_SAFETY_BUFFER_MINUTES
  }
  return (
    Math.round(minutes / SAFETY_BUFFER_STEP_MINUTES) *
    SAFETY_BUFFER_STEP_MINUTES
  )
}

/** Inclusive: both `opens_at` and `closes_at` are bookable instants. */
function segmentContainsTimeInclusive(
  segment: OperatingSegment,
  time: string,
): boolean {
  return (
    time >= normalizeTime(segment.opens_at) &&
    time <= normalizeTime(segment.closes_at)
  )
}

/**
 * Whether `time` is bookable in any segment. Booking validation stays inclusive
 * (both endpoints) because slot generation emits `closes_at` (`minutes <= end`)
 * and the last slot of the day (e.g. Dinner 22:00) must remain bookable.
 * Exclusive grouping is assignment-only — see `assignSegmentForTime`.
 */
export function isTimeWithinSegments(
  time: string,
  segments: OperatingSegment[],
): boolean {
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
  const containing = segments.filter((segment) =>
    segmentContainsTimeInclusive(segment, t),
  )
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

/** OH-NOTE-SAVE: max length of a trimmed non-empty `guest_note` (JS string characters). */
export const MAX_GUEST_NOTE_LENGTH = 240

/** Blank/whitespace → undefined so guest payloads omit the key (BW-4). Persist with `?? null`. */
function trimmedGuestNote(
  value: string | null | undefined,
): string | undefined {
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

const HOURS_SUMMARY_COPY = {
  en: {
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    closed: "Closed",
    unavailable: "Hours unavailable",
  },
  fr: {
    shortDays: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
    closed: "Fermé",
    unavailable: "Horaires indisponibles",
  },
} as const
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const

function hoursCopyLocale(locale: string): keyof typeof HOURS_SUMMARY_COPY {
  return locale === "fr" ? "fr" : "en"
}

/**
 * Builds a compact, guest-facing weekly summary from the operational schedule.
 * Consecutive Monday-first days with identical hours are grouped together.
 */
export function summarizeOperatingDays(
  days: OperatingDay[],
  locale: string,
): string {
  const copy = HOURS_SUMMARY_COPY[hoursCopyLocale(locale)]
  if (days.length === 0) return copy.unavailable

  const { shortDays, closed } = copy
  const byDay = new Map(days.map((day) => [day.day_of_week, day]))
  const ordered = MONDAY_FIRST.map((dayOfWeek) => {
    const day = byDay.get(dayOfWeek)
    const summary =
      !day || day.is_closed || day.segments.length === 0
        ? closed
        : formatSegmentsSummary(day.segments)
    return { dayOfWeek, summary }
  })

  const groups: Array<{ start: number; end: number; summary: string }> = []
  for (const entry of ordered) {
    const previous = groups.at(-1)
    if (previous?.summary === entry.summary) {
      previous.end = entry.dayOfWeek
    } else {
      groups.push({
        start: entry.dayOfWeek,
        end: entry.dayOfWeek,
        summary: entry.summary,
      })
    }
  }

  return groups
    .map(({ start, end, summary }) => {
      const daysLabel =
        start === end
          ? shortDays[start]
          : `${shortDays[start]}–${shortDays[end]}`
      return `${daysLabel} · ${summary}`
    })
    .join("; ")
}

export const ALLOWED_SLOT_INTERVALS = [15, 30, 60] as const
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30
export type SlotIntervalMinutes = (typeof ALLOWED_SLOT_INTERVALS)[number]

/** BW-3: guest slot spacing is 15, 30, or 60 minutes; anything else is 30. */
export function clampSlotIntervalMinutes(minutes: number): SlotIntervalMinutes {
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

/**
 * BW-18 / BW-19 guest formula (BW-21). Empty `bookableSlots` is not an
 * allowlist; null maxima add no extra cap. Occupancy sums are supplied by
 * the caller (exact-time slot; all-day service assignment).
 */
export function coversFitSlotAndService(input: {
  time: string
  partySize: number
  bookableSlots: readonly BookableSlot[]
  serviceMaxCovers: number | null
  occupyingCoversAtTime: number
  occupyingCoversInService: number
}): boolean {
  const time = normalizeTime(input.time)
  const allowlistEntry = input.bookableSlots.find(
    (slot) => normalizeTime(slot.time) === time,
  )
  if (input.bookableSlots.length > 0 && allowlistEntry == null) return false
  const slotMax = allowlistEntry?.max_covers
  if (
    slotMax != null &&
    input.occupyingCoversAtTime + input.partySize > slotMax
  ) {
    return false
  }
  if (
    input.serviceMaxCovers != null &&
    input.occupyingCoversInService + input.partySize > input.serviceMaxCovers
  ) {
    return false
  }
  return true
}

export function lastBookableTime(day: OperatingDay | undefined): string | null {
  if (!day || day.is_closed || day.segments.length === 0) return null
  return day.segments.reduce((latest, segment) => {
    const close = normalizeTime(segment.closes_at)
    return close > latest ? close : latest
  }, "00:00")
}

export function nextSuggestedSegment(
  existing: OperatingSegment[],
): OperatingSegment {
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

/** CL-2 / CL-3: omit or null is no extra cap; reject 0, negatives, and non-integers. */
function isInvalidCoverMax(value: number | null | undefined): boolean {
  return value != null && (!Number.isInteger(value) || value < 1)
}

/** Catalog key, or a key plus ICU params when the message names a day or limit. */
export type SchedulingMessage =
  string | { key: string; params: Record<string, string | number> }

function schedulingMessage(
  key: string,
  params?: Record<string, string | number>,
): SchedulingMessage {
  return params === undefined ? key : { key, params }
}

export function validateOperatingDays(
  days: OperatingDay[],
  slotIntervalMinutes?: number,
): SchedulingMessage | null {
  const interval = clampSlotIntervalMinutes(
    slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
  )
  if (days.length !== 7) return "errors.scheduling.weekRequired"

  const seen = new Set<number>()
  for (const day of days) {
    if (day.day_of_week < 0 || day.day_of_week > 6) {
      return "errors.scheduling.invalidDay"
    }
    if (seen.has(day.day_of_week)) return "errors.scheduling.duplicateDay"
    seen.add(day.day_of_week)

    if (day.is_closed) continue

    const dayName = DAY_NAMES[day.day_of_week]

    if (day.segments.length === 0) {
      return schedulingMessage("errors.scheduling.openWithoutSegments", {
        day: dayName,
      })
    }

    for (const segment of day.segments) {
      const note = trimmedGuestNote(segment.guest_note)
      if (note && note.length > MAX_GUEST_NOTE_LENGTH) {
        return schedulingMessage("errors.scheduling.guestNoteTooLong", {
          max: MAX_GUEST_NOTE_LENGTH,
        })
      }
    }

    const ranges = day.segments.map((segment) => ({
      start: normalizeTime(segment.opens_at),
      end: normalizeTime(segment.closes_at),
    }))

    for (const range of ranges) {
      if (!TIME_RE.test(range.start) || !TIME_RE.test(range.end)) {
        return schedulingMessage("errors.scheduling.invalidSegmentTime", {
          day: dayName,
        })
      }
      if (range.start >= range.end) {
        return schedulingMessage("errors.scheduling.closesBeforeOpen", {
          day: dayName,
        })
      }
    }

    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].start < sorted[i - 1].end) {
        return schedulingMessage("errors.scheduling.overlapping", {
          day: dayName,
        })
      }
    }

    // CL-1: non-empty bookable_slots — HH:MM, [opens, closes), interval grid from opens.
    // Empty/omitted list stays valid (BW-5 generated times). Duplicates are not rejected here.
    for (const segment of day.segments) {
      if (isInvalidCoverMax(segment.max_covers)) {
        return schedulingMessage("errors.scheduling.invalidServiceMax", {
          day: dayName,
        })
      }
      const slots = segment.bookable_slots
      if (!slots || slots.length === 0) continue
      const opens = timeToMinutes(segment.opens_at)
      const closes = timeToMinutes(segment.closes_at)
      for (const slot of slots) {
        const slotTime = normalizeTime(slot.time)
        if (!TIME_RE.test(slotTime)) {
          return schedulingMessage("errors.scheduling.invalidSlotTime", {
            day: dayName,
          })
        }
        const minutes = timeToMinutes(slotTime)
        if (minutes < opens || minutes >= closes) {
          return schedulingMessage("errors.scheduling.slotOutsideWindow", {
            day: dayName,
          })
        }
        if ((minutes - opens) % interval !== 0) {
          return schedulingMessage("errors.scheduling.slotOffGrid", {
            day: dayName,
            interval,
          })
        }
        if (isInvalidCoverMax(slot.max_covers)) {
          return schedulingMessage("errors.scheduling.invalidSlotMax", {
            day: dayName,
          })
        }
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
        return normalizeTime(a.opens_at).localeCompare(
          normalizeTime(b.opens_at),
        )
      })
      .map((row, index) => {
        const note = trimmedGuestNote(row.guest_note)
        return {
          opens_at: normalizeTime(row.opens_at),
          closes_at: normalizeTime(row.closes_at),
          label: row.label ?? null,
          sort_order: row.sort_order ?? index,
          ...(note ? { guest_note: note } : {}),
          ...(row.max_covers != null ? { max_covers: row.max_covers } : {}),
          ...(row.bookable_slots?.length
            ? { bookable_slots: row.bookable_slots }
            : {}),
        }
      })

    return {
      day_of_week: seed.day_of_week,
      is_closed: false,
      segments,
    }
  })
}

/**
 * Flat ledger rows for `replace_operating_windows`. Open segments always
 * emit `max_covers` (NULL if omitted) and `bookable_slots` ([] if omitted)
 * so staff Save can persist or clear both columns.
 */
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
        max_covers: segment.max_covers ?? null,
        bookable_slots: segment.bookable_slots ?? [],
      })
    })
  }
  return rows
}

export function daysToWindowsMap(
  days: OperatingDay[],
): Record<number, OperatingDay> {
  const map: Record<number, OperatingDay> = {}
  for (const day of days) map[day.day_of_week] = day
  return map
}
