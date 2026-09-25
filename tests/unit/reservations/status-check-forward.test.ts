import { globSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const REQUIRED_STATUSES = [
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no_show",
] as const

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "")
}

function quotedInList(inner: string) {
  return [...inner.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

function extractAddConstraintStatusCheck(sql: string): string[] | null {
  const match = stripSqlComments(sql).match(
    /ADD CONSTRAINT\s+reservations_status_check\s+CHECK\s*\(\s*status\s+IN\s*\(([^)]+)\)/i,
  )
  return match ? quotedInList(match[1]) : null
}

function extractCreateTableStatusCheck(sql: string): string[] | null {
  const create = stripSqlComments(sql).match(
    /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+reservations\s*\(([\s\S]*?)\)\s*;/i,
  )
  if (!create) return null
  const check = create[1].match(/CHECK\s*\(\s*status\s+IN\s*\(([^)]+)\)/i)
  return check ? quotedInList(check[1]) : null
}

describe("reservations status-check last-writer", () => {
  it("dated last-writer replaces reservations status check with no_show and adds completed_at", () => {
    const baselineStatuses = extractCreateTableStatusCheck(
      read("supabase/migrations/00000000000000_baseline.sql"),
    )
    expect(baselineStatuses).toEqual(expect.arrayContaining(["no_show"]))

    const datedFiles = globSync("supabase/migrations/20*.sql", { cwd: root })
    const lastWriter = datedFiles.find((rel) => {
      const sql = read(rel)
      const body = stripSqlComments(sql)
      if (!/DROP CONSTRAINT IF EXISTS reservations_status_check/i.test(body)) {
        return false
      }
      if (!/ADD COLUMN IF NOT EXISTS completed_at/i.test(body)) {
        return false
      }
      const statuses = extractAddConstraintStatusCheck(sql)
      return (
        statuses !== null &&
        REQUIRED_STATUSES.every((status) => statuses.includes(status))
      )
    })

    expect(lastWriter).toBeDefined()
  })
})
