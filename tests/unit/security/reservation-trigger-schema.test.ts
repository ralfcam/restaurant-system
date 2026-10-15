import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const CREATE_MARKER =
  "CREATE OR REPLACE FUNCTION validate_reservation_availability()"

const REQUIRED_IN_MOVE = [
  "CREATE SCHEMA IF NOT EXISTS private",
  "REVOKE ALL ON SCHEMA private FROM PUBLIC",
  "REVOKE ALL ON SCHEMA private FROM anon, authenticated",
  "ALTER FUNCTION public.validate_reservation_availability() SET SCHEMA private",
  "EXECUTE FUNCTION private.validate_reservation_availability()",
  "REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM PUBLIC",
  "REVOKE ALL ON FUNCTION private.validate_reservation_availability() FROM anon, authenticated",
] as const

const SCHEMA_GRANT_TO_API_ROLES =
  /GRANT\s+(?:USAGE|ALL)(?:\s+PRIVILEGES)?\s+ON\s+SCHEMA\s+private\s+TO\s+[^;]*\b(?:PUBLIC|anon|authenticated)\b/i

const EXECUTE_GRANT_TO_API_ROLES =
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:(?:public|private)\.)?validate_reservation_availability\s*\(\s*\)\s+TO\s+[^;]*\b(?:PUBLIC|anon|authenticated)\b/i

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "")
}

describe("RES-TRIGGER-EXEC private schema", () => {
  it("booking trigger function lives in private and is not a guest RPC", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations")
    const files = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort()
      .map((name) => ({
        name,
        text: stripSqlComments(
          readFileSync(path.join(migrationsDir, name), "utf8"),
        ),
      }))

    const createNames = files
      .filter((file) => file.text.includes(CREATE_MARKER))
      .map((file) => file.name)
    expect(createNames.length).toBeGreaterThan(0)

    const move = files.find(
      (file) =>
        createNames.every((name) => file.name > name) &&
        REQUIRED_IN_MOVE.every((snippet) => file.text.includes(snippet)),
    )

    for (const snippet of REQUIRED_IN_MOVE) {
      expect(move?.text ?? "").toContain(snippet)
    }
    expect(move?.text ?? "").not.toContain(CREATE_MARKER)
    expect(move?.text ?? "").not.toMatch(SCHEMA_GRANT_TO_API_ROLES)
    expect(move?.text ?? "").not.toMatch(EXECUTE_GRANT_TO_API_ROLES)
  })
})
