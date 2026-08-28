import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { createReservation } from "@/app/actions/reservations"
import type { OperatingDay } from "@/lib/reservations/operating-hours"

const availability = vi.hoisted(() => ({
  isDateBlocked: vi.fn(),
  getOperatingWindowForDate: vi.fn(),
  actual: null as null | typeof import("@/app/actions/availability"),
}))

vi.mock("@/app/actions/availability", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/actions/availability")>()
  availability.actual = actual
  availability.isDateBlocked.mockImplementation((date: string) =>
    actual.isDateBlocked(date),
  )
  availability.getOperatingWindowForDate.mockImplementation((date: string) =>
    actual.getOperatingWindowForDate(date),
  )
  return {
    ...actual,
    isDateBlocked: availability.isDateBlocked,
    getOperatingWindowForDate: availability.getOperatingWindowForDate,
  }
})

// createReservation calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. These tests invoke the server action directly
// (outside Next's runtime) to exercise its database interaction and the
// capacity trigger, so the cache-invalidation side effect is stubbed out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Fixed far-future Wednesday: open 09:00-22:00, never a blocked date by
// default, isolated from real guest traffic and other test runs.
const TEST_DATE = "2027-03-17"
const TEST_TIME = "13:00"

let totalCapacity = 0

async function cleanupTestSlot() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("date", TEST_DATE)
    .eq("time", TEST_TIME)
}

describe.skipIf(!authEnvReady)(
  "createReservation — atomic capacity enforcement",
  () => {
    beforeAll(async () => {
      const supabase = createServiceClient()
      const { data } = await supabase.from("tables").select("seats")
      totalCapacity = (data ?? []).reduce(
        (sum, row) => sum + (row.seats as number),
        0,
      )
      expect(totalCapacity).toBeGreaterThan(0)
      // Guard against leftover rows from a prior interrupted run of this exact
      // fixed test slot — start every run from a known-empty slate.
      await cleanupTestSlot()
    })

    afterEach(async () => {
      const actual = availability.actual
      if (actual) {
        availability.isDateBlocked.mockImplementation((date: string) =>
          actual.isDateBlocked(date),
        )
        availability.getOperatingWindowForDate.mockImplementation(
          (date: string) => actual.getOperatingWindowForDate(date),
        )
      }
      await cleanupTestSlot()
    })

    it("accepts a booking that fits within total capacity", async () => {
      const result = await createReservation({
        guestName: "Integration Test Guest",
        partySize: 2,
        date: TEST_DATE,
        time: TEST_TIME,
        phone: "555-0100",
      })
      expect(result.error).toBeUndefined()
      expect(result.confCode).toMatch(/^TVL-\d{4}$/)
    })

    it("rejects a single booking that exceeds total capacity", async () => {
      const result = await createReservation({
        guestName: "Integration Test Guest",
        partySize: totalCapacity + 1,
        date: TEST_DATE,
        time: TEST_TIME,
        phone: "555-0100",
      })
      // Party size above the online cap is rejected before it ever reaches the
      // capacity trigger — assert on whichever guard actually fires.
      expect(result.confCode).toBe("")
      expect(result.error).toBeTruthy()
    })

    it("rejects a booking against a blocked date", async () => {
      const supabase = createServiceClient()
      await supabase
        .from("blocked_dates")
        .insert({ date: TEST_DATE, reason: "Integration test block" })

      try {
        const result = await createReservation({
          guestName: "Integration Test Guest",
          partySize: 2,
          date: TEST_DATE,
          time: TEST_TIME,
          phone: "555-0100",
        })
        expect(result.confCode).toBe("")
        expect(result.error).toMatch(/not available/i)
      } finally {
        await supabase.from("blocked_dates").delete().eq("date", TEST_DATE)
      }
    })

    it("serializes concurrent bookings so the last compatible unit is only sold once", async () => {
      const supabase = createServiceClient()
      const { data: tables } = await supabase.from("tables").select("seats")
      expect(
        (tables ?? []).filter((row) => (row.seats as number) >= 8),
      ).toHaveLength(1)

      // Real blocked-date / hours round-trips serialize the two INSERTs in one
      // Node process. Instant blocked check + a 2-arrival hours gate so both
      // createReservation calls hit the trigger together; without a lock both
      // read the empty occupying set and both accept the only 8-top.
      const openWednesday: OperatingDay = {
        day_of_week: 3,
        is_closed: false,
        segments: [
          {
            opens_at: "09:00",
            closes_at: "22:00",
            label: null,
            sort_order: 0,
          },
        ],
      }
      availability.isDateBlocked.mockResolvedValue(false)
      const windowWaiters: Array<(day: OperatingDay) => void> = []
      availability.getOperatingWindowForDate.mockImplementation(
        () =>
          new Promise((resolve) => {
            windowWaiters.push(resolve)
            if (windowWaiters.length === 2) {
              for (const release of windowWaiters) release(openWednesday)
            }
          }),
      )

      const [first, second] = await Promise.all([
        createReservation({
          guestName: "Racer One",
          partySize: 8,
          date: TEST_DATE,
          time: TEST_TIME,
          phone: "555-0101",
        }),
        createReservation({
          guestName: "Racer Two",
          partySize: 8,
          date: TEST_DATE,
          time: TEST_TIME,
          phone: "555-0102",
        }),
      ])

      const results = [first, second]
      const succeeded = results.filter((r) => !r.error)
      const failed = results.filter((r) => r.error)

      expect(succeeded).toHaveLength(1)
      expect(failed).toHaveLength(1)
      expect(failed[0].error).toMatch(/fully booked/i)

      const { data: rows } = await supabase
        .from("reservations")
        .select("party_size")
        .eq("date", TEST_DATE)
        .eq("time", TEST_TIME)
        .in("status", ["confirmed", "seated"])
        .eq("party_size", 8)
      expect((rows ?? []).length).toBeLessThanOrEqual(1)
    })
  },
)
