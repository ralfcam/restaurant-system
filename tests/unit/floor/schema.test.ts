import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function maskSqlComments(sql: string) {
  let out = ""
  let i = 0
  while (i < sql.length) {
    if (sql[i] === "'") {
      const start = i
      i += 1
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2
          continue
        }
        if (sql[i] === "'") {
          i += 1
          break
        }
        i += 1
      }
      out += sql.slice(start, i)
      continue
    }
    if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2)
      const stop = end === -1 ? sql.length : end + 2
      out += " ".repeat(stop - i)
      i = stop
      continue
    }
    if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i)
      const stop = end === -1 ? sql.length : end
      out += " ".repeat(stop - i)
      i = stop
      continue
    }
    out += sql[i]
    i += 1
  }
  return out
}

function statementFrom(sql: string, offset: number) {
  let i = offset
  let inSingle = false
  while (i < sql.length) {
    const ch = sql[i]
    if (inSingle) {
      if (ch === "'" && sql[i + 1] === "'") {
        i += 2
        continue
      }
      if (ch === "'") inSingle = false
      i += 1
      continue
    }
    if (ch === "'") {
      inSingle = true
      i += 1
      continue
    }
    if (ch === ";") return sql.slice(offset, i)
    i += 1
  }
  return sql.slice(offset)
}

function findInsert(sql: string, table: string) {
  const match = new RegExp(
    `INSERT\\s+INTO\\s+(?:public\\.)?${table}\\b`,
    "i",
  ).exec(sql)
  if (!match) return null
  return { offset: match.index, text: statementFrom(sql, match.index) }
}

function diningRoomTablesInsert(original: string, masked: string) {
  const marker = original.search(/dining-room/i)
  const from = marker >= 0 ? marker : 0
  const match = /INSERT\s+INTO\s+(?:public\.)?tables\b/i.exec(
    masked.slice(from),
  )
  if (!match) return null
  const offset = from + match.index
  return { offset, text: statementFrom(masked, offset) }
}

function splitSqlValues(valuesSql: string) {
  const values: string[] = []
  let current = ""
  let depth = 0
  let inSingle = false

  for (let i = 0; i < valuesSql.length; i += 1) {
    const ch = valuesSql[i]
    if (inSingle) {
      current += ch
      if (ch === "'" && valuesSql[i + 1] === "'") {
        current += valuesSql[(i += 1)]
        continue
      }
      if (ch === "'") inSingle = false
      continue
    }
    if (ch === "'") {
      inSingle = true
      current += ch
      continue
    }
    if (ch === "(") {
      depth += 1
      current += ch
      continue
    }
    if (ch === ")") {
      depth -= 1
      current += ch
      continue
    }
    if (ch === "," && depth === 0) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += ch
  }
  if (current.trim()) values.push(current.trim())
  return values
}

