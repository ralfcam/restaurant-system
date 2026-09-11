import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const root = process.cwd()

const MIGRATION_FILES = [
  "supabase/migrations/00000000000000_baseline.sql",
  "supabase/migrations/20260825140000_operating_windows_privilege.sql",
  "supabase/migrations/20260827160000_public_catalog_privileges.sql",
] as const

const GRANT_INSERT =
  "GRANT INSERT (guest_name, party_size, date, time, phone, email, notes, conf_code) ON TABLE reservations TO anon, authenticated"
const GRANT_INSERT_TABLE_WIDE =
  "GRANT INSERT ON TABLE reservations TO anon, authenticated"
const REVOKE_ALL =
  "REVOKE ALL ON TABLE reservations FROM PUBLIC, anon, authenticated"
const GRANT_SERVICE = "GRANT ALL ON TABLE reservations TO service_role"
const DROP_PUBLIC_READ =
  'DROP POLICY IF EXISTS "Allow public read reservations"'
const CREATE_PUBLIC_READ = 'CREATE POLICY "Allow public read reservations"'
const CREATE_PUBLIC_INSERT = 'CREATE POLICY "Allow public insert reservations"'
const DROP_AUTH_FULL =
  'DROP POLICY IF EXISTS "Allow authenticated full access to reservations"'
const CREATE_AUTH_FULL =
  'CREATE POLICY "Allow authenticated full access to reservations"'
const GRANT_SELECT_RESERVATIONS = "GRANT SELECT ON TABLE reservations"

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
// Distinct from C1 (2027-04-21 / 19:00), atomic-booking (2027-03-17),
// occupancy-window (2027-06-16), table-fit (2027-07-14), review-email-pii
// (2027-08-18). Far-future Wednesday.
const HOSTILE_DATE = "2027-10-13"
const HOSTILE_TIME = "18:00"
const GUEST_NAME = "Privilege Insert Guest"
const GUEST_PHONE = "555-0308"

async function cleanupTestSlot() {
  const supabase = createServiceClient()
  await supabase
    .from("reservations")
    .delete()
    .eq("date", TEST_DATE)
    .eq("time", TEST_TIME)
  await supabase
    .from("reservations")
    .delete()
    .eq("date", HOSTILE_DATE)
    .eq("time", HOSTILE_TIME)
}

describe.skipIf(!authEnvReady)("reservations RES-PRIV insert-only", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupTestSlot()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupTestSlot()
  })

  it("guest roles can INSERT reservations only and no authenticated full-access policy remains", async () => {
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
      .select("guest_name,phone,status,table_label,completed_at")
      .eq("conf_code", confCode)
      .maybeSingle()
    expect(staffError).toBeNull()
    expect(staffRow?.guest_name).toBe(GUEST_NAME)
    expect(staffRow?.phone).toBe(GUEST_PHONE)
    expect(staffRow?.status).toBe("confirmed")
    expect(staffRow?.table_label).toBeNull()
    expect(staffRow?.completed_at).toBeNull()

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(REVOKE_ALL)
      expect(sql).toContain(GRANT_INSERT)
      expect(sql).not.toContain(GRANT_INSERT_TABLE_WIDE)
      expect(sql.indexOf(REVOKE_ALL)).toBeLessThan(sql.indexOf(GRANT_INSERT))
      expect(sql).toContain(DROP_AUTH_FULL)
      const dropAuthIdx = sql.indexOf(DROP_AUTH_FULL)
      expect(sql.indexOf(CREATE_AUTH_FULL, dropAuthIdx)).toBe(-1)
      expect(sql).toContain(DROP_PUBLIC_READ)
      expect(sql).not.toContain(CREATE_PUBLIC_READ)
      expect(sql).not.toContain(GRANT_SELECT_RESERVATIONS)
      expect(sql).toContain(GRANT_SERVICE)
    }

    const baseline = readSql(MIGRATION_FILES[0])
    expect(baseline).toContain(CREATE_PUBLIC_INSERT)
  })

  it("guest INSERT rejects server-owned reservation fields and non-guest status", async () => {
    const confCode = `TVL-${Math.floor(1000 + Math.random() * 9000)}`
    const anon = createClient()
    const { error: insertError } = await anon.from("reservations").insert({
      guest_name: GUEST_NAME,
      party_size: 2,
      date: HOSTILE_DATE,
      time: HOSTILE_TIME,
      phone: GUEST_PHONE,
      conf_code: confCode,
      notes: "RES-PRIV-COLS hostile",
      status: "completed",
      table_label: "T99",
      completed_at: "2027-10-13T21:00:00.000Z",
    })

    const admin = createServiceClient()
    const { data: persisted, error: staffError } = await admin
      .from("reservations")
      .select("conf_code")
      .eq("conf_code", confCode)
      .maybeSingle()
    if (persisted) {
      await admin.from("reservations").delete().eq("conf_code", confCode)
    }

    expect(insertError).not.toBeNull()
    expect(staffError).toBeNull()
    expect(persisted).toBeNull()
  })
})

