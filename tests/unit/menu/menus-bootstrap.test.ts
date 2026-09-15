import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const GRANT_SELECT_MENUS = "GRANT SELECT ON TABLE menus"
const CREATE_MENUS = "CREATE TABLE IF NOT EXISTS menus"
const REQUIRED_COLUMNS = ["id", "title", "title_en", "sort_order"] as const

describe("menus privilege bootstrap", () => {
  it("menus privilege migrations create the table before granting", () => {
    const migrationsDir = path.join(root, "supabase/migrations")
    const files = readdirSync(migrationsDir).filter((name) =>
      name.endsWith(".sql"),
    )

    const privilegeFiles = files.filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8")
      return sql.includes(GRANT_SELECT_MENUS)
    })

    expect(privilegeFiles.length).toBeGreaterThan(0)

    const missingBootstrap = privilegeFiles.filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8")
      const createIdx = sql.indexOf(CREATE_MENUS)
      const grantIdx = sql.indexOf(GRANT_SELECT_MENUS)
      if (createIdx === -1 || createIdx >= grantIdx) return true

      const columns = sql
        .slice(createIdx, grantIdx)
        .match(/CREATE TABLE IF NOT EXISTS menus\s*\(([\s\S]*?)\)/)?.[1]
      if (!columns) return true

      return REQUIRED_COLUMNS.some(
        (col) => !new RegExp(`\\b${col}\\b`).test(columns),
      )
    })

    expect(missingBootstrap).toEqual([])
  })
})
