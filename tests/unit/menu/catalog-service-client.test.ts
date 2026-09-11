import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  createMenuItem,
  deleteMenuItem,
  getAllMenuItems,
  toggleMenuItemAvailability,
  upsertMenuItem,
  type MenuItemRow,
} from "@/app/actions/menu"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createCookieClient: vi.fn(),
  createServiceClient: vi.fn(),
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

type QueryResult = { data: Record<string, unknown>[] | null; error: unknown }

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

const catalogRow: Omit<MenuItemRow, "created_at"> = {
  id: "item-1",
  slug: "item-1",
  name: "Tortilla",
  name_en: "Tortilla",
  description: "desc",
  description_en: "desc",
  price: "8",
  price_value: 8,
  menu_id: "midi",
  section: "starters",
  section_en: "starters",
  popular: false,
  available: true,
  sort_order: 1,
}

const staffUser = { id: "staff-1" }

describe("staff menu catalog client", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createCookieClient.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.from.mockImplementation(() =>
      thenable({
        data: [{ ...catalogRow, created_at: "1970-01-01T00:00:00.000Z" }],
        error: null,
      }),
    )
    mocks.createCookieClient.mockImplementation(async () => ({
      from: mocks.from,
    }))
    mocks.createServiceClient.mockImplementation(() => ({
      from: mocks.from,
    }))
  })

  it("staff menu list and mutations use createServiceClient after requireStaffUser", async () => {
    mocks.requireStaffUser.mockResolvedValue(staffUser)

    await getAllMenuItems()
    await upsertMenuItem(catalogRow)
    await createMenuItem({
      name: catalogRow.name,
      name_en: catalogRow.name_en,
      description: catalogRow.description,
      description_en: catalogRow.description_en,
      price: catalogRow.price,
      price_value: catalogRow.price_value,
      menu_id: catalogRow.menu_id,
      section: catalogRow.section,
      section_en: catalogRow.section_en,
      popular: catalogRow.popular,
      available: catalogRow.available,
      sort_order: catalogRow.sort_order,
    })
    await deleteMenuItem(catalogRow.id)
    await toggleMenuItemAvailability(catalogRow.id, false)

    expect(mocks.createServiceClient).toHaveBeenCalled()
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.from).toHaveBeenCalledWith("menu_items")

    mocks.createServiceClient.mockClear()
    mocks.createCookieClient.mockClear()
    mocks.from.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)

    await getAllMenuItems()
    await upsertMenuItem(catalogRow)
    await createMenuItem({
      name: catalogRow.name,
      name_en: catalogRow.name_en,
      description: catalogRow.description,
      description_en: catalogRow.description_en,
      price: catalogRow.price,
      price_value: catalogRow.price_value,
      menu_id: catalogRow.menu_id,
      section: catalogRow.section,
      section_en: catalogRow.section_en,
      popular: catalogRow.popular,
      available: catalogRow.available,
      sort_order: catalogRow.sort_order,
    })
    await deleteMenuItem(catalogRow.id)
    await toggleMenuItemAvailability(catalogRow.id, false)

    expect(mocks.createServiceClient).not.toHaveBeenCalled()
    expect(mocks.createCookieClient).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
  })
})
