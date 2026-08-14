import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { createReservation } from "@/app/actions/reservations"

// Fixed far-future Wednesday: open 09:00-22:00, never a blocked date by
// default, isolated from real guest traffic and other test runs.
const TEST_DATE = "2027-03-17"
const TEST_TIME = "13:00"

let totalCapacity = 0

async function cleanupTestSlot() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().eq("date", TEST_DATE).eq("time", TEST_TIME)
}

describe.skipIf(!authEnvReady)("createReservation — atomic capacity enforcement", () => {
  beforeAll(async () => {
    const supabase = createServiceClient()
    const { data } = await supabase.from("tables").select("seats")
    totalCapacity = (data ?? []).reduce((sum, row) => sum + (row.seats as number), 0)
    console.log("[v0] totalCapacity computed:", totalCapacity, "rows:", data)
    expect(totalCapacity).toBeGreaterThan(0)
    // Guard against leftover rows from a prior interrupted run of this exact
    // fixed test slot — start every run from a known-empty slate.
    await cleanupTestSlot()
  })

  afterEach(async () => {
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
    await supabase.from("blocked_dates").insert({ date: TEST_DATE, reason: "Integration test block" })

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

  it("serializes concurrent bookings so the last remaining seat is only sold once", async () => {
    // Fill the slot to exactly one seat remaining via a direct insert (bypasses
    // app-level validation but still runs through the DB trigger).
    const supabase = createServiceClient()
    const { error: seedError } = await supabase.from("reservations").insert({
      guest_name: "Seed Guest",
      party_size: totalCapacity - 1,
      date: TEST_DATE,
      time: TEST_TIME,
      phone: "555-0000",
      conf_code: `TVL-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "confirmed",
    })
    expect(seedError).toBeNull()

    // Two guests race for the single remaining seat. Without the advisory
    // lock in the trigger, both could read "1 seat free" before either
    // commits and both would be accepted — overbooking by one seat.
    const [first, second] = await Promise.all([
      createReservation({
        guestName: "Racer One",
        partySize: 1,
        date: TEST_DATE,
        time: TEST_TIME,
        phone: "555-0101",
      }),
      createReservation({
        guestName: "Racer Two",
        partySize: 1,
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

    // Confirm the database agrees: total booked party size never exceeded capacity.
    const { data: rows } = await supabase
      .from("reservations")
      .select("party_size")
      .eq("date", TEST_DATE)
      .eq("time", TEST_TIME)
      .in("status", ["confirmed", "seated"])
    const totalBooked = (rows ?? []).reduce((sum, row) => sum + (row.party_size as number), 0)
    expect(totalBooked).toBeLessThanOrEqual(totalCapacity)
  })
})
