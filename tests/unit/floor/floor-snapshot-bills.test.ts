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
const RESERVATION_ID = "res-visit-7"
const FIRST_PAGE_ROW_TOTAL = 1
const NEXT_PAGE_ROW_TOTAL = 3.5

function matchingOrder(total: number) {
  return { reservation_id: RESERVATION_ID, total, status: "new" }
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

type OrdersPageSink = {
  orders: { column: string; ascending?: boolean }[]
  ranges: [number, number][]
}

/** Page 2 yields the 1001st row only when `.order("id", { ascending: true })` precedes `.range`. */
function ordersStableIdOrderThenable(sink?: OrdersPageSink) {
  let rangeStart: number | null = null
  let rangeEnd: number | null = null
  let orderedByIdAscBeforeRange = false
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: { data: Row[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => {
          const isPage2 =
            rangeStart !== null && rangeStart >= POSTGREST_MAX_ROWS
          const data = isPage2
            ? orderedByIdAscBeforeRange
              ? [matchingOrder(NEXT_PAGE_ROW_TOTAL)]
              : []
            : pageOrders(rangeStart, rangeEnd)
          return Promise.resolve({ data, error: null }).then(resolve, reject)
        }
      }
      if (prop === "order") {
        return (column: string, options?: { ascending?: boolean }) => {
          sink?.orders.push({ column, ascending: options?.ascending })
          if (
            column === "id" &&
            options?.ascending === true &&
            rangeStart === null
          ) {
            orderedByIdAscBeforeRange = true
          }
          return self
        }
      }
      if (prop === "range") {
        return (start: number, end: number) => {
          sink?.ranges.push([start, end])
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

    expect(snapshot.tableTotals?.[RESERVATION_ID]).toBe(
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

  it("floor snapshot pages orders with a stable id order", async () => {
    mocks.from.mockImplementation((name: string) => {
      if (name === "orders") {
        return {
          select: () => ordersStableIdOrderThenable(),
          insert: async () => ({ error: null }),
          update: () => thenable({ error: null }),
          delete: () => ({ eq: () => thenable({ error: null }) }),
        }
      }
      return emptyTableApi()
    })

    const { getFloorSnapshot } = await import("@/app/actions/reservations")
    const snapshot = await getFloorSnapshot("2026-08-18")

    expect(snapshot.tableTotals?.[RESERVATION_ID]).toBe(
      POSTGREST_MAX_ROWS * FIRST_PAGE_ROW_TOTAL + NEXT_PAGE_ROW_TOTAL,
    )
  })

  it("getFloorSnapshot keys seated bill totals by reservation id and keeps paging and unavailable semantics", async () => {
    const selects: string[] = []
    const orders: { column: string; ascending?: boolean }[] = []
    const ranges: [number, number][] = []

    mocks.from.mockImplementation((name: string) => {
      if (name === "orders") {
        return {
          select: (columns: string) => {
            selects.push(columns)
            return ordersStableIdOrderThenable({ orders, ranges })
          },
          insert: async () => ({ error: null }),
          update: () => thenable({ error: null }),
          delete: () => ({ eq: () => thenable({ error: null }) }),
        }
      }
      return emptyTableApi()
    })

    const { getFloorSnapshot } = await import("@/app/actions/reservations")
    const snapshot = await getFloorSnapshot("2026-08-18")

    // FP-15-COMPLETE: reservation_id select, stable id order, 1000-row pages.
    expect(selects).toEqual([
      "reservation_id, total, status",
      "reservation_id, total, status",
    ])
    expect(orders).toEqual([
      { column: "id", ascending: true },
      { column: "id", ascending: true },
    ])
    expect(ranges).toEqual([
      [0, POSTGREST_MAX_ROWS - 1],
      [POSTGREST_MAX_ROWS, POSTGREST_MAX_ROWS * 2 - 1],
    ])
    expect(snapshot.tableTotals?.[RESERVATION_ID]).toBe(
      POSTGREST_MAX_ROWS * FIRST_PAGE_ROW_TOTAL + NEXT_PAGE_ROW_TOTAL,
    )

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

    const failed = await getFloorSnapshot("2026-08-18")

    // FP-15-UNAVAILABLE: a failed orders read is null, never a zero map.
    expect(failed.tableTotals).toBe(null)
  })
})
