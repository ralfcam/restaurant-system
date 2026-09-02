import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const seedPath = path.join(process.cwd(), "supabase", "seed.sql")
const STAFF_USER_ID = "11111111-1111-1111-1111-111111111111"
const SUPER_ADMIN_USER_ID = "22222222-2222-2222-2222-222222222222"
const SUPER_ADMIN_EMAIL = "superadmin@test.local"

const HOST_OR_ENV_VALUE =
  /localhost|127\.0\.0\.1|54321|tilcqrudqxznnpepxjqq|supabase\.co|https?:\/\//i

function authUsersInsertForId(sql: string, userId: string): string {
  const matches = sql.matchAll(
    /INSERT INTO auth\.users\s*\([\s\S]*?\)\s*VALUES\s*\([\s\S]*?\)\s*ON CONFLICT \(id\) DO NOTHING/gi,
  )
  for (const match of matches) {
    if (match[0].includes(userId)) return match[0]
  }
  throw new Error(
    `auth.users insert for ${userId} with ON CONFLICT (id) DO NOTHING not found in seed.sql`,
  )
}

function authIdentitiesInsertForId(sql: string, userId: string): string {
  const matches = sql.matchAll(
    /INSERT INTO auth\.identities\s*\([\s\S]*?\)\s*VALUES\s*\([\s\S]*?\)\s*ON CONFLICT/gi,
  )
  for (const match of matches) {
    if (match[0].includes(userId)) return match[0]
  }
  throw new Error(`auth.identities insert for ${userId} not found in seed.sql`)
}

function columnNames(insert: string): string[] {
  const cols = insert.match(
    /INSERT INTO auth\.users\s*\(([\s\S]*?)\)\s*VALUES/i,
  )
  if (!cols) {
    throw new Error("auth.users column list not found")
  }
  return cols[1]
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
}

function splitSqlValues(valuesSql: string): string[] {
  const values: string[] = []
  let current = ""
  let depth = 0
  let inSingle = false

  for (let i = 0; i < valuesSql.length; i++) {
    const ch = valuesSql[i]
    if (inSingle) {
      current += ch
      if (ch === "'" && valuesSql[i + 1] === "'") {
        current += valuesSql[++i]
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
      depth++
      current += ch
      continue
    }
    if (ch === ")") {
      depth--
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

function unquoteSqlString(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'")
  }
  return trimmed
}

describe("seed super-admin claim", () => {
  it("seed super-admin user raw_app_meta_data includes role super_admin", () => {
    expect(SUPER_ADMIN_USER_ID).not.toBe(STAFF_USER_ID)

    const sql = readFileSync(seedPath, "utf8")
    const insert = authUsersInsertForId(sql, SUPER_ADMIN_USER_ID)
    const identities = authIdentitiesInsertForId(sql, SUPER_ADMIN_USER_ID)

    expect(insert).toMatch(/ON CONFLICT \(id\) DO NOTHING/i)
    expect(identities).toContain(SUPER_ADMIN_USER_ID)
    expect(identities).toContain(SUPER_ADMIN_EMAIL)
    expect(insert + identities).not.toMatch(HOST_OR_ENV_VALUE)

    const columns = columnNames(insert)
    const valuesMatch = insert.match(/VALUES\s*\(([\s\S]*)\)\s*ON CONFLICT/i)
    if (!valuesMatch) {
      throw new Error("auth.users VALUES list not found")
    }
    const values = splitSqlValues(valuesMatch[1])

    const idIdx = columns.indexOf("id")
    const emailIdx = columns.indexOf("email")
    const appMetaIdx = columns.indexOf("raw_app_meta_data")
    expect(idIdx).toBeGreaterThanOrEqual(0)
    expect(appMetaIdx).toBeGreaterThanOrEqual(0)
    expect(unquoteSqlString(values[idIdx])).toBe(SUPER_ADMIN_USER_ID)
    expect(unquoteSqlString(values[idIdx])).not.toBe(STAFF_USER_ID)

    if (emailIdx >= 0) {
      const seededEmail = unquoteSqlString(values[emailIdx])
      if (seededEmail !== "") {
        expect(seededEmail).toBe(SUPER_ADMIN_EMAIL)
      }
    }

    const appMeta = JSON.parse(unquoteSqlString(values[appMetaIdx])) as {
      role?: unknown
    }
    expect(appMeta).toMatchObject({ role: "super_admin" })
  })
})
