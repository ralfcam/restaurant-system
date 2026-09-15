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

const GRANT_SELECT_MENUS = "GRANT SELECT ON TABLE menus TO anon, authenticated"
const REVOKE_ALL_MENUS =
  "REVOKE ALL ON TABLE menus FROM PUBLIC, anon, authenticated"
const GRANT_SERVICE_MENUS = "GRANT ALL ON TABLE menus TO service_role"
const DROP_AUTH_FULL_MENUS =
  'DROP POLICY IF EXISTS "Allow authenticated full access to menus"'
const CREATE_AUTH_FULL_MENUS =
  'CREATE POLICY "Allow authenticated full access to menus"'
const CREATE_PUBLIC_READ_MENUS = 'CREATE POLICY "Allow public read menus"'

const MENU_PROBE_ID = "res-70-c4-service-dml"
const MENU_PROBE_ANON_ID = "res-70-c4-anon-insert"

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

async function cleanupMenuProbe() {
  const supabase = createServiceClient()
  await supabase.from("menus").delete().eq("id", MENU_PROBE_ID)
  await supabase.from("menus").delete().eq("id", MENU_PROBE_ANON_ID)
}

describe.skipIf(!authEnvReady)("menus PUBLIC-READ-PRIV", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupMenuProbe()
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupMenuProbe()
  })

  it("guest roles can SELECT menus only and no authenticated full-access policy remains", async () => {
    const admin = createServiceClient()
    const { error: seedError } = await admin.from("menus").insert({
      id: MENU_PROBE_ID,
      title: "C4 probe",
      title_en: "C4 probe",
      sort_order: 99,
    })
    expect(seedError).toBeNull()

    const anon = createClient()
    const { data: rows, error: selectError } = await anon
      .from("menus")
      .select("id")
      .eq("id", MENU_PROBE_ID)
    expect(selectError).toBeNull()
    expect(rows?.map((row) => row.id)).toContain(MENU_PROBE_ID)

    const { error: insertError } = await anon.from("menus").insert({
      id: MENU_PROBE_ANON_ID,
      title: "C4 anon",
      title_en: "C4 anon",
      sort_order: 100,
    })
    expect(isPermissionError(insertError)).toBe(true)

    const { data: staffRows, error: staffError } = await admin
      .from("menus")
      .select("id")
      .eq("id", MENU_PROBE_ID)
    expect(staffError).toBeNull()
    expect(staffRows?.map((row) => row.id)).toContain(MENU_PROBE_ID)

    for (const rel of MIGRATION_FILES) {
      const sql = readSql(rel)
      expect(sql).toContain(REVOKE_ALL_MENUS)
      expect(sql).toContain(GRANT_SELECT_MENUS)
      expect(sql.indexOf(REVOKE_ALL_MENUS)).toBeLessThan(
        sql.indexOf(GRANT_SELECT_MENUS),
      )
      expect(sql).toContain(DROP_AUTH_FULL_MENUS)
      const dropAuthIdx = sql.indexOf(DROP_AUTH_FULL_MENUS)
      expect(sql.indexOf(CREATE_AUTH_FULL_MENUS, dropAuthIdx)).toBe(-1)
      expect(sql).toContain(GRANT_SERVICE_MENUS)
    }

    const baseline = readSql(MIGRATION_FILES[0])
    expect(baseline).toContain(CREATE_PUBLIC_READ_MENUS)
  })
})
