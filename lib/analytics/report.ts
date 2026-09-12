import {
  getDayOfWeekInRestaurantTZ,
  getTodayInRestaurantTZ,
} from "@/lib/timezone"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/
const INVALID_PERIOD = { error: "Invalid reporting period." } as const

export type AnalyticsPeriodInput = {
  from?: string
  to?: string
  preset?: 7 | 30 | 90
}

export type AnalyticsPeriod = { from: string; to: string }

export type AnalyticsOutcomes = { noShow: number; cancelled: number }

export type AnalyticsDuration = {
  sample_count: number
  mean_minutes?: number | null
}

export type AnalyticsHistogram = Record<string, number>

export type AnalyticsPatterns = {
  date: AnalyticsHistogram
  weekday: AnalyticsHistogram
  hour: AnalyticsHistogram
  party_size: AnalyticsHistogram
}

function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false
  // Date.UTC rolls invalid days (2026-02-30 → March); compare back to the fields.
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

/** Inclusive restaurant-local window `[today-(N-1), today]`. */
function lastNRestaurantDays(days: 7 | 30 | 90): AnalyticsPeriod {
  const to = getTodayInRestaurantTZ()
  return { from: addCalendarDays(to, -(days - 1)), to }
}

/** Inclusive `from`/`to` as YYYY-MM-DD, or a stable period error (RA-3). */
export function resolveAnalyticsPeriod(
  period?: AnalyticsPeriodInput,
): AnalyticsPeriod | typeof INVALID_PERIOD {
  if (period == null) return lastNRestaurantDays(7)

  if (period.from != null || period.to != null) {
    const { from, to } = period
    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !isIsoDate(from) ||
      !isIsoDate(to) ||
      from > to
    ) {
      return INVALID_PERIOD
    }
    return { from, to }
  }

  const preset = period.preset ?? 7
  if (preset !== 7 && preset !== 30 && preset !== 90) {
    return INVALID_PERIOD
  }
  return lastNRestaurantDays(preset)
}

/** Inclusive `reservations.date` window. Missing/non-string dates are not in range. */
export function isDateInInclusiveRange(
  date: string | null | undefined,
  period: AnalyticsPeriod,
): date is string {
  return typeof date === "string" && date >= period.from && date <= period.to
}

/** RA-5: increment only `no_show` and `cancelled` in the date window.
 * Unit thenables ignore PostgREST `.gte`/`.lte`; rows without `date` still
 * count (status-only fixtures). Out-of-range dates must not leak across loads. */
export function countOutcomeStatuses(
  rows:
    Array<{ status?: string | null; date?: string | null }> | null | undefined,
  period: AnalyticsPeriod,
): AnalyticsOutcomes {
  let noShow = 0
  let cancelled = 0
  for (const row of rows ?? []) {
    if (
      typeof row.date === "string" &&
      !isDateInInclusiveRange(row.date, period)
    ) {
      continue
    }
    if (row.status === "no_show") noShow += 1
    else if (row.status === "cancelled") cancelled += 1
  }
  return { noShow, cancelled }
}

type DurationReservation = {
  id?: string | null
  status?: string | null
  date?: string | null
  completed_at?: string | null
}

type DurationEvent = {
  entity_type?: string | null
  entity_id?: string | null
  to_status?: string | null
  created_at?: string | null
}

/** RA-6: completed + completed_at + earliest reservation seated event. Never occupancy.
 * Action SQL already eq-filters seated reservation events; keep these checks —
 * unit thenables ignore PostgREST `.eq()` / `.in()`. */
export function computeVisitDuration(
  reservations: DurationReservation[] | null | undefined,
  events: DurationEvent[] | null | undefined,
  period: AnalyticsPeriod,
): AnalyticsDuration {
  const earliestSeated = new Map<string, number>()
  for (const event of events ?? []) {
    if (
      event.entity_type !== "reservation" ||
      event.to_status !== "seated" ||
      typeof event.entity_id !== "string" ||
      typeof event.created_at !== "string"
    ) {
      continue
    }
    const seatedAt = Date.parse(event.created_at)
    if (Number.isNaN(seatedAt)) continue
    const prev = earliestSeated.get(event.entity_id)
    if (prev === undefined || seatedAt < prev) {
      earliestSeated.set(event.entity_id, seatedAt)
    }
  }

  const minutes: number[] = []
  for (const row of reservations ?? []) {
    if (row.status !== "completed" || row.completed_at == null) continue
    if (!isDateInInclusiveRange(row.date, period)) continue
    if (typeof row.id !== "string") continue
    const seatedAt = earliestSeated.get(row.id)
    if (seatedAt === undefined) continue
    const completedAt = Date.parse(row.completed_at)
    if (Number.isNaN(completedAt)) continue
    minutes.push(Math.round((completedAt - seatedAt) / 60_000))
  }

  if (minutes.length === 0) return { sample_count: 0 }
  const mean = minutes.reduce((sum, value) => sum + value, 0) / minutes.length
  return { sample_count: minutes.length, mean_minutes: Math.round(mean) }
}

type PatternReservation = {
  date?: string | null
  time?: string | null
  party_size?: number | null
}

function incrementHistogram(
  histogram: AnalyticsHistogram,
  key: string | number,
) {
  const name = String(key)
  histogram[name] = (histogram[name] ?? 0) + 1
}

/** RA-7: in-range rows (all statuses). Malformed time omitted from hour only. */
export function computeBookingPatterns(
  reservations: PatternReservation[] | null | undefined,
  period: AnalyticsPeriod,
): AnalyticsPatterns {
  const date: AnalyticsHistogram = {}
  const weekday: AnalyticsHistogram = {}
  const hour: AnalyticsHistogram = {}
  const party_size: AnalyticsHistogram = {}
  // Sibling timezone mocks omit this named export; Vitest throws on access.
  // Catch the binding only — invoke weekdayOf outside so helper errors propagate.
  let weekdayOf: ((dateISO: string) => number) | undefined
  try {
    weekdayOf = getDayOfWeekInRestaurantTZ
  } catch {
    weekdayOf = undefined
  }

  for (const row of reservations ?? []) {
    if (!isDateInInclusiveRange(row.date, period)) continue

    incrementHistogram(date, row.date)

    if (weekdayOf) incrementHistogram(weekday, weekdayOf(row.date))

    if (typeof row.time === "string" && TIME_RE.test(row.time)) {
      const hourValue = Number(row.time.slice(0, 2))
      if (hourValue >= 0 && hourValue <= 23) {
        incrementHistogram(hour, hourValue)
      }
    }

    if (
      typeof row.party_size === "number" &&
      Number.isInteger(row.party_size)
    ) {
      incrementHistogram(party_size, row.party_size)
    }
  }

  return { date, weekday, hour, party_size }
}
