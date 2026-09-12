import { createHash } from "node:crypto"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { getReservationAnalytics } from "@/app/actions/analytics"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { authEnvReady } from "../helpers/env"

function isPermissionError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  const code = error.code ?? ""
  const message = error.message ?? ""
  return (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|row-level security|not authorized|unauthorized|forbidden/i.test(
      message,
    )
  )
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

const ANALYTICS_TABLES = ["reservations", "tables", "status_events"] as const

// Distinct from public-privileges (2027-04-21 / 2027-10-13), atomic-booking
// (2027-03-17), occupancy-window (2027-06-16), table-fit (2027-07-14),
// review-email-pii (2027-08-18), review-email-schema (2027-09-09),
// conf-code (2027-11-17 / 2027-11-24). Far-future Wednesday, open hours.
const TEST_DATE = "2027-12-08"
const TEST_TIME = "19:00"
const COMPLETED_CONF = "TVL-9201"
const CANCELLED_CONF = "TVL-9202"
const GUEST_SELECT_CONF = "TVL-9203"
const GUEST_PHONE = "555-9201"
const EVENT_REASON = "ra2-readonly-fixture"
const COMPLETED_AT = "2027-12-08T21:00:00.000Z"
const SEATED_AT = "2027-12-08T19:15:00.000Z"

type TableSnapshot = {
  counts: Record<(typeof ANALYTICS_TABLES)[number], number>
  checksums: Record<(typeof ANALYTICS_TABLES)[number], string>
}

async function cleanupFixture() {
  const supabase = createServiceClient()
  const { data: rows } = await supabase
    .from("reservations")
    .select("id")
    .eq("date", TEST_DATE)
  const ids = (rows ?? []).map((row) => row.id as string)
  if (ids.length > 0) {
    await supabase
      .from("status_events")
      .delete()
      .eq("entity_type", "reservation")
      .in("entity_id", ids)
  }
  await supabase.from("status_events").delete().eq("reason", EVENT_REASON)
  await supabase.from("reservations").delete().eq("date", TEST_DATE)
}

async function snapshotAnalyticsTables(): Promise<TableSnapshot> {
  const supabase = createServiceClient()
  const counts = {} as TableSnapshot["counts"]
  const checksums = {} as TableSnapshot["checksums"]
  for (const table of ANALYTICS_TABLES) {
    const { data, error } = await supabase.from(table).select("*").order("id")
    expect(error).toBeNull()
    const rows = data ?? []
    counts[table] = rows.length
    checksums[table] = createHash("sha256")
      .update(JSON.stringify(rows))
      .digest("hex")
  }
  return { counts, checksums }
}

describe.skipIf(!authEnvReady)("analytics RA-2 read-only", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupFixture()
  })

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupFixture()
  })

  it("analytics request does not modify reservations tables or status_events", async () => {
    const supabase = createServiceClient()

    // RES-67: reservations.status CHECK excludes no_show; do not insert it.
    const { data: inserted, error: insertError } = await supabase
      .from("reservations")
      .insert([
        {
          guest_name: "Analytics Read-Only Completed",
          party_size: 2,
          date: TEST_DATE,
          time: TEST_TIME,
          phone: GUEST_PHONE,
          email: "ra2-completed@example.test",
          notes: EVENT_REASON,
          conf_code: COMPLETED_CONF,
          status: "completed",
          completed_at: COMPLETED_AT,
        },
        {
          guest_name: "Analytics Read-Only Cancelled",
          party_size: 2,
          date: TEST_DATE,
          time: "20:00",
          phone: GUEST_PHONE,
          email: "ra2-cancelled@example.test",
          notes: EVENT_REASON,
          conf_code: CANCELLED_CONF,
          status: "cancelled",
        },
      ])
      .select("id, conf_code")
    expect(insertError).toBeNull()
    const completed = inserted?.find((row) => row.conf_code === COMPLETED_CONF)
    expect(completed?.id).toEqual(expect.any(String))

    const { error: eventError } = await supabase.from("status_events").insert({
      entity_type: "reservation",
      entity_id: completed!.id,
      from_status: "confirmed",
      to_status: "seated",
      reason: EVENT_REASON,
      created_at: SEATED_AT,
    })
    expect(eventError).toBeNull()

    const before = await snapshotAnalyticsTables()
    expect(before.counts.reservations).toBeGreaterThan(0)
    expect(before.counts.status_events).toBeGreaterThan(0)

    const result = await getReservationAnalytics({
      from: TEST_DATE,
      to: TEST_DATE,
    })
    expect(result).not.toHaveProperty("error")

    const after = await snapshotAnalyticsTables()
    expect(after.counts).toEqual(before.counts)
    expect(after.checksums).toEqual(before.checksums)
  })

  it("analytics does not grant guest SELECT on reservations or status_events", async () => {
    const supabase = createServiceClient()
    const { data: inserted, error: insertError } = await supabase
      .from("reservations")
      .insert({
        guest_name: "Analytics Guest Select",
        party_size: 2,
        date: TEST_DATE,
        time: TEST_TIME,
        phone: GUEST_PHONE,
        email: "ra9-guest-select@example.test",
        notes: EVENT_REASON,
        conf_code: GUEST_SELECT_CONF,
        status: "confirmed",
      })
      .select("id")
      .maybeSingle()
    expect(insertError).toBeNull()
    expect(inserted?.id).toEqual(expect.any(String))

    const { error: eventError } = await supabase.from("status_events").insert({
      entity_type: "reservation",
      entity_id: inserted!.id,
      from_status: "confirmed",
      to_status: "seated",
      reason: EVENT_REASON,
    })
    expect(eventError).toBeNull()

    const result = await getReservationAnalytics({
      from: TEST_DATE,
      to: TEST_DATE,
    })
    expect(result).not.toHaveProperty("error")

    const anon = createClient()
    const { data: reservationRows, error: reservationError } = await anon
      .from("reservations")
      .select()
    expect(reservationRows ?? []).toHaveLength(0)
    expect(isPermissionError(reservationError)).toBe(true)

    const { data: eventRows, error: eventErrorAfterLoad } = await anon
      .from("status_events")
      .select()
    expect(eventRows ?? []).toHaveLength(0)
    expect(isPermissionError(eventErrorAfterLoad)).toBe(true)
  })
})
