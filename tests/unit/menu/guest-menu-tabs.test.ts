import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { MENUS } from "@/lib/menu-catalog"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createCookieClient: vi.fn(),
  createServiceClient: vi.fn(),
  createAnonClient: vi.fn(),
  from: vi.fn(),
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

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: (...args: unknown[]) => mocks.createAnonClient(...args),
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

describe("guest menu tabs", () => {
  let menus: Row[]

  beforeEach(() => {
    menus = [
      {
        id: "midi",
        title: "Déjeuner",
        title_en: "Lunch",
        sort_order: 0,
      },
      {
        id: "soir",
        title: "Menu Soir",
        title_en: "Dinner Menu",
        sort_order: 1,
      },
      {
        id: "brunch",
        title: "Brunch",
        title_en: "Brunch",
        sort_order: 2,
      },
    ]

    mocks.requireStaffUser.mockReset()
    mocks.createCookieClient.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.createAnonClient.mockReset()
    mocks.from.mockReset()

    const tables: Record<string, Row[]> = { menus }

    mocks.from.mockImplementation((name: string) => {
      const rows = tables[name] ?? []
      return {
        select: () => thenable({ data: [...rows], error: null }),
      }
    })
    mocks.createAnonClient.mockImplementation(() => ({
      from: mocks.from,
    }))
    mocks.createServiceClient.mockImplementation(() => ({
      from: mocks.from,
    }))
    mocks.createCookieClient.mockImplementation(async () => ({
      from: mocks.from,
    }))
  })

  it("guest menu tabs use live titles not compiled MENUS", async () => {
    const { getPublicMenuTabs } = await import("@/app/actions/menu")
    const tabs = await getPublicMenuTabs()

    const compiledMidi = MENUS.find((menu) => menu.id === "midi")
    const midi = tabs.find((tab) => tab.id === "midi")
    const brunch = tabs.find((tab) => tab.id === "brunch")

    expect(midi?.title).toBe("Déjeuner")
    expect(midi?.title).not.toBe(compiledMidi?.title)
    expect(midi?.title_en).toBe("Lunch")
    expect(midi?.title_en).not.toBe(compiledMidi?.titleEn)

    expect(brunch).toEqual(
      expect.objectContaining({
        id: "brunch",
        title: "Brunch",
        title_en: "Brunch",
      }),
    )
    expect(MENUS.find((menu) => menu.id === brunch?.id)).toBeUndefined()
  })

  it("guest menu tabs follow saved sort_order including empty tabs", async () => {
    menus.splice(
      0,
      menus.length,
      {
        id: "brunch",
        title: "Brunch",
        title_en: "Brunch",
        sort_order: 2,
      },
      {
        id: "empty-tab",
        title: "Vide",
        title_en: "Empty",
        sort_order: 0,
      },
      {
        id: "midi",
        title: "Déjeuner",
        title_en: "Lunch",
        sort_order: 1,
      },
    )

    const { getPublicMenuTabs } = await import("@/app/actions/menu")
    const tabs = await getPublicMenuTabs()

    expect(tabs.map((tab) => tab.id)).toEqual(["empty-tab", "midi", "brunch"])

    const chrome = readFileSync(
      path.join(process.cwd(), "components/site/menu-browser.tsx"),
      "utf8",
    )
    expect(chrome).not.toMatch(
      /menus\.filter\(\s*\(menu\)\s*=>[\s\S]*?initialItems\.some/,
    )
  })
})
