import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { transitionReservationStatus } from "@/app/actions/reservations"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { createServiceClient } from "@/lib/supabase/service"
import { authEnvReady } from "../helpers/env"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

// transitionReservationStatus calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. These tests invoke the server action directly
// (outside Next's runtime), so the cache-invalidation side effect is stubbed.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Distinct from cover-limits (2028-01-05) and other reservation integ dates.
// Far-future Wednesday: seed hours 09:00-22:00, never a blocked date.
const TEST_DATE = "2028-01-12"
const CONF_CODE = "TVL-6712"
const GUEST_NAME = "C1 no-show persist"

async function cleanupTestDate() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().eq("date", TEST_DATE)
}

describe.skipIf(!authEnvReady)("reservation status transitions", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupTestDate()
  })

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupTestDate()
  })

  it("staff confirmed to no_show persists after refresh", async () => {
    const supabase = createServiceClient()
    const { data: seeded, error: seedError } = await supabase
      .from("reservations")
      .insert({
        guest_name: GUEST_NAME,
        party_size: 2,
        date: TEST_DATE,
        time: "19:00",
        phone: "555-6712",
        email: "c1-noshow@example.test",
        conf_code: CONF_CODE,
        status: "confirmed",
      })
      .select("id")
      .single()
    expect(seedError).toBeNull()
    expect(seeded?.id).toBeTruthy()

    const result = await transitionReservationStatus(seeded!.id, "no_show")
    expect(result.error).toBeUndefined()
    expect(result.error).not.toBe("Could not update reservation status.")

    const { data: refreshed, error: readError } = await supabase
      .from("reservations")
      .select("status")
      .eq("id", seeded!.id)
      .single()
    expect(readError).toBeNull()
    expect(refreshed?.status).toBe("no_show")
  })
})
