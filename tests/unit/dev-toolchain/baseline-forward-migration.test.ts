import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const BASELINE = "supabase/migrations/00000000000000_baseline.sql"
const DATED_MIGRATION =
  /(?:^|\/)supabase\/migrations\/(?!00000000000000_)\d{14}_[^/]+\.sql$/

/** True when a baseline edit has no new dated migration in the same path list. */
export function baselineChangeLacksDatedMigration(paths: string[]): boolean {
  const normalized = paths.map((entry) => entry.replaceAll("\\", "/"))
  const touchesBaseline = normalized.some(
    (entry) => entry === BASELINE || entry.endsWith(`/${BASELINE}`),
  )
  if (!touchesBaseline) return false
  return !normalized.some((entry) => DATED_MIGRATION.test(entry))
}

describe("baseline edits ship a dated migration", () => {
  it("fails a path list that only changes the baseline", () => {
    expect(
      baselineChangeLacksDatedMigration([
        "supabase/migrations/00000000000000_baseline.sql",
      ]),
    ).toBe(true)
  })

  it("passes when a new dated migration is in the same change", () => {
    expect(
      baselineChangeLacksDatedMigration([
        "supabase/migrations/00000000000000_baseline.sql",
        "supabase/migrations/20261005170000_hosted_baseline_columns.sql",
      ]),
    ).toBe(false)
  })

  it("ignores a change that does not touch the baseline", () => {
    expect(
      baselineChangeLacksDatedMigration(["app/actions/operations.ts"]),
    ).toBe(false)
  })

  it("forward file copies the baseline-only objects and a null-only ceiling", () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        "supabase/migrations/20261005170000_hosted_baseline_columns.sql",
      ),
      "utf8",
    )
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS email_normalized TEXT\s+GENERATED ALWAYS AS \(lower\(btrim\(email\)\)\) STORED/i,
    )
    expect(sql).toContain("reservations_email_normalized_idx")
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ/i)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ/i)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS allergens TEXT/i)
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS external_booking_id TEXT/i)
    expect(sql).toContain("reservations_external_booking_id_uidx")
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS restaurant_display_name TEXT/i,
    )
    expect(sql).toMatch(
      /ADD COLUMN IF NOT EXISTS show_reservation_phone BOOLEAN NOT NULL DEFAULT false/i,
    )
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION import_external_reservations(rows jsonb)",
    )
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION import_external_reservations\(jsonb\) FROM PUBLIC/i,
    )
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION import_external_reservations\(jsonb\) FROM anon, authenticated/i,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION import_external_reservations\(jsonb\) TO service_role/i,
    )
    expect(sql).toMatch(
      /UPDATE restaurant_settings\s+SET max_cover_capacity = GREATEST\(38[\s\S]*SUM\(seats\)\s*::\s*(?:integer|int)\b[\s\S]*WHERE id = 1 AND max_cover_capacity IS NULL/i,
    )
  })

  it("states that a baseline change must also add a dated migration", () => {
    const rule = readFileSync(
      path.join(process.cwd(), ".cursor/rules/supabase-migrations.mdc"),
      "utf8",
    )
    expect(rule).toContain(
      "A PR that changes `supabase/migrations/00000000000000_baseline.sql` must also add a new dated file under `supabase/migrations/`.",
    )
  })
})
