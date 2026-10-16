import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

// Distinct from status-transitions (2028-01-12), cover-limits (2028-01-05),
// and orders-persistence (2028-04-12 / 2028-04-19). Far-future Wednesdays,
// seed hours 09:00-22:00. Slots are 120 minutes apart so they sit outside
// the 105-minute occupancy window.
const DATE_A = "2028-02-16"
const DATE_B = "2028-02-23"

const DEFAULT_CODE = "TVL-1680"
const BOGUS_CODE = "TVL-1685"
const GUEST_SOURCE_CODE = "TVL-1686"
const GUEST_DEFAULT_CODE = "TVL-1687"

const ACCEPTED_SOURCES = [
  {
    source: "online",
    confCode: "TVL-1681",
    time: "14:00",
    label: "WI-9 online",
  },
  { source: "staff", confCode: "TVL-1682", time: "16:00", label: "WI-9 staff" },
  {
    source: "walk_in",
    confCode: "TVL-1683",
    time: "18:00",
    label: "WI-9 walk_in",
  },
  {
    source: "external",
    confCode: "TVL-1684",
    time: "20:00",
    label: "WI-9 external",
  },
] as const

function reservationRow(input: {
  label: string
  confCode: string
  date: string
  time: string
  source?: string
}) {
  return {
    guest_name: input.label,
    party_size: 2,
    date: input.date,
    time: input.time,
    phone: "555-1680",
    email: "wi9-source@example.test",
    notes: input.label,
    conf_code: input.confCode,
    status: "confirmed" as const,
    ...(input.source === undefined ? {} : { source: input.source }),
  }
}

async function cleanupLabelledRows() {
  const supabase = createServiceClient()
  await supabase.from("reservations").delete().in("date", [DATE_A, DATE_B])
}

describe.skipIf(!authEnvReady)("reservations WI-9 source", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupLabelledRows()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupLabelledRows()
  })

  it("reservations.source: CHECK, default online, guest cannot set it", async () => {
    const admin = createServiceClient()

    const { error: defaultInsertError } = await admin
      .from("reservations")
      .insert(
        reservationRow({
          label: "WI-9 default",
          confCode: DEFAULT_CODE,
          date: DATE_A,
          time: "12:00",
        }),
      )
    expect(defaultInsertError).toBeNull()

    const { data: defaultRow, error: defaultReadError } = await admin
      .from("reservations")
      .select("source")
      .eq("conf_code", DEFAULT_CODE)
      .single()
    expect(defaultReadError).toBeNull()
    expect(defaultRow?.source).toBe("online")

    for (const accepted of ACCEPTED_SOURCES) {
      const { error: insertError } = await admin.from("reservations").insert(
        reservationRow({
          label: accepted.label,
          confCode: accepted.confCode,
          date: DATE_A,
          time: accepted.time,
          source: accepted.source,
        }),
      )
      expect(insertError).toBeNull()

      const { data: row, error: readError } = await admin
        .from("reservations")
        .select("source")
        .eq("conf_code", accepted.confCode)
        .single()
      expect(readError).toBeNull()
      expect(row?.source).toBe(accepted.source)
    }

    const { error: bogusError } = await admin.from("reservations").insert(
      reservationRow({
        label: "WI-9 bogus",
        confCode: BOGUS_CODE,
        date: DATE_B,
        time: "12:00",
        source: "bogus",
      }),
    )
    expect(bogusError?.code).toBe("23514")

    const { data: bogusRow, error: bogusReadError } = await admin
      .from("reservations")
      .select("conf_code")
      .eq("conf_code", BOGUS_CODE)
      .maybeSingle()
    expect(bogusReadError).toBeNull()
    expect(bogusRow).toBeNull()

    const anon = createClient()
    const { error: guestSourceError } = await anon.from("reservations").insert({
      guest_name: "WI-9 guest source",
      party_size: 2,
      date: DATE_B,
      time: "14:00",
      phone: "555-1680",
      email: "wi9-source@example.test",
      notes: "WI-9 guest source",
      conf_code: GUEST_SOURCE_CODE,
      source: "walk_in",
    })
    expect(guestSourceError?.code).toBe("42501")

    const { data: guestSourceRow, error: guestSourceReadError } = await admin
      .from("reservations")
      .select("conf_code, source")
      .eq("conf_code", GUEST_SOURCE_CODE)
      .maybeSingle()
    expect(guestSourceReadError).toBeNull()
    expect(guestSourceRow).toBeNull()

    const { error: guestInsertError } = await anon.from("reservations").insert({
      guest_name: "WI-9 guest default",
      party_size: 2,
      date: DATE_B,
      time: "16:00",
      phone: "555-1680",
      email: "wi9-source@example.test",
      notes: "WI-9 guest default",
      conf_code: GUEST_DEFAULT_CODE,
    })
    expect(guestInsertError).toBeNull()

    const { data: guestRow, error: guestReadError } = await admin
      .from("reservations")
      .select("source")
      .eq("conf_code", GUEST_DEFAULT_CODE)
      .single()
    expect(guestReadError).toBeNull()
    expect(guestRow?.source).toBe("online")
  })
})
