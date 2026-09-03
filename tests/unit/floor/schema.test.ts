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
    expect(baseline).toMatch(
      /entity_type IN \('table', 'reservation', 'order'\)/,
    )

    const seed = read("supabase/seed.sql")
    expect(seed).toMatch(/INSERT INTO tables/)
    expect(seed).toMatch(/'1'/)
  })

  it("forward migration creates tables on already-applied baselines", () => {
    const migration = read(
      "supabase/migrations/20260818180000_floor_tables.sql",
    )
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
    expect(floor).toMatch(/spreadOverlappingTables/)
    expect(floor).toMatch(/resolveMergeDrop/)
    expect(floor).toMatch(/resolveSplitDrop/)
    expect(floor).toMatch(/LockOpen|floor-move-lock/)
    expect(floor).not.toMatch(/t\.shape ===/)
  })

  it("Tonight’s book copy uses expected-turn lead default 90", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const helper = floor.match(
      /Tonight[\u2019']s book[\s\S]*?<p className="mb-3 text-xs text-muted-foreground">\s*([\s\S]*?)\s*<\/p>/,
    )?.[1]

    expect(helper).toBeTruthy()
    expect(helper).not.toMatch(/15 minutes before the booked time/)
    expect(helper).toMatch(/90/)
    expect(helper).toMatch(/expected turn|90 minutes before the booked time/i)
  })

  it("forward migration adds expected time and merge tables", () => {
    const migration = read(
      "supabase/migrations/20260818193000_table_expected_minutes_and_merges.sql",
    )
    expect(migration).toMatch(/expected_minutes/)
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS table_merges/)
    expect(migration).toMatch(/table_merge_members/)
  })

  it("selecting a table at lg does not open the mobile inspector Sheet", async () => {
    const floor = read("components/staff/floor-plan.tsx")
    const selectTable = floor.match(
      /function selectTable\([^)]*\) \{[\s\S]*?\n  \}/,
    )?.[0]

    expect(selectTable).toBeTruthy()
    expect(selectTable).not.toMatch(
      /setSelectedId\([^)]*\)\s*setMergePick\(\[\]\)\s*setMobileInspectorOpen\(\s*true\s*\)/,
    )
    expect(selectTable).toMatch(/\bshouldOpenMobileInspector\b/)
    expect(floor).toMatch(/\bmatchMedia\b|addEventListener\(\s*["']resize["']/)
    expect(floor).toMatch(
      /setMobileInspectorOpen\(\s*false\s*\)|matchMedia[\s\S]{0,800}setMobileInspectorOpen\(|addEventListener\(\s*["']resize["'][\s\S]{0,800}setMobileInspectorOpen\(/,
    )
    // Inversion: lg:hidden on SheetContent already ships; it does not satisfy FP-12.
    expect(floor).toMatch(/SheetContent[\s\S]*\blg:hidden\b/)

    const layout = await import("@/lib/floor/layout")
    expect(layout.shouldOpenMobileInspector).toEqual(expect.any(Function))
    expect(layout.shouldOpenMobileInspector(1024)).toBe(false)
    expect(layout.shouldOpenMobileInspector(1280)).toBe(false)
  })

  it("selecting a table below lg opens the bottom Sheet inspector", async () => {
    const floor = read("components/staff/floor-plan.tsx")
    const selectTable = floor.match(
      /function selectTable\([^)]*\) \{[\s\S]*?\n  \}/,
    )?.[0]

    expect(selectTable).toBeTruthy()
    expect(selectTable).toMatch(/\bshouldOpenMobileInspector\b/)
    // Lock-in: below-lg still opens the Sheet. Passing the helper boolean
    // through is not enough if the `true` open-path was deleted.
    expect(selectTable).toMatch(
      /shouldOpenMobileInspector[\s\S]*setMobileInspectorOpen\(\s*true\s*\)|setMobileInspectorOpen\(\s*true\s*\)[\s\S]*shouldOpenMobileInspector/,
    )
    expect(floor).toMatch(
      /<Sheet\s+open=\{mobileInspectorOpen\}[\s\S]*<SheetContent[\s\S]*side=["']bottom["']/,
    )

    const layout = await import("@/lib/floor/layout")
    expect(layout.shouldOpenMobileInspector(1023)).toBe(true)
  })

  it("baseline persists orders and order_items for POS/KDS send-to-kitchen", () => {
    const baseline = read("supabase/migrations/00000000000000_baseline.sql")
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS orders/)
    expect(baseline).toMatch(/order_number\s+(BIG)?SERIAL/)
    expect(baseline).toMatch(/table_id UUID REFERENCES tables/)
    expect(baseline).toMatch(
      /status IN \('new',\s*'preparing',\s*'ready',\s*'completed',\s*'cancelled',\s*'voided'\)/,
    )
    expect(baseline).toMatch(/CREATE TABLE IF NOT EXISTS order_items/)
    expect(baseline).toMatch(/order_id UUID NOT NULL REFERENCES orders/)
    expect(baseline).toMatch(/Allow authenticated full access to orders/)
    expect(baseline).toMatch(/Allow authenticated full access to order_items/)
    expect(baseline).toMatch(/GRANT ALL ON TABLE orders TO service_role/)
    expect(baseline).toMatch(/GRANT ALL ON TABLE order_items TO service_role/)
  })
})
