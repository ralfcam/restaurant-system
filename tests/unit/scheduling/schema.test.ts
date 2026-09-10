import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("opening-hour segments schema and surfaces", () => {
  it("baseline allows multiple operating_windows rows per weekday with labels", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS operating_windows/)
    expect(baseline).not.toMatch(/UNIQUE\(\s*day_of_week\s*\)/)
    expect(baseline).toMatch(/label TEXT/)
    expect(baseline).toMatch(/sort_order INT NOT NULL DEFAULT 0/)
    expect(baseline).toMatch(/v_in_segment/)
    expect(baseline).toMatch(
      /CREATE OR REPLACE FUNCTION replace_operating_windows/,
    )
  })

  it("forward migration drops the one-row-per-day unique and adds segment columns", () => {
    const migration = read(
      "supabase/migrations/20260818162000_operating_hour_segments.sql",
    )
    expect(migration).toMatch(
      /DROP CONSTRAINT IF EXISTS operating_windows_day_of_week_key/,
    )
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS label TEXT/)
    expect(migration).toMatch(/replace_operating_windows/)
  })

  it("operating_windows and replace_operating_windows persist guest_note", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    const migration = read(
      "supabase/migrations/20260818162000_operating_hour_segments.sql",
    )

    expect(baseline).toMatch(/guest_note TEXT/)
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS guest_note/)
    expect(baseline).toMatch(/INSERT INTO operating_windows \([^)]*guest_note/)
    expect(migration).toMatch(/INSERT INTO operating_windows \([^)]*guest_note/)
  })

  it("admin scheduling manager lets staff add labeled opening-hour segments", () => {
    expect(existsSync(path.join(root, "app/admin/scheduling/page.tsx"))).toBe(
      true,
    )
    const manager = read("components/staff/scheduling-manager.tsx")
    expect(manager).toMatch(/Add segment/)
    expect(manager).toMatch(/scheduling-segment-row/)
    expect(manager).toMatch(/nextSuggestedSegment/)
    expect(manager).toMatch(/upsertOperatingWindows/)
  })

  it("booking widget and slot preview stay wired to segmented hours", () => {
    const widget = read("components/site/reservation-widget.tsx")
    const reservations = read("app/actions/reservations.ts")
    const availability = read("app/actions/availability.ts")

    expect(widget).toMatch(/getAllOperatingWindowsMap/)
    expect(widget).toMatch(/getAvailableSlots/)
    expect(widget).toMatch(/lastBookableTime/)
    expect(reservations).toMatch(/isTimeWithinSegments/)
    expect(reservations).toMatch(/bookableTimesForDay/)
    expect(availability).toMatch(/replace_operating_windows/)
    expect(availability).toMatch(/validateOperatingDays/)
  })

  it("operating_windows grants are select-only for anon and authenticated", () => {
    const grant =
      "GRANT SELECT ON TABLE operating_windows TO anon, authenticated"
    const revoke =
      "REVOKE INSERT, UPDATE, DELETE ON TABLE operating_windows FROM anon, authenticated"
    const forwardRel =
      "supabase/migrations/20260825140000_operating_windows_privilege.sql"

    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toContain(grant)
    expect(baseline).toContain(revoke)

    expect(existsSync(path.join(root, forwardRel))).toBe(true)
    const forward = read(forwardRel)
    expect(forward).toContain(grant)
    expect(forward).toContain(revoke)
    expect(forward).toContain(
      'DROP POLICY IF EXISTS "Allow authenticated full access to operating_windows"',
    )
  })

  it("operating_windows grants ALL to service_role in baseline and privilege forward files", () => {
    const grantAll = "GRANT ALL ON TABLE operating_windows TO service_role"
    const forwardRel =
      "supabase/migrations/20260825140000_operating_windows_privilege.sql"

    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toContain(grantAll)

    expect(existsSync(path.join(root, forwardRel))).toBe(true)
    const forward = read(forwardRel)
    expect(forward).toContain(grantAll)
  })

  it("early-baseline tables grant ALL to service_role in baseline and privilege forward files", () => {
    const tables = ["blocked_dates", "reservations", "menu_items"] as const
    const forwardRel =
      "supabase/migrations/20260825140000_operating_windows_privilege.sql"

    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(existsSync(path.join(root, forwardRel))).toBe(true)
    const forward = read(forwardRel)

    for (const t of tables) {
      const grantAll = `GRANT ALL ON TABLE ${t} TO service_role`
      expect(baseline).toContain(grantAll)
      expect(forward).toContain(grantAll)
    }
  })

  it("limits each scheduling guest-note input with the shared 240-character cap", () => {
    const manager = read("components/staff/scheduling-manager.tsx")
    const inputBlocks = manager.match(/<input\b[\s\S]*?\/>/g) ?? []
    const guestNoteInputs = inputBlocks.filter((block) =>
      block.toLowerCase().includes("guest note"),
    )

    expect(guestNoteInputs.length).toBeGreaterThan(0)
    for (const block of guestNoteInputs) {
      expect(block).toContain("maxLength={MAX_GUEST_NOTE_LENGTH}")
    }
  })
})

describe("servers table schema and seed (FP-14)", () => {
  it("servers are seeded and service-role-only", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    const dropAuthFull =
      'DROP POLICY IF EXISTS "Allow authenticated full access to servers"'
    const createAuthFull =
      'CREATE POLICY "Allow authenticated full access to servers"'
    const revokeAll =
      "REVOKE ALL ON TABLE servers FROM PUBLIC, anon, authenticated"
    const grantAuthenticated =
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE servers TO authenticated"

    expect(baseline).toContain("-- REAZED-329")
    expect(baseline).toContain("CREATE TABLE IF NOT EXISTS servers")

    const columns = baseline.match(
      /CREATE TABLE IF NOT EXISTS servers\s*\(([\s\S]*?)\);/,
    )?.[1]
    expect(columns).toBeTruthy()
    expect(columns).toMatch(/id UUID PRIMARY KEY/)
    expect(columns).toMatch(/name TEXT NOT NULL UNIQUE/)
    expect(columns).toMatch(/created_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/)
    expect(columns).toMatch(/updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW\(\)/)

    expect(baseline).toContain("ALTER TABLE servers ENABLE ROW LEVEL SECURITY")
    expect(baseline).toContain(dropAuthFull)
    const dropAuthIdx = baseline.indexOf(dropAuthFull)
    expect(baseline.indexOf(createAuthFull, dropAuthIdx)).toBe(-1)
    expect(baseline).toContain(revokeAll)
    expect(baseline).not.toContain(grantAuthenticated)
    expect(baseline).toContain(
      'CREATE POLICY "Allow service_role full access to servers"',
    )
    expect(baseline).toContain("ON servers FOR ALL")
    expect(baseline).toContain("TO service_role")
    expect(baseline).toContain("GRANT ALL ON TABLE servers TO service_role")

    const seed = read("supabase/seed.sql")
    const serversInsert = seed.match(/INSERT INTO servers[\s\S]{0,2000}/)?.[0]
    expect(serversInsert).toBeTruthy()
    for (const name of ["Maya", "Jon", "Priya", "Dev"] as const) {
      expect(serversInsert).toContain(`'${name}'`)
    }
  })
})
