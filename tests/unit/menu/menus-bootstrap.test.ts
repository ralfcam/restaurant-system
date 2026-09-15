import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const GRANT_SELECT_MENUS = "GRANT SELECT ON TABLE menus"
const CREATE_MENUS = "CREATE TABLE IF NOT EXISTS menus"
const ENABLE_RLS = "ENABLE ROW LEVEL SECURITY"
const PUBLIC_READ_MENUS = 'CREATE POLICY "Allow public read menus"'
const SERVICE_ROLE_MENUS =
  'CREATE POLICY "Allow service_role full access to menus"'
const DATED_MENUS_BOOTSTRAP = "20260915180000_menus_bootstrap.sql"
const SEED_TAB_IDS = ["midi", "soir", "boissons", "blanc", "rouge"] as const
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

  it("hosted menus bootstrap enables RLS and seeds the five tab ids", () => {
    const migrationsDir = path.join(root, "supabase/migrations")
    const datedForward = readFileSync(
      path.join(migrationsDir, DATED_MENUS_BOOTSTRAP),
      "utf8",
    )

    const datedMissing: string[] = []
    if (!datedForward.includes(ENABLE_RLS)) datedMissing.push(ENABLE_RLS)
    if (!datedForward.includes(PUBLIC_READ_MENUS)) {
      datedMissing.push(PUBLIC_READ_MENUS)
    }
    if (!datedForward.includes(SERVICE_ROLE_MENUS)) {
      datedMissing.push(SERVICE_ROLE_MENUS)
    }

    const insertWithConflict = datedForward.match(/INSERT[\s\S]*?ON CONFLICT/i)
    const insertSql = insertWithConflict?.[0] ?? ""
    const missingSeedIds = SEED_TAB_IDS.filter((id) => !insertSql.includes(id))
    if (!insertWithConflict || missingSeedIds.length > 0) {
      datedMissing.push(`INSERT of ${SEED_TAB_IDS.join(", ")} with ON CONFLICT`)
    }

    const files = readdirSync(migrationsDir).filter((name) =>
      name.endsWith(".sql"),
    )
    const createMenusFiles = files.filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8")
      return sql.includes(CREATE_MENUS)
    })

    expect(createMenusFiles.length).toBeGreaterThan(0)

    const missingRlsBeforeGrant = createMenusFiles.filter((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8")
      const grantIdx = sql.indexOf(GRANT_SELECT_MENUS)
      if (grantIdx === -1) return true
      const beforeGrant = sql.slice(0, grantIdx)
      return (
        !beforeGrant.includes(ENABLE_RLS) ||
        !beforeGrant.includes(PUBLIC_READ_MENUS) ||
        !beforeGrant.includes(SERVICE_ROLE_MENUS)
      )
    })

    expect({
      datedMissing,
      missingRlsBeforeGrant,
    }).toEqual({
      datedMissing: [],
      missingRlsBeforeGrant: [],
    })
  })
})
