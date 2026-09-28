import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()

/** Exact TOML table headers for the five enabled local listen ports (LSP-1). */
const ENABLED_PORT_TABLES = [
  "api",
  "db",
  "studio",
  "local_smtp",
  "analytics",
] as const

const EXPECTED_PORTS: Record<(typeof ENABLED_PORT_TABLES)[number], number> = {
  api: 45321,
  db: 45322,
  studio: 45323,
  local_smtp: 45324,
  analytics: 45327,
}

/**
 * Resolve `key = <raw>` under an exact `[header]` table.
 * `[db.pooler]` is a different table and must not satisfy `[db]`.
 * Comment lines that merely mention a value do not count.
 */
function rawUnderExactTable(toml: string, table: string, key: string): string {
  const header = `[${table}]`
  const lines = toml.split(/\r?\n/)
  let inTable = false
  const keyPattern = new RegExp(`^${key}\\s*=\\s*(.+?)\\s*(?:#.*)?$`)

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith("[")) {
      // Exact header only — `[db.pooler]` must not enter the `[db]` body.
      inTable = trimmed === header
      continue
    }
    if (!inTable) continue
    if (trimmed.startsWith("#") || trimmed === "") continue

    const match = trimmed.match(keyPattern)
    if (match) return match[1].trim()
  }

  throw new Error(`No ${key} assignment under exact table ${header}`)
}

/** Resolve `port = <int>` under an exact `[header]` table. */
function portUnderExactTable(toml: string, table: string): number {
  const raw = rawUnderExactTable(toml, table, "port")
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Non-integer port under exact table [${table}]`)
  }
  return Number(raw)
}

/** Resolve `<key> = <int>` under an exact `[header]` table. */
function intUnderExactTable(toml: string, table: string, key: string): number {
  const raw = rawUnderExactTable(toml, table, key)
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Non-integer ${key} under exact table [${table}]`)
  }
  return Number(raw)
}

/**
 * Resolve `<key> = true|false` under an exact `[header]` table.
 * Returns a boolean (not the string `"false"` / `"true"`).
 */
function boolUnderExactTable(
  toml: string,
  table: string,
  key: string,
): boolean {
  const raw = rawUnderExactTable(toml, table, key)
  if (raw === "true") return true
  if (raw === "false") return false
  throw new Error(`Non-boolean ${key} under exact table [${table}]`)
}

describe("local supabase ports", () => {
  it("enabled local ports are the committed block below 49152", () => {
    const toml = readFileSync(
      path.join(repoRoot, "supabase", "config.toml"),
      "utf8",
    )

    const parsed = Object.fromEntries(
      ENABLED_PORT_TABLES.map((table) => [
        table,
        portUnderExactTable(toml, table),
      ]),
    ) as Record<(typeof ENABLED_PORT_TABLES)[number], number>

    expect(parsed).toEqual(EXPECTED_PORTS)

    for (const table of ENABLED_PORT_TABLES) {
      expect(parsed[table]).toBeLessThan(49152)
      expect(Number.isInteger(parsed[table])).toBe(true)
    }
  })

  it("shadow port and disabled pooler stay on their current ports", () => {
    const toml = readFileSync(
      path.join(repoRoot, "supabase", "config.toml"),
      "utf8",
    )

    expect(intUnderExactTable(toml, "db", "shadow_port")).toBe(54320)
    expect(boolUnderExactTable(toml, "db.pooler", "enabled")).toBe(false)
    expect(portUnderExactTable(toml, "db.pooler")).toBe(54329)
  })

  it("current local-stack instructions use the committed API and DB ports", () => {
    const read = (...segments: string[]) =>
      readFileSync(path.join(repoRoot, ...segments), "utf8")

    const namesApiPort = (text: string) =>
      text.includes("http://127.0.0.1:45321") ||
      text.includes("127.0.0.1:45321")

    const vitestGuide = read("docs", "testing", "Vitest-Integration-Guide.md")
    expect(namesApiPort(vitestGuide)).toBe(true)
    expect(vitestGuide.includes("54321")).toBe(false)

    const designPatterns = read("docs", "testing", "Design-And-Patterns.md")
    expect(namesApiPort(designPatterns)).toBe(true)
    expect(designPatterns.includes("54321")).toBe(false)

    const deploy = read("docs", "runbooks", "deploy.md")
    expect(deploy.includes("127.0.0.1:45321")).toBe(true)
    expect(deploy.includes("54321")).toBe(false)

    const tddRed = read(".cursor", "agents", "tdd-red.md")
    expect(tddRed.includes("127.0.0.1:45322")).toBe(true)
    expect(tddRed.includes("54322")).toBe(false)
  })

  it("local URL fixtures cite API port 45321 and hours isolation accepts another loopback port", () => {
    const read = (...segments: string[]) =>
      readFileSync(path.join(repoRoot, ...segments), "utf8")

    const fixturePaths = [
      ["tests", "unit", "auth", "staff-proxy.test.ts"],
      ["tests", "unit", "scheduling", "hours-mutation-target.test.ts"],
      ["tests", "unit", "reservations", "reservation-integ-isolation.test.ts"],
      ["tests", "unit", "inquiries", "inquiry-integ-isolation.test.ts"],
    ] as const

    for (const segments of fixturePaths) {
      const source = read(...segments)
      expect(source.includes("45321")).toBe(true)
      expect(source.includes("54321")).toBe(false)
    }

    const hoursSource = read(
      "tests",
      "unit",
      "scheduling",
      "hours-mutation-target.test.ts",
    )
    expect(
      hoursSource.includes(
        'isIsolatedHoursMutationTarget("http://127.0.0.1:1")',
      ),
    ).toBe(true)
  })
})
