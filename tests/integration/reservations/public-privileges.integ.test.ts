import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { authEnvReady } from "../helpers/env"

const root = process.cwd()

const MIGRATION_FILES = [
  "supabase/migrations/00000000000000_baseline.sql",
  "supabase/migrations/20260825140000_operating_windows_privilege.sql",
  "supabase/migrations/20260827160000_public_catalog_privileges.sql",
] as const

const GRANT_INSERT = "GRANT INSERT ON TABLE reservations TO anon, authenticated"
const REVOKE_SELECT_UPDATE_DELETE =
  "REVOKE SELECT, UPDATE, DELETE ON TABLE reservations FROM anon, authenticated"
const DROP_PUBLIC_READ =
  'DROP POLICY IF EXISTS "Allow public read reservations"'
const CREATE_PUBLIC_READ = 'CREATE POLICY "Allow public read reservations"'
const GRANT_SELECT_ANON = "GRANT SELECT ON TABLE reservations TO anon"

function readSql(rel: string) {
  const filePath = path.join(root, rel)
  if (!existsSync(filePath)) return ""
  return readFileSync(filePath, "utf8")
}

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

// Distinct from atomic-booking.integ.test.ts (2027-03-17 / 13:00): open
// Wednesday, far-future, never a blocked date by default.
const TEST_DATE = "2027-04-21"
const TEST_TIME = "19:00"
const GUEST_NAME = "Privilege Insert Guest"
const GUEST_PHONE = "555-0308"

async function cleanupTestSlot() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("date", TEST_DATE)
    .eq("time", TEST_TIME)
}

describe.skipIf(!authEnvReady)("reservations RES-PRIV insert-only", () => {
  beforeAll(async () => {
    await cleanupTestSlot()
  })

  afterEach(async () => {
    await cleanupTestSlot()
  })

  it("anon can INSERT reservations and cannot SELECT guest PII", async () => {
    const confCode = `TVL-${Math.floor(1000 + Math.random() * 9000)}`
    const anon = createClient()
    const { error: insertError } = await anon.from("reservations").insert({
      guest_name: GUEST_NAME,
      party_size: 2,
      date: TEST_DATE,
      time: TEST_TIME,
      phone: GUEST_PHONE,
      conf_code: confCode,
      notes: "REAZED-308 C1",
    })
    expect(insertError).toBeNull()

    const { data: guestRows, error: selectError } = await anon
      .from("reservations")
      .select("guest_name,phone")
      .eq("conf_code", confCode)
    expect(guestRows ?? []).toHaveLength(0)
    expect(isPermissionError(selectError)).toBe(true)

    const admin = createServiceClient()
    const { data: staffRow, error: staffError } = await admin
      .from("reservations")
      .select("guest_name,phone")
      .eq("conf_code", confCode)
      .maybeSingle()
    expect(staffError).toBeNull()
    expect(staffRow?.guest_name).toBe(GUEST_NAME)
    expect(staffRow?.phone).toBe(GUEST_PHONE)

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(GRANT_INSERT)
      expect(sql).toContain(REVOKE_SELECT_UPDATE_DELETE)
      expect(sql).toContain(DROP_PUBLIC_READ)
      expect(sql).not.toContain(GRANT_SELECT_ANON)
    }

    const baseline = readSql(MIGRATION_FILES[0])
    expect(baseline).not.toContain(CREATE_PUBLIC_READ)
  })
})

const GRANT_SELECT_BLOCKED_DATES =
  "GRANT SELECT ON TABLE blocked_dates TO anon, authenticated"
const REVOKE_DML_BLOCKED_DATES =
  "REVOKE INSERT, UPDATE, DELETE ON TABLE blocked_dates FROM anon, authenticated"

// Distinct from C1 (2027-04-21) and atomic-booking.integ.test.ts (2027-03-17).
const BLOCKED_DATE = "2027-05-19"
const BLOCKED_INSERT_DATE = "2027-05-20"

async function cleanupBlockedDates() {
  const supabase = createServiceClient()
  await supabase.from("blocked_dates").delete().eq("date", BLOCKED_DATE)
  await supabase.from("blocked_dates").delete().eq("date", BLOCKED_INSERT_DATE)
}

describe.skipIf(!authEnvReady)("blocked_dates PUBLIC-READ-PRIV", () => {
  beforeAll(async () => {
    await cleanupBlockedDates()
  })

  afterEach(async () => {
    await cleanupBlockedDates()
  })

  it("anon can SELECT blocked_dates and cannot INSERT", async () => {
    const admin = createServiceClient()
    const { error: seedError } = await admin.from("blocked_dates").insert({
      date: BLOCKED_DATE,
      reason: "REAZED-308 C2",
    })
    expect(seedError).toBeNull()

    const anon = createClient()
    const { data: rows, error: selectError } = await anon
      .from("blocked_dates")
      .select("date")
      .eq("date", BLOCKED_DATE)
    expect(selectError).toBeNull()
    expect(rows?.map((row) => row.date)).toContain(BLOCKED_DATE)

    const { error: insertError } = await anon.from("blocked_dates").insert({
      date: BLOCKED_INSERT_DATE,
      reason: "REAZED-308 C2 anon",
    })
    expect(isPermissionError(insertError)).toBe(true)

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(GRANT_SELECT_BLOCKED_DATES)
      expect(sql).toContain(REVOKE_DML_BLOCKED_DATES)
    }
  })
})

const GRANT_SELECT_MENU_ITEMS =
  "GRANT SELECT ON TABLE menu_items TO anon, authenticated"
const REVOKE_DML_MENU_ITEMS =
  "REVOKE INSERT, UPDATE, DELETE ON TABLE menu_items FROM anon, authenticated"

const MENU_PROBE_ID = "reazed-308-c3-anon-insert"
const MENU_PROBE_SLUG = "reazed-308-c3-anon-insert"

async function cleanupMenuProbe() {
  const supabase = createServiceClient()
  await supabase.from("menu_items").delete().eq("id", MENU_PROBE_ID)
}

describe.skipIf(!authEnvReady)("menu_items PUBLIC-READ-PRIV", () => {
  beforeAll(async () => {
    await cleanupMenuProbe()
  })

  afterEach(async () => {
    await cleanupMenuProbe()
  })

  it("anon can SELECT menu_items and cannot INSERT", async () => {
    const anon = createClient()
    const { data: rows, error: selectError } = await anon
      .from("menu_items")
      .select("id")
    expect(selectError).toBeNull()
    expect(rows?.length ?? 0).toBeGreaterThan(0)

    const { error: insertError } = await anon.from("menu_items").insert({
      id: MENU_PROBE_ID,
      slug: MENU_PROBE_SLUG,
      name: "C3 probe",
      name_en: "C3 probe",
      price: "0.-",
      menu_id: "midi",
      section: "C3",
      section_en: "C3",
    })
    expect(isPermissionError(insertError)).toBe(true)

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(GRANT_SELECT_MENU_ITEMS)
      expect(sql).toContain(REVOKE_DML_MENU_ITEMS)
    }
  })
})
