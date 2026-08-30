import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const seedPath = path.join(process.cwd(), "supabase", "seed.sql")
const STAFF_USER_ID = "11111111-1111-1111-1111-111111111111"

function staffAuthUsersInsert(sql: string): string {
  const match = sql.match(
    /INSERT INTO auth\.users\s*\([\s\S]*?\)\s*VALUES\s*\([\s\S]*?\)\s*ON CONFLICT/i,
  )
  if (!match) {
    throw new Error("auth.users insert not found in seed.sql")
  }
  if (!match[0].includes(STAFF_USER_ID)) {
    throw new Error(
      `auth.users insert does not include staff user ${STAFF_USER_ID}`,
    )
  }
  return match[0]
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

describe("seed staff claim", () => {
  it("seed staff user raw_app_meta_data includes role staff", () => {
    const sql = readFileSync(seedPath, "utf8")
    const insert = staffAuthUsersInsert(sql)
    const columns = columnNames(insert)
    const valuesMatch = insert.match(/VALUES\s*\(([\s\S]*)\)\s*ON CONFLICT/i)
    if (!valuesMatch) {
      throw new Error("auth.users VALUES list not found")
    }
    const values = splitSqlValues(valuesMatch[1])

    const idIdx = columns.indexOf("id")
    const appMetaIdx = columns.indexOf("raw_app_meta_data")
    expect(idIdx).toBeGreaterThanOrEqual(0)
    expect(appMetaIdx).toBeGreaterThanOrEqual(0)
    expect(unquoteSqlString(values[idIdx])).toBe(STAFF_USER_ID)

    const appMeta = JSON.parse(unquoteSqlString(values[appMetaIdx])) as {
      role?: unknown
    }
    expect(appMeta).toMatchObject({ role: "staff" })
  })
})
