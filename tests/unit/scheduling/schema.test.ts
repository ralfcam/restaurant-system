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
    expect(baseline).toMatch(/CREATE OR REPLACE FUNCTION replace_operating_windows/)
  })

  it("forward migration drops the one-row-per-day unique and adds segment columns", () => {
    const migration = read("supabase/migrations/20260818162000_operating_hour_segments.sql")
    expect(migration).toMatch(/DROP CONSTRAINT IF EXISTS operating_windows_day_of_week_key/)
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS label TEXT/)
    expect(migration).toMatch(/replace_operating_windows/)
  })

  it("operating_windows and replace_operating_windows persist guest_note", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    const migration = read("supabase/migrations/20260818162000_operating_hour_segments.sql")

    expect(baseline).toMatch(/guest_note TEXT/)
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS guest_note/)
    expect(baseline).toMatch(/INSERT INTO operating_windows \([^)]*guest_note/)
    expect(migration).toMatch(/INSERT INTO operating_windows \([^)]*guest_note/)
  })

  it("admin scheduling manager lets staff add labeled opening-hour segments", () => {
    expect(existsSync(path.join(root, "app/admin/scheduling/page.tsx"))).toBe(true)
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
})
