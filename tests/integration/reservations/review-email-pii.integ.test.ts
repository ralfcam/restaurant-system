import { afterEach, beforeAll, describe, expect, it } from "vitest"
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

// Distinct from public-privileges (2027-04-21 / 19:00), atomic-booking
// (2027-03-17 / 13:00), occupancy-window (2027-06-16), table-fit (2027-07-14).
const TEST_DATE = "2027-08-18"
const TEST_TIME = "19:00"
const GUEST_NAME = "Review Email PII Guest"
const GUEST_PHONE = "555-0910"
const GUEST_EMAIL = "pv9-anon-pii@example.com"

async function cleanupTestSlot() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("date", TEST_DATE)
    .eq("time", TEST_TIME)
}

describe.skipIf(!authEnvReady)("reservations PV-9 guest email PII", () => {
  beforeAll(async () => {
    await cleanupTestSlot()
  })

  afterEach(async () => {
    await cleanupTestSlot()
  })

  it("anon cannot SELECT guest email on reservations", async () => {
    const confCode = `TVL-${Math.floor(1000 + Math.random() * 9000)}`
    const admin = createServiceClient()
    const { error: insertError } = await admin.from("reservations").insert({
      guest_name: GUEST_NAME,
      party_size: 2,
      date: TEST_DATE,
      time: TEST_TIME,
      phone: GUEST_PHONE,
      conf_code: confCode,
      email: GUEST_EMAIL,
    })
    expect(insertError).toBeNull()

    const anon = createClient()
    const { data: listed, error: listError } = await anon
      .from("reservations")
      .select("email")
    expect(listed ?? []).toHaveLength(0)
    expect(isPermissionError(listError)).toBe(true)

    const { data: guestRows, error: selectError } = await anon
      .from("reservations")
      .select("email")
      .eq("conf_code", confCode)
    expect(guestRows ?? []).toHaveLength(0)
    expect(isPermissionError(selectError)).toBe(true)

    const leaked = JSON.stringify({
      listed: listed ?? [],
      guestRows: guestRows ?? [],
    })
    expect(leaked).not.toContain(GUEST_EMAIL)
  })
})
