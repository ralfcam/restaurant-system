import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("POS table picker from live floor inventory", () => {
  it("POS table picker lists live getTables() tables, not the TABLES seed", () => {
    const page = read("app/pos/page.tsx")
    const terminal = read("components/staff/pos-terminal.tsx")

    expect(page).not.toMatch(/\bTABLES\b/)
    expect(terminal).not.toMatch(/\bTABLES\b/)

    expect(page).toMatch(/getTables\(/)
    expect(page).toMatch(/dynamic\s*=\s*["']force-dynamic["']/)
    expect(page).toMatch(/<PosTerminal[\s\S]*tables=/)

    expect(terminal).toMatch(/tables\.map\(/)

    const tableLabelAt = terminal.indexOf('t("staff.pos.tableLabel")')
    const serverLabelAt = terminal.indexOf('t("staff.pos.serverLabel")')
    const tableSelect =
      tableLabelAt === -1 || serverLabelAt === -1
        ? ""
        : terminal.slice(tableLabelAt, serverLabelAt)
    expect(tableSelect).toMatch(/tableChoices\.map\(/)
    expect(terminal).toMatch(/useState\(\s*tables\[0\]\?\.label/)
  })

  it("table select disables with a placeholder when no tables are available", () => {
    const terminal = read("components/staff/pos-terminal.tsx")
    const tableLabelAt = terminal.indexOf('t("staff.pos.tableLabel")')
    const serverLabelAt = terminal.indexOf('t("staff.pos.serverLabel")')
    const tableSelect =
      tableLabelAt === -1 || serverLabelAt === -1
        ? ""
        : terminal.slice(tableLabelAt, serverLabelAt)
    expect(tableSelect).toMatch(/disabled=\{tables\.length === 0\}/)
    expect(tableSelect).toMatch(/placeholder=\{t\("staff\.pos\.noTables"\)\}/)
  })
})
