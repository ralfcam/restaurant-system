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

  it("floor snapshot and live hook carry table bill totals on the 5s refresh", () => {
    const actions = read("app/actions/reservations.ts")
    const snapshotStart = actions.indexOf(
      "export async function getFloorSnapshot",
    )
    expect(snapshotStart).toBeGreaterThan(-1)
    const snapshotEnd = actions.indexOf("\nexport ", snapshotStart + 1)
    const snapshotFn = actions.slice(
      snapshotStart,
      snapshotEnd === -1 ? actions.length : snapshotEnd,
    )

    const callNames = [
      ...snapshotFn.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g),
    ].map((match) => match[1])

    function functionBody(src: string, name: string) {
      const needle = `function ${name}`
      const at = src.indexOf(needle)
      if (at < 0) return ""
      const from = src.lastIndexOf("\n", at) + 1
      const nextExport = src.indexOf("\nexport ", at + needle.length)
      return src.slice(from, nextExport === -1 ? src.length : nextExport)
    }

    const importSpecs = [
      ...actions.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'](@\/[^"']+)["']/g),
    ]

    const helperSrc = callNames
      .map((name) => {
        const local = functionBody(actions, name)
        if (local) return local
        const spec = importSpecs.find((imp) =>
          new RegExp(`\\b${name}\\b`).test(imp[1]),
        )?.[2]
        if (!spec) return ""
        const rel = `${spec.replace(/^@\//, "")}.ts`
        if (!existsSync(path.join(root, rel))) return ""
        return functionBody(read(rel), name)
      })
      .join("\n")

    // FP-15: getFloorSnapshot (or a helper it calls) must load orders
    // table_label/total/status — not only tables/reservations/assigned/merges.
    const scanned = `${snapshotFn}\n${helperSrc}`
    expect(scanned).toMatch(/from\(\s*["']orders["']\)/)
    expect(scanned).toMatch(
      /select\(\s*["'][^"']*table_label[^"']*total[^"']*status[^"']*["']\s*\)|select\([^)]*\btable_label\b[^)]*\btotal\b[^)]*\bstatus\b/,
    )
    expect(snapshotFn).not.toMatch(
      /return \{\s*tables,\s*reservations,\s*assigned,\s*merges\s*\}/,
    )

    const hook = read("hooks/use-floor-plan.ts")
    expect(hook).toMatch(/refreshInterval:\s*(5000|FLOOR_REFRESH_MS)/)
    expect(hook).toMatch(/FLOOR_REFRESH_MS\s*=\s*5000/)
    expect(hook).toMatch(/sumOpenOrderTotalsByTableLabel|tableTotals|billTotal/)
    expect(hook).toMatch(
      /overlayReservationsOnTables\s*\([\s\S]*?(?:sumOpenOrderTotalsByTableLabel|tableTotals|billTotal)[\s\S]*?\)/,
    )
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
    expect(baseline).toMatch(/GRANT ALL ON TABLE orders TO service_role/)
    expect(baseline).toMatch(/GRANT ALL ON TABLE order_items TO service_role/)
  })

  it("floor chip renders the assigned reservation time without hiding the table label", () => {
    const floor = read("components/staff/floor-plan.tsx")

    // Dining-room chip <button> only — inspector already shows
    // {selected.reservation.time} and must not satisfy FP-4.
    const chipStart = floor.indexOf("onChipPointerDown(t, event)")
    expect(chipStart).toBeGreaterThan(-1)
    const buttonOpen = floor.lastIndexOf("<button", chipStart)
    expect(buttonOpen).toBeGreaterThan(-1)
    const buttonClose = floor.indexOf("</button>", chipStart)
    expect(buttonClose).toBeGreaterThan(buttonOpen)
    const chip = floor.slice(buttonOpen, buttonClose + "</button>".length)

    expect(chip).toContain("onChipPointerDown")
    expect(chip).not.toMatch(/selected\.reservation/)

    const heading = chip.match(
      /<span className="font-heading[^"]*">([\s\S]*?)<\/span>/,
    )?.[1]
    expect(heading).toMatch(/\{t\.label\}/)

    // Unassigned path: guest is gated on t.reservation; leftover chip
    // copy must not render guest or reservation time.
    expect(chip).toMatch(/\{t\.reservation \?/)
    expect(chip).toMatch(/\{t\.reservation\.guestName\}/)
    const ungated = chip.replace(
      /\{t\.reservation \? \([\s\S]*?\) : null\}/g,
      "",
    )
    expect(ungated).not.toMatch(/t\.reservation\.guestName/)
    expect(ungated).not.toMatch(/t\.reservation\.time/)

    // FP-4: occupying overlay must render reservation time on the chip.
    expect(chip).toMatch(/\{t\.reservation\.time\}/)
  })

  it("seated floor chip renders CHF bill total and reserved chips do not", () => {
    const floor = read("components/staff/floor-plan.tsx")

    // Dining-room chip <button> only — inspector must not satisfy FP-15.
    const chipStart = floor.indexOf("onChipPointerDown(t, event)")
    expect(chipStart).toBeGreaterThan(-1)
    const buttonOpen = floor.lastIndexOf("<button", chipStart)
    expect(buttonOpen).toBeGreaterThan(-1)
    const buttonClose = floor.indexOf("</button>", chipStart)
    expect(buttonClose).toBeGreaterThan(buttonOpen)
    const chip = floor.slice(buttonOpen, buttonClose + "</button>".length)

    expect(chip).toContain("onChipPointerDown")
    expect(chip).not.toMatch(/selected\.reservation/)

    // Added bill lines MUST NOT hide tables.label or the seated ping.
    const heading = chip.match(
      /<span className="font-heading[^"]*">([\s\S]*?)<\/span>/,
    )?.[1]
    expect(heading).toMatch(/\{t\.label\}/)
    expect(chip).toMatch(/t\.displayStatus === ["']seated["']/)
    expect(chip).toMatch(/animate-ping/)

    // FP-15: seated path formats overlay billTotal like POS (`CHF` + two
    // decimals). Null/undefined is 0 so seated-with-no-orders shows CHF 0.00.
    expect(chip).toMatch(
      /(?:t\.displayStatus === ["']seated["']|t\.reservation\??\.status === ["']seated["'])[\s\S]*CHF[\s\S]*(?:t\.)?billTotal\s*(?:\?\?|\|\|)\s*0[\s\S]*toFixed\(\s*2\s*\)/,
    )

    // Confirmed/reserved (and unassigned) paths must not render a bill.
    const withoutSeated = chip
      .replace(
        /\{t\.displayStatus === ["']seated["'] \? \([\s\S]*?\) : null\}/g,
        "",
      )
      .replace(
        /\{t\.reservation\??\.status === ["']seated["'] \? \([\s\S]*?\) : null\}/g,
        "",
      )
      .replace(/\{t\.displayStatus === ["']seated["'] && \([\s\S]*?\)\}/g, "")
      .replace(
        /\{t\.reservation\??\.status === ["']seated["'] && \([\s\S]*?\)\}/g,
        "",
      )
    expect(withoutSeated).not.toMatch(/CHF/)
    expect(withoutSeated).not.toMatch(/billTotal/)
  })
})
