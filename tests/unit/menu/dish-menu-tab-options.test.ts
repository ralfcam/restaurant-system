import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMenuTab, getDishMenuTabOptions } from "@/app/actions/menu"
import { MENU_IDS } from "@/lib/menu-catalog"

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

describe("dish menu tab options", () => {
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

  it("dish menu options include newly created live tabs", async () => {
    await createMenuTab({ title: "Brunch", title_en: "Brunch" })

    const options = await getDishMenuTabOptions()
    const created = options.find((tab) => tab.title === "Brunch")

    expect(created).toEqual(
      expect.objectContaining({
        title: "Brunch",
        title_en: "Brunch",
      }),
    )
    expect(typeof created?.id).toBe("string")
    expect(created?.id?.length).toBeGreaterThan(0)
    expect(MENU_IDS).not.toContain(created?.id)
    expect(options.map((tab) => tab.id)).toContain(created?.id)
  })
})