const GRANT_SELECT_BLOCKED_DATES =
  "GRANT SELECT ON TABLE blocked_dates TO anon, authenticated"
const REVOKE_ALL_BLOCKED_DATES =
  "REVOKE ALL ON TABLE blocked_dates FROM PUBLIC, anon, authenticated"
const GRANT_SERVICE_BLOCKED_DATES =
  "GRANT ALL ON TABLE blocked_dates TO service_role"
const DROP_AUTH_FULL_BLOCKED_DATES =
  'DROP POLICY IF EXISTS "Allow authenticated full access to blocked_dates"'
const CREATE_AUTH_FULL_BLOCKED_DATES =
  'CREATE POLICY "Allow authenticated full access to blocked_dates"'
const CREATE_PUBLIC_READ_BLOCKED_DATES =
  'CREATE POLICY "Allow public read blocked_dates"'

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
    assertIsolatedHoursMutationTarget()
    await cleanupBlockedDates()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupBlockedDates()
  })

  it("guest roles can SELECT blocked_dates only and no authenticated full-access policy remains", async () => {
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
      expect(sql).toContain(REVOKE_ALL_BLOCKED_DATES)
      expect(sql).toContain(GRANT_SELECT_BLOCKED_DATES)
      expect(sql.indexOf(REVOKE_ALL_BLOCKED_DATES)).toBeLessThan(
        sql.indexOf(GRANT_SELECT_BLOCKED_DATES),
      )
      expect(sql).toContain(DROP_AUTH_FULL_BLOCKED_DATES)
      const dropAuthIdx = sql.indexOf(DROP_AUTH_FULL_BLOCKED_DATES)
      expect(sql.indexOf(CREATE_AUTH_FULL_BLOCKED_DATES, dropAuthIdx)).toBe(-1)
      expect(sql).toContain(GRANT_SERVICE_BLOCKED_DATES)
    }

    const baseline = readSql(MIGRATION_FILES[0])
    expect(baseline).toContain(CREATE_PUBLIC_READ_BLOCKED_DATES)
  })
})

const GRANT_SELECT_MENU_ITEMS =
  "GRANT SELECT ON TABLE menu_items TO anon, authenticated"
const REVOKE_ALL_MENU_ITEMS =
  "REVOKE ALL ON TABLE menu_items FROM PUBLIC, anon, authenticated"
const GRANT_SERVICE_MENU_ITEMS = "GRANT ALL ON TABLE menu_items TO service_role"
const DROP_AUTH_FULL_MENU_ITEMS =
  'DROP POLICY IF EXISTS "Allow authenticated full access to menu_items"'
const CREATE_AUTH_FULL_MENU_ITEMS =
  'CREATE POLICY "Allow authenticated full access to menu_items"'
const CREATE_PUBLIC_READ_MENU_ITEMS =
  'CREATE POLICY "Allow public read menu_items"'

const MENU_PROBE_ID = "reazed-308-c3-anon-insert"
const MENU_PROBE_SLUG = "reazed-308-c3-anon-insert"

async function cleanupMenuProbe() {
  const supabase = createServiceClient()
  await supabase.from("menu_items").delete().eq("id", MENU_PROBE_ID)
}

describe.skipIf(!authEnvReady)("menu_items PUBLIC-READ-PRIV", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupMenuProbe()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupMenuProbe()
  })

  it("guest roles can SELECT menu_items only and no authenticated full-access policy remains", async () => {
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

    const admin = createServiceClient()
    const { data: staffRows, error: staffError } = await admin
      .from("menu_items")
      .select("id")
    expect(staffError).toBeNull()
    expect(staffRows?.length ?? 0).toBeGreaterThan(0)

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(REVOKE_ALL_MENU_ITEMS)
      expect(sql).toContain(GRANT_SELECT_MENU_ITEMS)
      expect(sql.indexOf(REVOKE_ALL_MENU_ITEMS)).toBeLessThan(
        sql.indexOf(GRANT_SELECT_MENU_ITEMS),
      )
      expect(sql).toContain(DROP_AUTH_FULL_MENU_ITEMS)
      const dropAuthIdx = sql.indexOf(DROP_AUTH_FULL_MENU_ITEMS)
      expect(sql.indexOf(CREATE_AUTH_FULL_MENU_ITEMS, dropAuthIdx)).toBe(-1)
      expect(sql).toContain(GRANT_SERVICE_MENU_ITEMS)
    }

    const baseline = readSql(MIGRATION_FILES[0])
    expect(baseline).toContain(CREATE_PUBLIC_READ_MENU_ITEMS)
  })
})
