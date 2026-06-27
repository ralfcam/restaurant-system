/**
 * Timezone utilities for Europe/Zurich (restaurant's local timezone).
 * All date/time operations must reference this timezone to avoid server/client mismatches.
 */

const RESTAURANT_TZ = "Europe/Zurich"

/**
 * Get the current date in the restaurant's local timezone as YYYY-MM-DD.
 */
export function getTodayInRestaurantTZ(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatter.format(now)
}

/**
 * Get the current time in the restaurant's local timezone as HH:MM.
 */
export function getNowTimeInRestaurantTZ(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return formatter.format(now)
}

/**
 * Convert an ISO date string (YYYY-MM-DD) and time string (HH:MM)
 * into a Date object adjusted for the restaurant's timezone.
 */
export function dateTimeToUTC(dateISO: string, timeString: string): Date {
  // Parse as local restaurant time
  const [year, month, day] = dateISO.split("-").map(Number)
  const [hours, minutes] = timeString.split(":").map(Number)

  // Create a date in UTC, then adjust for timezone offset
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

  // The offset is the difference between what UTC thinks and TZ thinks the time is
  const offset = new Date(date.toLocaleString("en-US", { timeZone: RESTAURANT_TZ })).getTime() - date.getTime()

  return new Date(date.getTime() - offset)
}

/**
 * Get the day of the week (0-6) for a given date in the restaurant's timezone.
 * 0 = Sunday, 6 = Saturday
 */
export function getDayOfWeekInRestaurantTZ(dateISO: string): number {
  const [year, month, day] = dateISO.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: RESTAURANT_TZ,
    weekday: "long",
  })

  const dayName = formatter.format(date)
  const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayName)
  return dayIndex >= 0 ? dayIndex : 0
}

/**
 * Check if a time string (HH:MM) is in the past relative to now in the restaurant's timezone.
 * Only returns true if the date is today; returns false for future dates.
 */
export function isTimeInPastRestaurantTZ(dateISO: string, timeString: string): boolean {
  const today = getTodayInRestaurantTZ()
  if (dateISO !== today) return false

  const nowTime = getNowTimeInRestaurantTZ()
  return timeString <= nowTime
}

/**
 * Validate that a booking time falls within the restaurant's operating hours
 * and is not on a blocked date.
 *
 * Returns { valid: boolean, reason?: string }
 */
export function isTimeWithinOperatingHours(
  dateISO: string,
  timeString: string,
  operatingWindow?: { opens_at: string; closes_at: string; is_closed: boolean },
  isBlockedDate?: boolean,
): { valid: boolean; reason?: string } {
  if (isBlockedDate) {
    return { valid: false, reason: "This date is not available" }
  }

  if (!operatingWindow) {
    return { valid: false, reason: "Unable to verify operating hours" }
  }

  if (operatingWindow.is_closed) {
    return { valid: false, reason: "Restaurant is closed on this day" }
  }

  if (timeString < operatingWindow.opens_at || timeString > operatingWindow.closes_at) {
    return {
      valid: false,
      reason: `Reservations are only available between ${operatingWindow.opens_at} and ${operatingWindow.closes_at}`,
    }
  }

  return { valid: true }
}
