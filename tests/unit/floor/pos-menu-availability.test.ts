import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { MENU_ITEMS } from "@/lib/data"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  insertOrder: vi.fn(),
  insertOrderItems: vi.fn(),
  menuItems: [] as Array<Record<string, unknown>>,
  tables: [] as Array<Record<string, unknown>>,
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (name: string) => {
      if (name === "menu_items") {
        return {
          select: () => ({
            in: async (column: string, ids: string[]) => ({
              data: mocks.menuItems.filter((row) =>
                ids.includes(String(row[column] ?? row.id)),
              ),
              error: null,
            }),
          }),
        }
      }
      if (name === "tables") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: mocks.tables[0] ?? null,
                error: null,
              }),
            }),
          }),
        }
      }
      if (name === "orders") {
        return {
          insert: (row: Record<string, unknown>) => {
            mocks.insertOrder(row)
            return {
              select: () => ({
                single: async () => ({
                  data: { id: "order-1", order_number: 1, ...row },
                  error: null,
                }),
              }),
            }
          },
          delete: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      if (name === "order_items") {
        return {
          insert: async (rows: unknown) => mocks.insertOrderItems(rows),
        }
      }
      throw new Error(`unexpected table ${name}`)
    },
  }),
}))

describe("POS live menu availability", () => {
  const liveItem = MENU_ITEMS[0]!

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.insertOrder.mockReset()
    mocks.insertOrderItems.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.tables = [{ id: "t1", label: "1" }]
    mocks.menuItems = [
      {
        id: liveItem.id,
        name: liveItem.name,
        price_value: liveItem.priceValue ?? 0,
        available: false,
      },
    ]
    mocks.insertOrderItems.mockResolvedValue({ error: null })
  })

  it("createKitchenOrder rejects a line item that is 86'd in the live menu_items table", async () => {
    const { createKitchenOrder } = await import("@/app/actions/operations")

    await expect(
      createKitchenOrder({
        table: "1",
        server: "Maya",
        lines: [{ itemId: liveItem.id, qty: 1 }],
      }),
    ).rejects.toThrow(/unavailable/i)

    expect(mocks.insertOrder).not.toHaveBeenCalled()
    expect(mocks.insertOrderItems).not.toHaveBeenCalled()
  })
})

describe("POS picker from live catalog", () => {
  it("POS sources menu items from the live catalog, not the static MENU_ITEMS seed", () => {
    const page = read("app/pos/page.tsx")
    const terminal = read("components/staff/pos-terminal.tsx")

    expect(page).toMatch(/getMenuItems\(/)
    expect(page).toMatch(/<PosTerminal[\s\S]*items=/)
    expect(terminal).not.toMatch(/\bMENU_ITEMS\b/)
  })
})
