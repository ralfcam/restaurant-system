/**
 * Monday-first weekly service-availability model for the staff Dashboard.
 * Pure: seven restaurant-calendar days from a selected YYYY-MM-DD plus
 * that weekday's configured opening-hour segments (WA-1). Blank/whitespace
 * service labels use the BW-4 time-range fallback (WA-2). Service status
 * is available / fully_booked from existing SlotAvailability flags grouped
 * with assignSegmentForTime (WA-3 / WA-4) — no second cover formula.
 * shiftSelectedWeek adds weekDelta × 7 calendar days on the YYYY-MM-DD
 * (already restaurant-local) and does not snap to Monday (WA-5).
 * Reload is a fresh call with a new slotsByDate (WA-6) — no memo.
 */

import type { SlotAvailability } from "@/app/actions/reservations"
import {
  assignSegmentForTime,
  normalizeTime,
  type OperatingDay,
  type OperatingSegment,
} from "@/lib/reservations/operating-hours"

type ServiceStatus = "available" | "fully_booked"

export type WeeklyOverviewDay = {
  date: string
  services: Array<{ label: string; status: ServiceStatus }>
}

/** Add `weekDelta` × 7 calendar days to a YYYY-MM-DD. Does not snap to Monday. */
export function shiftSelectedWeek(date: string, weekDelta: number): string {
  return addCalendarDays(date, weekDelta * 7)
}

export function buildWeeklyServiceOverview({
  selectedDate,
  operatingDays,
  slotsByDate,
}: {
  selectedDate: string
  operatingDays: OperatingDay[]
  slotsByDate?: Record<string, SlotAvailability[]>
}): { days: WeeklyOverviewDay[] } {
  const byWeekday = new Map(operatingDays.map((day) => [day.day_of_week, day]))
  const monday = mondayContaining(selectedDate)

  return {
    days: Array.from({ length: 7 }, (_, offset) => {
      const date = addCalendarDays(monday, offset)
      return {
        date,
        services: configuredServices(
          byWeekday.get(weekdayOfIsoDate(date)),
          slotsByDate?.[date] ?? [],
        ),
      }
    }),
  }
}

function configuredServices(
  operating: OperatingDay | undefined,
  slots: SlotAvailability[],
): WeeklyOverviewDay["services"] {
  if (!operating || operating.is_closed || operating.segments.length === 0) {
    return []
  }
  return operating.segments.map((segment) => ({
    label:
      segment.label?.trim() ||
      `${normalizeTime(segment.opens_at)}–${normalizeTime(segment.closes_at)}`,
    status: statusFromExistingFlags(segment, operating.segments, slots),
  }))
}

function statusFromExistingFlags(
  segment: OperatingSegment,
  segments: OperatingSegment[],
  slots: SlotAvailability[],
): ServiceStatus {
  // assignSegmentForTime returns the input segment (same identity as groupBookableSlots).
  const hasBookableSlot = slots.some(
    (slot) =>
      slot.available && assignSegmentForTime(slot.time, segments) === segment,
  )
  return hasBookableSlot ? "available" : "fully_booked"
}

function weekdayOfIsoDate(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

function addCalendarDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

function mondayContaining(iso: string): string {
  const weekday = weekdayOfIsoDate(iso)
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1
  return addCalendarDays(iso, -daysFromMonday)
}
