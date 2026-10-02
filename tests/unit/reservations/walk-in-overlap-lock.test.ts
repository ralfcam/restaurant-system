import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20261002150000_walk_in_table_label_lock.sql",
  ),
  "utf8",
)

function functionBody(sql: string, name: string): string {
  const marker = `CREATE OR REPLACE FUNCTION ${name}()`
  const start = sql.indexOf(marker)
  const end = sql.indexOf("$$;", start)
  return sql.slice(start, end)
}

describe("walk-in table label lock", () => {
  it("locks the assigned label before the overlap read and refuses the insert", () => {
    const fn = functionBody(migration, "reject_overlapping_table_label")
    const lockAt = fn.indexOf("pg_advisory_xact_lock")
    const readAt = fn.indexOf("FROM reservations r")
    expect(lockAt).toBeGreaterThan(0)
    expect(readAt).toBeGreaterThan(lockAt)
    expect(fn).toContain("133")
    expect(fn).toContain(
      "RAISE EXCEPTION 'That table is already reserved for an overlapping time.'",
    )
    expect(fn).toContain("NEW.table_label IS NULL")
    expect(fn).toContain("RETURN NEW")
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.reject_overlapping_table_label() FROM PUBLIC;",
    )
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.reject_overlapping_table_label() FROM anon, authenticated;",
    )
    expect(migration).toMatch(
      /CREATE TRIGGER reject_overlapping_table_label\s+BEFORE INSERT ON reservations\s+FOR EACH ROW\s+EXECUTE FUNCTION reject_overlapping_table_label\(\);/,
    )
  })
})
