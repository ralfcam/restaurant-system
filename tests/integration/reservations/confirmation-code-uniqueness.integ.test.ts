import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const root = process.cwd()
const BASELINE = "supabase/migrations/00000000000000_baseline.sql"
const UNIQUE_INDEX =
  "CREATE UNIQUE INDEX IF NOT EXISTS reservations_conf_code_uidx ON public.reservations (conf_code)"

const CONF_CODE = "TVL-9917"
const SLOT_A = { date: "2027-11-17", time: "19:00" } as const
const SLOT_B = { date: "2027-11-24", time: "20:00" } as const
const GUEST_NAME = "Conf Code Uniqueness Guest"
const GUEST_PHONE = "555-9917"
const GUEST_EMAIL = "conf-code-unique@example.test"

function readBaselineSql() {
  const filePath = path.join(root, BASELINE)
  if (!existsSync(filePath)) return ""
  return readFileSync(filePath, "utf8")
}

async function cleanupFixtureRows() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("conf_code", CONF_CODE)
    .eq("date", SLOT_A.date)
    .eq("time", SLOT_A.time)
  await supabase
    .from("reservations")
    .delete()
    .eq("conf_code", CONF_CODE)
    .eq("date", SLOT_B.date)
    .eq("time", SLOT_B.time)
}

function guestInsertPayload(slot: typeof SLOT_A | typeof SLOT_B) {
  return {
    guest_name: GUEST_NAME,
    party_size: 2,
    date: slot.date,
    time: slot.time,
    phone: GUEST_PHONE,
    email: GUEST_EMAIL,
    notes: "CONF-CODE-UNIQUE",
    conf_code: CONF_CODE,
  }
}

describe.skipIf(!authEnvReady)("reservations CONF-CODE-UNIQUE", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupFixtureRows()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupFixtureRows()
  })

  it("rejects a second guest insert of the same conf_code with SQLSTATE 23505", async () => {
    const anon = createClient()
    const { error: firstError } = await anon
      .from("reservations")
      .insert(guestInsertPayload(SLOT_A))
    expect(firstError).toBeNull()

    const { error: secondError } = await anon
      .from("reservations")
      .insert(guestInsertPayload(SLOT_B))
    expect(secondError).not.toBeNull()
    expect(secondError?.code).toBe("23505")

    const admin = createServiceClient()
    const { data: rows, error: staffError } = await admin
      .from("reservations")
      .select("conf_code,date,time")
      .eq("conf_code", CONF_CODE)
    expect(staffError).toBeNull()
    expect(rows ?? []).toHaveLength(1)
    expect(rows?.[0]?.date).toBe(SLOT_A.date)
    expect(rows?.[0]?.time).toBe(SLOT_A.time)

    const baseline = readBaselineSql()
    expect(baseline).toContain(UNIQUE_INDEX)
    const tableIdx = baseline.indexOf("CREATE TABLE IF NOT EXISTS reservations")
    const uniqueIdx = baseline.indexOf(UNIQUE_INDEX)
    expect(tableIdx).toBeGreaterThanOrEqual(0)
    expect(uniqueIdx).toBeGreaterThan(tableIdx)
    const nextAlter = baseline.indexOf(
      "ALTER TABLE reservations ADD COLUMN IF NOT EXISTS email",
    )
    expect(uniqueIdx).toBeLessThan(nextAlter)
  })
})
