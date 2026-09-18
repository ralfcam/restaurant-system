import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "18:00"),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: mocks.today,
  getNowTimeInRestaurantTZ: mocks.nowTime,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({}),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff-1" } } }) },
  }),
}))

type Row = Record<string, unknown>

const POSTGREST_MAX_ROWS = 1000
const TABLE_LABEL = "7"
const FIRST_PAGE_ROW_TOTAL = 1
const NEXT_PAGE_ROW_TOTAL = 3.5

function matchingOrder(total: number) {
  return { table_label: TABLE_LABEL, total, status: "new" }
}

function allMatchingOrders() {
  return [
    ...Array.from({ length: POSTGREST_MAX_ROWS }, () =>
      matchingOrder(FIRST_PAGE_ROW_TOTAL),
    ),
    matchingOrder(NEXT_PAGE_ROW_TOTAL),
  ]
}

function pageOrders(rangeStart: number | null, rangeEnd: number | null) {
  const all = allMatchingOrders()
  if (rangeStart === null || rangeEnd === null) {
    return all.slice(0, POSTGREST_MAX_ROWS)
  }
  return all.slice(rangeStart, rangeEnd + 1).slice(0, POSTGREST_MAX_ROWS)
}

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

/** PostgREST-shaped select: unpaginated or each `.range` page caps at max_rows. */
function ordersPagedThenable() {
  let rangeStart: number | null = null
  let rangeEnd: number | null = null
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: { data: Row[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) =>
          Promise.resolve({
            data: pageOrders(rangeStart, rangeEnd),
            error: null,
          }).then(resolve, reject)
      }
      if (prop === "range") {
        return (start: number, end: number) => {
          rangeStart = start
          rangeEnd = end
          return self
        }
      }
      return () => self
    },
  })
  return self
}

function emptyTableApi() {
  return {
    select: () => thenable({ data: [], error: null }),
    insert: async () => ({ error: null }),
    update: () => thenable({ error: null }),
    delete: () => ({ eq: () => thenable({ error: null }) }),
  }
}

describe("getFloorSnapshot seated bills", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("18:00")
    mocks.from.mockImplementation((name: string) => {
      if (name === "orders") {
        return {
          select: () => ordersPagedThenable(),
          insert: async () => ({ error: null }),
          update: () => thenable({ error: null }),
          delete: () => ({ eq: () => thenable({ error: null }) }),
        }
      }
      return emptyTableApi()
    })
  })

  it("floor snapshot sums orders past the PostgREST max_rows page", async () => {
    const { getFloorSnapshot } = await import("@/app/actions/reservations")
    const snapshot = await getFloorSnapshot("2026-08-18")

    expect(snapshot.tableTotals?.[TABLE_LABEL]).toBe(
      POSTGREST_MAX_ROWS * FIRST_PAGE_ROW_TOTAL + NEXT_PAGE_ROW_TOTAL,
    )
  })

  it("floor snapshot does not treat an orders query error as a zero bill", async () => {
    mocks.from.mockImplementation((name: string) => {
      if (name === "orders") {
        return {
          select: () =>
            thenable({
              data: null,
              error: { message: "orders unavailable" },
            }),
          insert: async () => ({ error: null }),
          update: () => thenable({ error: null }),
          delete: () => ({ eq: () => thenable({ error: null }) }),
        }
      }
      return emptyTableApi()
    })

    const { getFloorSnapshot } = await import("@/app/actions/reservations")
    const snapshot = await getFloorSnapshot("2026-08-18")

    // FP-15-UNAVAILABLE: query error is null totals, never a successful {}.
    expect(snapshot.tableTotals).toBe(null)

    const hook = read("hooks/use-floor-plan.ts")
    expect(hook).not.toMatch(/tableTotals\s*\?\?\s*\{\s*\}/)

    // Dining-room chip <button> only — same slice as schema.test.ts.
    const floor = read("components/staff/floor-plan.tsx")
    const chipStart = floor.indexOf("onChipPointerDown(t, event)")
    expect(chipStart).toBeGreaterThan(-1)
    const buttonOpen = floor.lastIndexOf("<button", chipStart)
    expect(buttonOpen).toBeGreaterThan(-1)
    const buttonClose = floor.indexOf("</button>", chipStart)
    expect(buttonClose).toBeGreaterThan(buttonOpen)
    const chip = floor.slice(buttonOpen, buttonClose + "</button>".length)

    expect(chip).toContain("onChipPointerDown")
    expect(chip).not.toMatch(/(?:t\.)?billTotal\s*\?\?\s*0/)
    expect(chip).toMatch(
      /typeof\s+t\.billTotal\s*===\s*["']number["'][\s\S]*CHF/,
    )
  })
})
