import { beforeEach, describe, expect, it, vi } from "vitest"
import { renameMenuTab, reorderMenuTabs } from "@/app/actions/menu"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createCookieClient: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mocks.createCookieClient(...args),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type Row = Record<string, unknown>
type QueryResult = { data: Row[] | null; error: unknown }

function thenable(value: QueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: QueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const row = Array.isArray(value.data)
          ? (value.data[0] ?? null)
          : value.data
        return async () => ({ data: row, error: row ? null : value.error })
      }
      return () => self
    },
  })
  return self
}

const staffUser = { id: "staff-1" }

function collectOrderedIds(value: unknown): string[] | null {
  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  ) {
    return value
  }
  if (
    Array.isArray(value) &&
    value.every((entry) => entry && typeof entry === "object" && "id" in entry)
  ) {
    return [...value]
      .sort(
        (left, right) =>
          Number((left as { sort_order?: number }).sort_order ?? 0) -
          Number((right as { sort_order?: number }).sort_order ?? 0),
      )
      .map((entry) => String((entry as { id: unknown }).id))
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      const found = collectOrderedIds(nested)
      if (found) return found
    }
  }
  return null
}

describe("menu tab identity", () => {
  let menus: Row[]
  let menuItems: Row[]

  beforeEach(() => {
    menus = [
      {
        id: "midi",
        title: "Menu Midi",
        title_en: "Lunch Menu",
        sort_order: 0,
        footer_note: "Formule Midi",
      },
      {
        id: "soir",
        title: "Menu Soir",
        title_en: "Dinner Menu",
        sort_order: 1,
        footer_note: "Soir",
      },
      {
        id: "boissons",
        title: "Boissons",
        title_en: "Drinks",
        sort_order: 2,
        footer_note: "",
      },
      {
        id: "blanc",
        title: "Blanc",
        title_en: "White",
        sort_order: 3,
        footer_note: "",
      },
      {
        id: "rouge",
        title: "Rouge",
        title_en: "Red",
        sort_order: 4,
        footer_note: "",
      },
    ]
    menuItems = [
      {
        id: "item-1",
        menu_id: "midi",
        name: "Tortilla",
        sort_order: 1,
      },
    ]

    mocks.requireStaffUser.mockReset()
    mocks.createCookieClient.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.rpc.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staffUser)
    mocks.rpc.mockImplementation((_fn: string, params?: unknown) => {
      const orderedIds = collectOrderedIds(params)
      if (orderedIds) {
        for (const [index, id] of orderedIds.entries()) {
          const row = menus.find((candidate) => candidate.id === id)
          if (row) row.sort_order = index
        }
      }
      return Promise.resolve({ data: null, error: null })
    })

    const tables: Record<string, Row[]> = {
      menus,
      menu_items: menuItems,
    }

    mocks.from.mockImplementation((name: string) => {
      const rows = tables[name] ?? []
      return {
        update(patch: Row) {
          return {
            eq(col: string, val: unknown) {
              for (const row of rows) {
                if (row[col] === val) Object.assign(row, patch)
              }
              return thenable({
                data: rows.filter((row) => row[col] === val),
                error: null,
              })
            },
          }
        },
        select: () => thenable({ data: rows, error: null }),
      }
    })
    mocks.createServiceClient.mockImplementation(() => ({
      from: mocks.from,
      rpc: mocks.rpc,
    }))
    mocks.createCookieClient.mockImplementation(async () => ({
      from: mocks.from,
    }))
  })

  it("rename and reorder keep menu item menu_id", async () => {
    const midiBefore = { ...menus[0] }
    const itemBefore = { ...menuItems[0] }

    await renameMenuTab("midi", { title: "Déjeuner", title_en: "Lunch" })
    await reorderMenuTabs(["soir", "midi", "boissons", "blanc", "rouge"])

    expect(menus.find((row) => row.id === "midi")).toEqual({
      id: "midi",
      title: "Déjeuner",
      title_en: "Lunch",
      sort_order: 1,
      footer_note: midiBefore.footer_note,
    })
    expect(menuItems).toEqual([itemBefore])
    expect(menuItems[0]?.menu_id).toBe("midi")
  })
})
