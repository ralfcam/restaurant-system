/**
 * Pure daily-queue capacity policy for /dispatch.
 *
 * Existing Todo issues in the live current cycle count before any Backlog
 * activation. Bounds come from `.cursor/harness.json` `dispatch`.
 * Live Linear I/O and issue ranking stay in dispatch.md.
 */
import { dailyQueueBounds, loadHarnessConfig } from "./harness-config.mjs"

const shipped = dailyQueueBounds(loadHarnessConfig())
export const DAILY_QUEUE_MINIMUM = shipped.minimum
export const DAILY_QUEUE_MAXIMUM = shipped.maximum

function requireCount(name, value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer`)
  }
}

export function calculateDailyQueueCapacity(activeCount, eligibleCount, bounds) {
  requireCount("activeCount", activeCount)
  requireCount("eligibleCount", eligibleCount)
  const minimum = bounds?.minimum ?? DAILY_QUEUE_MINIMUM
  const maximum = bounds?.maximum ?? DAILY_QUEUE_MAXIMUM
  requireCount("minimum", minimum)
  requireCount("maximum", maximum)

  const availableSlots = Math.max(0, maximum - activeCount)
  const activationCount = Math.min(eligibleCount, availableSlots)
  const projectedActiveCount = activeCount + activationCount

  return {
    activeCount,
    eligibleCount,
    availableSlots,
    activationCount,
    projectedActiveCount,
    shortfall: Math.max(0, minimum - projectedActiveCount),
    overCapacity: activeCount > maximum,
    overage: Math.max(0, activeCount - maximum),
  }
}