function columnList(insert: string, table: string) {
  const match = insert.match(
    new RegExp(
      `INSERT\\s+INTO\\s+(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\)\\s*(?:VALUES|SELECT)\\b`,
      "i",
    ),
  )
  if (!match) return []
  return match[1]
    .split(",")
    .map((column) => column.trim().replace(/"/g, "").toLowerCase())
    .filter(Boolean)
}

function valuesTuple(insert: string) {
  const match = insert.match(/VALUES\s*\(([\s\S]*)\)\s*ON\s+CONFLICT\b/i)
  if (!match) return []
  return splitSqlValues(match[1])
}

function sqlInteger(token: string | undefined) {
  if (!token || !/^-?\d+$/.test(token.trim())) return null
  return Number(token.trim())
}

function sqlTuples(block: string) {
  const rows: string[][] = []
  let i = 0
  while (i < block.length) {
    if (block[i] !== "(") {
      i += 1
      continue
    }
    let depth = 0
    let inSingle = false
    const start = i
    while (i < block.length) {
      const ch = block[i]
      if (inSingle) {
        if (ch === "'" && block[i + 1] === "'") {
          i += 2
          continue
        }
        if (ch === "'") inSingle = false
        i += 1
        continue
      }
      if (ch === "'") {
        inSingle = true
        i += 1
        continue
      }
      if (ch === "(") {
        depth += 1
        i += 1
        continue
      }
      if (ch === ")") {
        depth -= 1
        i += 1
        if (depth === 0) break
        continue
      }
      i += 1
    }
    rows.push(splitSqlValues(block.slice(start + 1, i - 1)))
  }
  return rows
}

function diningRoomSeatSum(insert: string) {
  const alias = insert.match(/\)\s*AS\s+\w+\s*\(([^)]*)\)/i)
  const aliasColumns = alias
    ? alias[1]
        .split(",")
        .map((column) => column.trim().replace(/"/g, "").toLowerCase())
    : []
  const seatsIdx =
    aliasColumns.indexOf("seats") >= 0
      ? aliasColumns.indexOf("seats")
      : columnList(insert, "tables").indexOf("seats")
  if (seatsIdx < 0) return null

  const valuesRegion = alias
    ? insert.match(/VALUES\s*([\s\S]*?)\)\s*AS\s+\w+\s*\(/i)?.[1]
    : insert.match(/VALUES\s*([\s\S]*)/i)?.[1]
  if (!valuesRegion) return null

  const rows = sqlTuples(valuesRegion)
  if (rows.length === 0) return null
  let sum = 0
  for (const row of rows) {
    const seats = sqlInteger(row[seatsIdx])
    if (seats === null) return null
    sum += seats
  }
  return sum
}

function updatesNullCeilingOnly(insert: string) {
  const conflict = insert.match(/\bON\s+CONFLICT\b[\s\S]*$/i)?.[0] ?? ""
  if (!/\bDO\s+UPDATE\b/i.test(conflict)) return false
  if (/\bDO\s+NOTHING\b/i.test(conflict)) return false
  const setBody = conflict.match(/\bSET\b([\s\S]*?)(?:\bWHERE\b|$)/i)?.[1]
  if (!setBody) return false
  const targets = splitSqlValues(setBody)
    .map((assignment) =>
      assignment.split("=")[0]?.trim().replace(/"/g, "").toLowerCase(),
    )
    .filter(Boolean)
  if (targets.length !== 1 || targets[0] !== "max_cover_capacity") return false
  return (
    /\bmax_cover_capacity\s+IS\s+NULL\b/i.test(conflict) ||
    /\bCOALESCE\s*\(\s*(?:restaurant_settings\.)?max_cover_capacity\b/i.test(
      conflict,
    )
  )
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
    expect(floor).toMatch(/floorDropCell/)
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

    const layout = await import("@/lib/floor/layout")
    expect(layout.shouldOpenMobileInspector).toEqual(expect.any(Function))
    expect(layout.shouldOpenMobileInspector(1024)).toBe(false)
    expect(layout.shouldOpenMobileInspector(1280)).toBe(false)
  })

  it("mobile Sheet unmounts at lg so the overlay cannot stick", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const sheetOpen = floor.indexOf("<Sheet")
    expect(sheetOpen).toBeGreaterThan(-1)
    const sheetClose = floor.indexOf("</Sheet>", sheetOpen)
    expect(sheetClose).toBeGreaterThan(sheetOpen)
    const sheet = floor.slice(sheetOpen, sheetClose + "</Sheet>".length)

    expect(sheet).not.toMatch(/\blg:hidden\b/)
    expect(floor.slice(0, sheetOpen)).toMatch(
      /shouldOpenMobileInspector\(\s*[A-Za-z_$][\w$]*\s*\)\s*(?:&&|\?)\s*\(\s*$/,
    )
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

  it("mobile Sheet inspector exposes the same permitted table management actions as the side inspector", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const sheetOpen = floor.indexOf("<Sheet open={mobileInspectorOpen}")
    expect(sheetOpen).toBeGreaterThan(-1)
    const sheetClose = floor.indexOf("</Sheet>", sheetOpen)
    expect(sheetClose).toBeGreaterThan(sheetOpen)
    const sheet = floor.slice(sheetOpen, sheetClose + "</Sheet>".length)

    expect(sheet.startsWith("<Sheet open={mobileInspectorOpen}")).toBe(true)
    expect(sheet).toMatch(
      /<Sheet\s+open=\{mobileInspectorOpen\}[^>]*onOpenChange=\{setMobileInspectorOpen\}/,
    )
    expect(sheet).not.toMatch(/setSelectedId\(\s*null\s*\)/)
    expect(sheet).toMatch(
      /<SheetTitle>[\s\S]*?t\(\s*["']staff\.floor\.tableHeading["'][\s\S]*?selected[\s\S]*?\.label[\s\S]*?<\/SheetTitle>/,
    )

    expect(sheet).toMatch(/\badjustSeats\b/)
    expect(sheet).toMatch(/\badjustExpected\b/)
    expect(sheet).toMatch(/\bcombineSelected\b/)
    expect(sheet).toMatch(/\bremoveTable\b/)
    expect(sheet).toMatch(/\btoggleUnlock\b/)
    expect(sheet).toMatch(/\bsetStatus\b/)
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

    // FP-15-UNAVAILABLE: dining-room chip renders CHF only when billTotal
    // is a number. MUST NOT coerce null/undefined with ?? 0 or || 0.
    expect(chip).toMatch(
      /typeof\s+t\.billTotal\s*===\s*["']number["'][\s\S]*CHF/,
    )
    expect(chip).not.toMatch(/(?:t\.)?billTotal\s*(?:\?\?|\|\|)\s*0/)

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

  it("floor chip party size does not fall back to table seats", () => {
    const floor = read("components/staff/floor-plan.tsx")

    // Dining-room chip <button> only — inspector already shows
    // {selected.reservation.partySize} and must not satisfy FP-4-PARTY.
    const chipStart = floor.indexOf("onChipPointerDown(t, event)")
    expect(chipStart).toBeGreaterThan(-1)
    const buttonOpen = floor.lastIndexOf("<button", chipStart)
    expect(buttonOpen).toBeGreaterThan(-1)
    const buttonClose = floor.indexOf("</button>", chipStart)
    expect(buttonClose).toBeGreaterThan(buttonOpen)
    const chip = floor.slice(buttonOpen, buttonClose + "</button>".length)

    expect(chip).toContain("onChipPointerDown")
    expect(chip).not.toMatch(/selected\.reservation/)

    // Chip size class MAY still use t.seats; isolate the party-size slot
    // (Users icon figure) so a capacity cue is not confused with party size.
    const usersAt = chip.indexOf("<Users")
    expect(usersAt).toBeGreaterThan(-1)
    const slotOpen = chip.lastIndexOf("<span", usersAt)
    expect(slotOpen).toBeGreaterThan(-1)
    const slotClose = chip.indexOf("</span>", usersAt)
    expect(slotClose).toBeGreaterThan(slotOpen)
    const partySlot = chip.slice(slotOpen, slotClose + "</span>".length)

    // FP-4-PARTY: occupying reservation party_size only — MUST NOT fall
    // back to tables.seats (?? / || / ternary) in that slot.
    expect(partySlot).not.toMatch(/t\.seats/)
    expect(partySlot).not.toMatch(
      /partySize\s*(?:\?\?|\|\||\?[^:]*:)\s*t\.seats/,
    )
    expect(partySlot).toMatch(/t\.reservation(?:\?)?\.partySize/)

    // Occupying figure is reservation party size with no seats fallback.
    expect(chip).toMatch(/\{t\.reservation(?:\?)?\.partySize\}/)

    // Unassigned path still omits guest/time (existing FP-4 pins).
    expect(chip).toMatch(/\{t\.reservation \?/)
    expect(chip).toMatch(/\{t\.reservation\.guestName\}/)
    const ungated = chip.replace(
      /\{t\.reservation \? \([\s\S]*?\) : null\}/g,
      "",
    )
    expect(ungated).not.toMatch(/t\.reservation\.guestName/)
    expect(ungated).not.toMatch(/t\.reservation\.time/)
  })

  it("seed sets max cover capacity to the dining-room seat sum before inserting tables", () => {
    const seed = read("supabase/seed.sql")
    const masked = maskSqlComments(seed)
    const settings = findInsert(masked, "restaurant_settings")
    const tables = diningRoomTablesInsert(seed, masked)

    expect(settings).not.toBeNull()
    expect(tables).not.toBeNull()
    if (!settings || !tables) return

    const columns = columnList(settings.text, "restaurant_settings")
    const values = valuesTuple(settings.text)
    const seatSum = diningRoomSeatSum(tables.text)
    const capacity = sqlInteger(values[columns.indexOf("max_cover_capacity")])

    expect({
      id: sqlInteger(values[columns.indexOf("id")]),
      listsMaxCoverCapacity: columns.includes("max_cover_capacity"),
      capacity,
      seatSum,
      updatesNullCeilingOnly: updatesNullCeilingOnly(settings.text),
      settingsBeforeTables: settings.offset < tables.offset,
    }).toEqual({
      id: 1,
      listsMaxCoverCapacity: true,
      capacity: seatSum,
      seatSum,
      updatesNullCeilingOnly: true,
      settingsBeforeTables: true,
    })
  })

  it("floor grid shrinks so the fixed canvas scrolls inside the page", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const gridToken = "lg:grid-cols-[1fr_300px]"
    const gridAt = floor.indexOf(gridToken)
    expect(gridAt).toBeGreaterThan(-1)

    const classAttr = 'className="'
    const gridClassOpen = floor.lastIndexOf(classAttr, gridAt)
    expect(gridClassOpen).toBeGreaterThan(-1)
    const gridClassStart = gridClassOpen + classAttr.length
    const gridClassEnd = floor.indexOf('"', gridClassStart)
    expect(gridClassEnd).toBeGreaterThan(gridClassStart)
    const gridClass = floor.slice(gridClassStart, gridClassEnd)
    expect(gridClass).toContain(gridToken)
    // FP-12: default min-width:auto on this grid keeps the fixed canvas
    // from shrinking, so overflow-auto below never becomes the scrollport.
    expect(gridClass.split(/\s+/)).toContain("min-w-0")

    const nextClassOpen = floor.indexOf(classAttr, gridClassEnd)
    expect(nextClassOpen).toBeGreaterThan(gridClassEnd)
    const nextClassStart = nextClassOpen + classAttr.length
    const nextClassEnd = floor.indexOf('"', nextClassStart)
    expect(nextClassEnd).toBeGreaterThan(nextClassStart)
    const mainColumnClass = floor.slice(nextClassStart, nextClassEnd)
    expect(mainColumnClass.split(/\s+/)).toContain("min-w-0")

    const canvasAt = floor.indexOf("canvas.cols * FLOOR_CELL_PX")
    expect(canvasAt).toBeGreaterThan(-1)
    const canvasTag = floor.lastIndexOf("<div", canvasAt)
    expect(canvasTag).toBeGreaterThan(-1)
    const wrapperClassOpen = floor.lastIndexOf(classAttr, canvasTag)
    expect(wrapperClassOpen).toBeGreaterThan(-1)
    const wrapperClassStart = wrapperClassOpen + classAttr.length
    const wrapperClassEnd = floor.indexOf('"', wrapperClassStart)
    expect(wrapperClassEnd).toBeGreaterThan(wrapperClassStart)
    expect(wrapperClassEnd).toBeLessThan(canvasTag)
    const wrapperClass = floor.slice(wrapperClassStart, wrapperClassEnd)
    expect(wrapperClass.split(/\s+/)).toContain("overflow-auto")
  })

  it("floor canvas stacking stays under the header and the side inspector sticks below it", () => {
    const floor = read("components/staff/floor-plan.tsx")
    const classAttr = 'className="'

    const canvasAt = floor.indexOf("canvas.cols * FLOOR_CELL_PX")
    expect(canvasAt).toBeGreaterThan(-1)
    const canvasTag = floor.lastIndexOf("<div", canvasAt)
    expect(canvasTag).toBeGreaterThan(-1)
    const wrapperClassOpen = floor.lastIndexOf(classAttr, canvasTag)
    expect(wrapperClassOpen).toBeGreaterThan(-1)
    const wrapperClassStart = wrapperClassOpen + classAttr.length
    const wrapperClassEnd = floor.indexOf('"', wrapperClassStart)
    expect(wrapperClassEnd).toBeGreaterThan(wrapperClassStart)
    expect(wrapperClassEnd).toBeLessThan(canvasTag)
    const wrapperTokens = floor
      .slice(wrapperClassStart, wrapperClassEnd)
      .split(/\s+/)
      .filter(Boolean)
    expect(wrapperTokens).toContain("overflow-auto")

    // Desktop inspector only: t("staff.floor.selected") is not the Sheet's
    // staff.floor.selectedTable heading.
    const selectedKey = 't("staff.floor.selected")'
    const selectedAt = floor.indexOf(selectedKey)
    expect(selectedAt).toBeGreaterThan(-1)
    const sheetAt = floor.indexOf("<Sheet")
    expect(sheetAt).toBeGreaterThan(selectedAt)

    let inspectorClass = ""
    let cursor = selectedAt
    while (cursor > 0) {
      const classOpen = floor.lastIndexOf(classAttr, cursor - 1)
      if (classOpen < 0) break
      const classStart = classOpen + classAttr.length
      const classEnd = floor.indexOf('"', classStart)
      if (classEnd < 0) break
      const candidate = floor.slice(classStart, classEnd)
      const tokens = candidate.split(/\s+/).filter(Boolean)
      if (classEnd < selectedAt && tokens.includes("lg:block")) {
        const tagOpen = floor.lastIndexOf("<", classOpen)
        expect(floor.slice(tagOpen, classOpen)).toContain("div")
        expect(floor.slice(tagOpen, classOpen)).not.toContain("Sheet")
        inspectorClass = candidate
        break
      }
      cursor = classOpen
    }

    const inspectorTokens = inspectorClass.split(/\s+/).filter(Boolean)
    expect(inspectorTokens).toContain("lg:block")

    // FP-12: isolate keeps chip z-index under the sticky header, and the
    // lg inspector sticks below that header in its own scroll box.
    expect({
      isolate: wrapperTokens.includes("isolate"),
      sticky: inspectorTokens.includes("lg:sticky"),
      top: inspectorTokens.some((token) => token.startsWith("lg:top-")),
      maxH: inspectorTokens.some((token) => token.startsWith("lg:max-h-")),
      overflowY: inspectorTokens.includes("lg:overflow-y-auto"),
      selfStart: inspectorTokens.includes("lg:self-start"),
    }).toEqual({
      isolate: true,
      sticky: true,
      top: true,
      maxH: true,
      overflowY: true,
      selfStart: true,
    })
  })
})
