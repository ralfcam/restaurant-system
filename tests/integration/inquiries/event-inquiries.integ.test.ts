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
import { createInquiry, updateInquiryStatus } from "@/app/actions/inquiries"
import {
  getAvailableSlots,
  getReservationsByDate,
} from "@/app/actions/reservations"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

const GUEST_NAME = "EI-2 CHECK probe"
const REQUESTED_DATE = "2027-12-15"

async function cleanupProbeRows() {
  const supabase = createServiceClient()
  await supabase.from("event_inquiries").delete().eq("guest_name", GUEST_NAME)
}

describe.skipIf(!authEnvReady)("event_inquiries schema CHECKs", () => {
  beforeAll(() => {
    assertIsolatedHoursMutationTarget()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupProbeRows()
  })

  it("rejects blank contact and party_size below 1", async () => {
    const supabase = createServiceClient()
    const base = {
      guest_name: GUEST_NAME,
      requested_date: REQUESTED_DATE,
      party_size: 12,
      kind: "group",
      notes: "EI-2 CHECK probe",
    }

    const { error: blankContact } = await supabase
      .from("event_inquiries")
      .insert({ ...base, email: null, phone: null })
    expect(blankContact).not.toBeNull()
    expect(blankContact?.code).toBe("23514")

    const { error: whitespaceContact } = await supabase
      .from("event_inquiries")
      .insert({ ...base, email: "   ", phone: "   " })
    expect(whitespaceContact).not.toBeNull()
    expect(whitespaceContact?.code).toBe("23514")

    const { error: partySizeZero } = await supabase
      .from("event_inquiries")
      .insert({
        ...base,
        email: "ei2-probe@example.com",
        phone: null,
        party_size: 0,
      })
    expect(partySizeZero).not.toBeNull()
    expect(partySizeZero?.code).toBe("23514")
  })
})

const ISOLATION_GUEST = "EI-7 isolation probe"
// Far-future Wednesday: seed hours 09:00-22:00. Distinct from C2 CHECK
// (2027-12-15) and analytics RA-2 (2027-12-08).
const ISOLATION_DATE = "2027-12-22"

async function snapshotReservations() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .order("id")
  expect(error).toBeNull()
  const rows = data ?? []
  return {
    count: rows.length,
    checksum: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
  }
}

async function cleanupIsolationProbe() {
  const supabase = createServiceClient()
  await supabase
    .from("event_inquiries")
    .delete()
    .eq("guest_name", ISOLATION_GUEST)
  await supabase.from("reservations").delete().eq("guest_name", ISOLATION_GUEST)
}

describe.skipIf(!authEnvReady)("event_inquiries occupancy isolation", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupIsolationProbe()
  })

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupIsolationProbe()
  })

  it("inquiry rows do not occupy covers or appear on reservations", async () => {
    const supabase = createServiceClient()
    const before = await snapshotReservations()
    const beforeSlots = await getAvailableSlots(ISOLATION_DATE, 8)
    expect(beforeSlots.length).toBeGreaterThan(0)
    expect(beforeSlots.some((slot) => slot.available)).toBe(true)

    const created = await createInquiry({
      guest_name: ISOLATION_GUEST,
      requested_date: ISOLATION_DATE,
      party_size: 20,
      email: "ei7-isolation@example.com",
      kind: "group",
    })
    expect(created.error).toBeUndefined()

    const { data: inquiryRows, error: inquiryError } = await supabase
      .from("event_inquiries")
      .select("id")
      .eq("guest_name", ISOLATION_GUEST)
    expect(inquiryError).toBeNull()
    expect(inquiryRows).toHaveLength(1)

    const after = await snapshotReservations()
    expect(after.count).toBe(before.count)
    expect(after.checksum).toBe(before.checksum)

    const listed = await getReservationsByDate(ISOLATION_DATE)
    expect(listed.error).toBeUndefined()
    expect(
      listed.reservations.some((row) => row.guest_name === ISOLATION_GUEST),
    ).toBe(false)

    const afterSlots = await getAvailableSlots(ISOLATION_DATE, 8)
    expect(afterSlots).toEqual(beforeSlots)
  })
})

const CONVERT_GUEST = "EI-8 no-convert probe"
// Far-future Wednesday: seed hours 09:00-22:00. Distinct from C2 CHECK
// (2027-12-15) and C7 isolation (2027-12-22).
const CONVERT_DATE = "2027-12-29"

async function cleanupConvertProbe() {
  const supabase = createServiceClient()
  await supabase
    .from("event_inquiries")
    .delete()
    .eq("guest_name", CONVERT_GUEST)
  await supabase.from("reservations").delete().eq("guest_name", CONVERT_GUEST)
}

describe.skipIf(!authEnvReady)("event_inquiries no conversion", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupConvertProbe()
  })

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupConvertProbe()
  })

  it("closing an inquiry does not insert reservations", async () => {
    const supabase = createServiceClient()
    const created = await createInquiry({
      guest_name: CONVERT_GUEST,
      requested_date: CONVERT_DATE,
      party_size: 20,
      email: "ei8-noconvert@example.com",
      kind: "group",
    })
    expect(created.error).toBeUndefined()

    const { data: inquiryRows, error: inquiryError } = await supabase
      .from("event_inquiries")
      .select("id")
      .eq("guest_name", CONVERT_GUEST)
    expect(inquiryError).toBeNull()
    expect(inquiryRows).toHaveLength(1)

    const before = await snapshotReservations()
    const closed = await updateInquiryStatus(inquiryRows![0]!.id, "closed")
    expect(closed.error).toBeUndefined()

    const { data: closedRows, error: closedError } = await supabase
      .from("event_inquiries")
      .select("status")
      .eq("id", inquiryRows![0]!.id)
    expect(closedError).toBeNull()
    expect(closedRows).toEqual([{ status: "closed" }])

    const after = await snapshotReservations()
    expect(after.count).toBe(before.count)
    expect(after.checksum).toBe(before.checksum)
  })
})
