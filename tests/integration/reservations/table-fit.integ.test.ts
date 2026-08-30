import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { createReservation } from "@/app/actions/reservations"

// createReservation calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. These tests invoke the server action directly
// (outside Next's runtime) to exercise the table-fit trigger, so the
// cache-invalidation side effect is stubbed out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Distinct from atomic-booking.integ.test.ts (2027-03-17) and
// occupancy-window.integ.test.ts (2027-06-16). Far-future Wednesday:
// seed hours 09:00-22:00, never a blocked date by default.
const TEST_DATE = "2027-07-14"
const HOLD_TIME = "19:00"

async function cleanupTestDate() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().eq("date", TEST_DATE)
}

describe.skipIf(!authEnvReady)(
  "validate_reservation_availability — table-fit (BW-12)",
  () => {
    beforeAll(async () => {
      const supabase = createServiceClient()
      const { data } = await supabase.from("tables").select("seats")
      const seats = (data ?? []).map((row) => row.seats as number)
      const totalCapacity = seats.reduce((sum, n) => sum + n, 0)
      expect(Math.max(...seats)).toBe(8)
      expect(seats.filter((n) => n >= 8)).toHaveLength(1)
      expect(totalCapacity).toBeGreaterThan(16)
      await cleanupTestDate()
    })

    afterEach(async () => {
      await cleanupTestDate()
    })

    it("rejects a second overlapping party of 8 when the only 8-top is already held, with P0001 fully booked and no table_label on a successful small-party insert", async () => {
      const supabase = createServiceClient()
      const { error: seedError } = await supabase.from("reservations").insert({
        guest_name: "Seed 8-top Hold",
        party_size: 8,
        date: TEST_DATE,
        time: HOLD_TIME,
        phone: "555-0000",
        conf_code: `TVL-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "confirmed",
      })
      expect(seedError).toBeNull()

      const denied = await createReservation({
        guestName: "Second Party of 8",
        partySize: 8,
        date: TEST_DATE,
        time: HOLD_TIME,
        phone: "555-0800",
        email: "guest@test.local",
      } as Parameters<typeof createReservation>[0])
      expect(denied.confCode).toBe("")
      expect(denied.error).toMatch(/fully booked/i)

      const small = await createReservation({
        guestName: "Small Party",
        partySize: 2,
        date: TEST_DATE,
        time: HOLD_TIME,
        phone: "555-0200",
        email: "guest@test.local",
      } as Parameters<typeof createReservation>[0])
      expect(small.error).toBeUndefined()
      expect(small.confCode).toMatch(/^TVL-\d{4}$/)

      const { data: row } = await supabase
        .from("reservations")
        .select("table_label")
        .eq("date", TEST_DATE)
        .eq("conf_code", small.confCode)
        .single()
      expect(row?.table_label).toBeNull()
    })
  },
)
