import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { createReservation } from "@/app/actions/reservations"

// createReservation calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. These tests invoke the server action directly
// (outside Next's runtime) to exercise the cover-cap trigger, so the
// cache-invalidation side effect is stubbed out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Distinct from table-fit (2027-07-14), atomic-booking (2027-03-17),
// occupancy-window (2027-06-16), conf-code uniqueness (2027-11-17).
// Far-future Wednesday: seed hours 09:00-22:00, never a blocked date.
const TEST_DATE = "2028-01-05"
const SLOT_TIME = "19:00"
const WEDNESDAY = 3

const seedWeekWindows = [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({
  day_of_week,
  opens_at: day_of_week === 0 ? "00:00" : "09:00",
  closes_at: day_of_week === 0 ? "00:00" : "22:00",
  is_closed: day_of_week === 0,
  label: null,
  sort_order: 0,
}))

const dinnerCoverWindows = seedWeekWindows.map((window) =>
  window.day_of_week === WEDNESDAY
    ? {
        ...window,
        label: "Dinner",
        opens_at: "18:00",
        closes_at: "22:00",
        max_covers: 12,
        bookable_slots: [{ time: SLOT_TIME, max_covers: 12 }],
      }
    : window,
)

async function cleanupTestDate() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().eq("date", TEST_DATE)
}

async function restoreSeedHours() {
  const supabase = createServiceClient()
  await supabase.rpc("replace_operating_windows", {
    p_windows: seedWeekWindows,
  })
}

describe.skipIf(!authEnvReady)(
  "validate_reservation_availability — slot/service cover limits (BW-20)",
  () => {
    beforeAll(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupTestDate()
    })

    afterEach(async () => {
      assertIsolatedHoursMutationTarget()
      await cleanupTestDate()
      await restoreSeedHours()
    })

    it("rejects an occupying insert that would exceed the slot or service cover limit", async () => {
      const supabase = createServiceClient()

      const { error: persistError } = await supabase.rpc(
        "replace_operating_windows",
        { p_windows: dinnerCoverWindows },
      )
      expect(persistError).toBeNull()

      const { data: dinner, error: readError } = await supabase
        .from("operating_windows")
        .select("max_covers, bookable_slots")
        .eq("day_of_week", WEDNESDAY)
        .single()
      expect(readError).toBeNull()
      expect(dinner?.max_covers).toBe(12)
      expect(dinner?.bookable_slots).toEqual([
        { time: SLOT_TIME, max_covers: 12 },
      ])

      const { error: seedError } = await supabase.from("reservations").insert({
        guest_name: "Seed Slot Cap Hold",
        party_size: 8,
        date: TEST_DATE,
        time: SLOT_TIME,
        phone: "555-0000",
        conf_code: `TVL-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "confirmed",
      })
      expect(seedError).toBeNull()

      const denied = await createReservation({
        guestName: "Over Cap Party of 6",
        partySize: 6,
        date: TEST_DATE,
        time: SLOT_TIME,
        phone: "555-0600",
        email: "guest@test.local",
      } as Parameters<typeof createReservation>[0])
      expect(denied.confCode).toBe("")
      expect(denied.error).toBe("Booking denied: This time is fully booked.")

      const inLimit = await createReservation({
        guestName: "In Limit Party of 2",
        partySize: 2,
        date: TEST_DATE,
        time: SLOT_TIME,
        phone: "555-0200",
        email: "guest@test.local",
      } as Parameters<typeof createReservation>[0])
      expect(inLimit.error).toBeUndefined()
      expect(inLimit.confCode).toMatch(/^TVL-\d{4}$/)
    })
  },
)
