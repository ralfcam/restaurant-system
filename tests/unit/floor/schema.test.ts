import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("floor tables schema and live surfaces", () => {
  it("baseline and seed persist dining-room tables", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS tables/)
    expect(baseline).toMatch(/status TEXT NOT NULL DEFAULT 'available'/)
    expect(baseline).toMatch(/out_of_service/)
    expect(baseline).toMatch(/Allow authenticated full access to tables/)
    expect(baseline).toMatch(/expected_minutes/)
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS table_merges/)
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS table_merge_members/)
    expect(baseline).toMatch(/status_events_entity_type_check/)
    expect(baseline).toMatch(/entity_type IN \('table', 'reservation', 'order'\)/)

    const seed = read("supabase/seed.sql")
    expect(seed).toMatch(/INSERT INTO tables/)
    expect(seed).toMatch(/'1'/)
  })

  it("forward migration creates tables on already-applied baselines", () => {
    const migration = read("supabase/migrations/20260818180000_floor_tables.sql")
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS tables/)
    expect(migration).toMatch(/ADD TABLE tables/)
    expect(migration).toMatch(/status_events_entity_type_check/)
  })

  it("Floor Plan is a live view wired through useFloorPlan", () => {
    expect(existsSync(path.join(root, "hooks/use-floor-plan.ts"))).toBe(true)
    const hook = read("hooks/use-floor-plan.ts")
    expect(hook).toMatch(/useSWR/)
    expect(hook).toMatch(/autoAssignDueReservations|getFloorSnapshot/)
    expect(hook).toMatch(/refreshInterval:\s*(5000|FLOOR_REFRESH_MS)/)
    expect(hook).toMatch(/FLOOR_REFRESH_MS\s*=\s*5000/)

    const floor = read("components/staff/floor-plan.tsx")
    expect(floor).toMatch(/useFloorPlan/)
    expect(floor).toMatch(/overlayReservationsOnTables|displayStatus/)
    expect(floor).toMatch(/Live/)
    expect(floor).toMatch(/tableShapeForSeats/)
    expect(floor).toMatch(/tableChipSizeClass/)
    expect(floor).toMatch(/Expected time/)
    expect(floor).toMatch(/Merge tables/)
    expect(floor).toMatch(/Unlock a table/)
    expect(floor).toMatch(/Drag a merged table/)
    expect(floor).toMatch(/onPointerDown/)
    expect(floor).toMatch(/clientToFloorCell/)
    expect(floor).toMatch(/resolveMergeDrop/)
    expect(floor).toMatch(/resolveSplitDrop/)
    expect(floor).toMatch(/LockOpen|floor-move-lock/)
    expect(floor).not.toMatch(/t\.shape ===/)
  })

  it("forward migration adds expected time and merge tables", () => {
    const migration = read("supabase/migrations/20260818193000_table_expected_minutes_and_merges.sql")
    expect(migration).toMatch(/expected_minutes/)
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS table_merges/)
    expect(migration).toMatch(/table_merge_members/)
  })
})

