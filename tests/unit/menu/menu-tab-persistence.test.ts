import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createMenuTab,
  getMenuTabs,
  renameMenuTab,
  reorderMenuTabs,
} from "@/app/actions/menu"
import { MENU_IDS, MENUS } from "@/lib/menu-catalog"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createCookieClient: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
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

const SEED_IDS = ["midi", "soir", "boissons", "blanc", "rouge"] as const

describe("menu tab persistence", () => {
  let menus: Row[]

  beforeEach(() => {
    menus = [
      {
        id: "midi",
        title: "Menu Midi",
        title_en: "Lunch Menu",
        sort_order: 0,
      },
      {
        id: "soir",
        title: "Menu Soir",
        title_en: "Dinner Menu",
        sort_order: 1,
      },
      {
        id: "boissons",
        title: "Boissons",
        title_en: "Drinks",
        sort_order: 2,
      },
      {
        id: "blanc",
        title: "Blanc",
        title_en: "White",
        sort_order: 3,
      },
      {
        id: "rouge",
        title: "Rouge",
        title_en: "Red",
        sort_order: 4,
      },
    ]

    mocks.requireStaffUser.mockReset()
    mocks.createCookieClient.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staffUser)

    const tables: Record<string, Row[]> = { menus }

    mocks.from.mockImplementation((name: string) => {
      const rows = tables[name] ?? []
      return {
        insert(payload: Row | Row[]) {
          mocks.insert(payload)
          const incoming = (Array.isArray(payload) ? payload : [payload]).map(
            (row) => ({ ...row }),
          )
          rows.push(...incoming)
          return thenable({ data: incoming, error: null })
        },
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
        select: () => thenable({ data: [...rows], error: null }),
      }
    })
    mocks.createServiceClient.mockImplementation(() => ({
      from: mocks.from,
    }))
    mocks.createCookieClient.mockImplementation(async () => ({
      from: mocks.from,
    }))
  })

  it("created menu tab is returned by a subsequent list from menus", async () => {
    await createMenuTab({ title: "Brunch", title_en: "Brunch" })

    expect(mocks.from).toHaveBeenCalledWith("menus")
    expect(mocks.insert).toHaveBeenCalled()
    expect(mocks.insert.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ title: "Brunch", title_en: "Brunch" }),
    )

    mocks.from.mockClear()

    const listed = await getMenuTabs()

    expect(mocks.from).toHaveBeenCalledWith("menus")
    expect(listed).not.toBe(MENUS)
    expect(listed.map((tab) => tab.title)).not.toEqual(
      MENUS.map((menu) => menu.title),
    )

    const created = listed.find((tab) => tab.title === "Brunch")
    expect(created).toEqual(
      expect.objectContaining({
        title: "Brunch",
        title_en: "Brunch",
      }),
    )
    expect(typeof created?.id).toBe("string")
    expect(created?.id?.length).toBeGreaterThan(0)
    expect(MENU_IDS).not.toContain(created?.id)
    expect(SEED_IDS.every((id) => listed.some((tab) => tab.id === id))).toBe(
      true,
    )
  })

  it("renamed menu tab title is returned by a subsequent list from menus", async () => {
    await renameMenuTab("midi", { title: "Déjeuner", title_en: "Lunch" })

    mocks.from.mockClear()

    const listed = await getMenuTabs()

    expect(mocks.from).toHaveBeenCalledWith("menus")
    expect(listed).not.toBe(MENUS)
    expect(listed.map((tab) => tab.title)).not.toEqual(
      MENUS.map((menu) => menu.title),
    )

    const renamed = listed.find((tab) => tab.id === "midi")
    expect(renamed).toEqual(
      expect.objectContaining({
        id: "midi",
        title: "Déjeuner",
        title_en: "Lunch",
      }),
    )
  })

  it("reordered menu tabs are returned in saved sort_order", async () => {
    await reorderMenuTabs(["soir", "midi", "boissons", "blanc", "rouge"])

    mocks.from.mockClear()

    const listed = await getMenuTabs()

    expect(mocks.from).toHaveBeenCalledWith("menus")

    const savedSortOrderIds = [...menus]
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((row) => row.id)

    expect(listed.map((tab) => tab.id)).toEqual(savedSortOrderIds)
    expect(savedSortOrderIds).toEqual([
      "soir",
      "midi",
      "boissons",
      "blanc",
      "rouge",
    ])
  })
})
