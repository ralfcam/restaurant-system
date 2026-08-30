import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { createReservation } from "@/app/actions/reservations"

// createReservation calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. These tests invoke the server action directly
// (outside Next's runtime) to exercise the occupancy trigger, so the
// cache-invalidation side effect is stubbed out.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Distinct from atomic-booking.integ.test.ts (2027-03-17) and
// public-privileges.integ.test.ts (2027-04-21). Far-future Wednesday:
// seed hours 09:00-22:00, never a blocked date by default.
const TEST_DATE = "2027-06-16"
const HOLD_TIME = "19:00"

let totalCapacity = 0

async function cleanupTestDate() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().eq("date", TEST_DATE)
}

function guestPayload(time: string) {
  return {
    guestName: "Occupancy Window Guest",
    partySize: 2,
    date: TEST_DATE,
    time,
    phone: "555-0200",
    email: "guest@test.local",
  } as Parameters<typeof createReservation>[0]
}

describe.skipIf(!authEnvReady)(
  "validate_reservation_availability — occupancy window",
  () => {
    beforeAll(async () => {
      const supabase = createServiceClient()
      const { data } = await supabase.from("tables").select("seats")
      totalCapacity = (data ?? []).reduce(
        (sum, row) => sum + (row.seats as number),
        0,
      )
      expect(totalCapacity).toBeGreaterThan(8)
      await cleanupTestDate()
    })

    afterEach(async () => {
      await cleanupTestDate()
    })

    it("rejects 20:30 against a full-floor 19:00 confirmed hold, accepts 20:45, and accepts 20:30 after the hold is completed", async () => {
      const supabase = createServiceClient()
      const { data: floorTables, error: tablesError } = await supabase
        .from("tables")
        .select("label, seats")
      expect(tablesError).toBeNull()
      expect(floorTables?.length).toBeGreaterThan(0)

      const occupying = (floorTables ?? []).map((row, i) => ({
        guest_name: `Seed Occupancy Hold ${row.label}`,
        party_size: row.seats as number,
        date: TEST_DATE,
        time: HOLD_TIME,
        phone: "555-0000",
        conf_code: `TVL-${String(6100 + i).padStart(4, "0")}`,
        status: "confirmed" as const,
      }))
      expect(occupying.reduce((sum, row) => sum + row.party_size, 0)).toBe(
        totalCapacity,
      )

      const { data: seeded, error: seedError } = await supabase
        .from("reservations")
        .insert(occupying)
        .select("id")
      expect(seedError).toBeNull()
      expect(seeded?.length).toBe(occupying.length)

      const blocked = await createReservation(guestPayload("20:30"))
      expect(blocked.confCode).toBe("")
      expect(blocked.error).toBeTruthy()

      const nextSlot = await createReservation(guestPayload("20:45"))
      expect(nextSlot.error).toBeUndefined()
      expect(nextSlot.confCode).toMatch(/^TVL-\d{4}$/)

      const { error: completeError } = await supabase
        .from("reservations")
        .update({ status: "completed" })
        .in(
          "id",
          seeded!.map((row) => row.id),
        )
      expect(completeError).toBeNull()

      const released = await createReservation(guestPayload("20:30"))
      expect(released.error).toBeUndefined()
      expect(released.confCode).toMatch(/^TVL-\d{4}$/)
    })
  },
)
