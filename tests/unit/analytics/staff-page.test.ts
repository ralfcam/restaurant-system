import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type AnalyticsPeriodInput = {
  from?: string
  to?: string
  preset?: 7 | 30 | 90
}

type Row = Record<string, unknown>

const RANGE = { from: "2026-09-06", to: "2026-09-12" } as const

const PII = {
  guest_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "555-0100",
} as const

const PII_FIELDS = ["guest_name", "email", "phone"] as const

const SUCCESS_KEYS = [
  "cancelled",
  "duration",
  "from",
  "noShow",
  "patterns",
  "to",
] as const

const root = process.cwd()
const analyticsDir = path.join(root, "app/admin/analytics")
const analyticsPage = path.join(analyticsDir, "page.tsx")

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      return () => self
    },
  })
  return self
}

function stubFrom(input: { reservations: Row[]; statusEvents?: Row[] }) {
  mocks.from.mockImplementation((name: string) => {
    if (name === "reservations") {
      return thenable({ data: input.reservations, error: null })
    }
    if (name === "status_events") {
      return thenable({ data: input.statusEvents ?? [], error: null })
    }
    return thenable({ data: [], error: null })
  })
}

function readAnalyticsTree() {
  if (!existsSync(analyticsDir)) return ""
  return readdirSync(analyticsDir)
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => readFileSync(path.join(analyticsDir, name), "utf8"))
    .join("\n")
}

/** Report body only — StaffShell `user.email` is staff chrome, not guest PII. */
function analyticsUiSource(tree: string) {
  return (
    tree.match(/<StaffShell\b[\s\S]*?>([\s\S]*)<\/StaffShell>/)?.[1] ?? tree
  )
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys)
    return keys
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key)
      collectKeys(nested, keys)
    }
  }
  return keys
}

describe("/admin/analytics staff page", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("analytics UI and JSON omit guest PII", async () => {
    expect(existsSync(analyticsPage)).toBe(true)

    const tree = readAnalyticsTree()
    const ui = analyticsUiSource(tree)
    for (const field of PII_FIELDS) {
      expect(ui).not.toMatch(new RegExp(`\\b${field}\\b`))
    }
    expect(tree).not.toMatch(/\bguest_name\b/)

    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const load = getReservationAnalytics as (
      period?: AnalyticsPeriodInput,
    ) => Promise<Record<string, unknown>>

    stubFrom({
      reservations: [
        {
          id: "r-pii",
          date: "2026-09-10",
          time: "19:00",
          party_size: 2,
          status: "completed",
          completed_at: "2026-09-10T19:45:00.000Z",
          ...PII,
        },
      ],
      statusEvents: [
        {
          entity_type: "reservation",
          entity_id: "r-pii",
          to_status: "seated",
          created_at: "2026-09-10T19:00:00.000Z",
        },
      ],
    })

    const result = await load(RANGE)
    expect(result).not.toHaveProperty("error")
    expect(Object.keys(result).sort()).toEqual([...SUCCESS_KEYS].sort())

    const keys = collectKeys(result)
    for (const field of PII_FIELDS) {
      expect(keys.has(field)).toBe(false)
    }

    const payload = JSON.stringify(result)
    expect(payload).not.toMatch(/"guest_name"/)
    expect(payload).not.toMatch(/"email"/)
    expect(payload).not.toMatch(/"phone"/)
    expect(payload).not.toContain(PII.guest_name)
    expect(payload).not.toContain(PII.email)
    expect(payload).not.toContain(PII.phone)
  })
})
