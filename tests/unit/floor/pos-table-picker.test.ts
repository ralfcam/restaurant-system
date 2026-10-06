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
            eq: (_column: string, value: unknown) => ({
              maybeSingle: async () => ({
                data: mocks.tables.find((row) => row.label === value) ?? null,
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

describe("POS table picker from live floor inventory", () => {
  it("POS table picker lists live getTables() tables, not the TABLES seed", () => {
    const page = read("app/pos/page.tsx")
    const terminal = read("components/staff/pos-terminal.tsx")

    expect(page).not.toMatch(/\bTABLES\b/)
    expect(terminal).not.toMatch(/\bTABLES\b/)

    expect(page).toMatch(/getTables\(/)
    expect(page).toMatch(/dynamic\s*=\s*["']force-dynamic["']/)
    expect(page).toMatch(/<PosTerminal[\s\S]*tables=/)

    expect(terminal).toMatch(/tables\.map\(/)

    const tableLabelAt = terminal.indexOf('t("staff.pos.tableLabel")')
    const serverLabelAt = terminal.indexOf('t("staff.pos.serverLabel")')
    const tableSelect =
      tableLabelAt === -1 || serverLabelAt === -1
        ? ""
        : terminal.slice(tableLabelAt, serverLabelAt)
    expect(tableSelect).toMatch(/tableChoices\.map\(/)
    expect(terminal).toMatch(/useState\(\s*tables\[0\]\?\.label/)
  })

  it("table select disables with a placeholder when no tables are available", () => {
    const terminal = read("components/staff/pos-terminal.tsx")
    const tableLabelAt = terminal.indexOf('t("staff.pos.tableLabel")')
    const serverLabelAt = terminal.indexOf('t("staff.pos.serverLabel")')
    const tableSelect =
      tableLabelAt === -1 || serverLabelAt === -1
        ? ""
        : terminal.slice(tableLabelAt, serverLabelAt)
    expect(tableSelect).toMatch(/disabled=\{tables\.length === 0\}/)
    expect(tableSelect).toMatch(/placeholder=\{t\("staff\.pos\.noTables"\)\}/)
  })

  it("Send stays disabled until a live table is selected", () => {
    const terminal = read("components/staff/pos-terminal.tsx")

    const onClickAt = terminal.indexOf("onClick={sendToKitchen}")
    const buttonAt =
      onClickAt === -1 ? -1 : terminal.lastIndexOf("<Button", onClickAt)
    const openTagEnd = onClickAt === -1 ? -1 : terminal.indexOf(">", onClickAt)
    const sendButton =
      buttonAt === -1 || openTagEnd === -1
        ? ""
        : terminal.slice(buttonAt, openTagEnd + 1)
    const disabledExpr = /disabled=\{([^}]*)\}/.exec(sendButton)?.[1] ?? ""

    const fnAt = terminal.indexOf("function sendToKitchen")
    const tryAt = fnAt === -1 ? -1 : terminal.indexOf("try", fnAt)
    const sendHead =
      fnAt === -1 || tryAt === -1 ? "" : terminal.slice(fnAt, tryAt)
    const guardExpr = /if\s*\(([^)]*)\)\s*return/.exec(sendHead)?.[1] ?? ""

    expect(disabledExpr).toContain("!table")
    expect(disabledExpr).toContain("cart.length === 0")
    expect(disabledExpr).toContain("sending")
    expect(guardExpr).toContain("!table")
    expect(guardExpr).toContain("cart.length === 0")
    expect(guardExpr).toContain("sending")
  })
})

describe("createKitchenOrder requires a persisted tables row", () => {
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
        available: true,
      },
    ]
    mocks.insertOrderItems.mockResolvedValue({ error: null })
  })

  it("createKitchenOrder rejects a kitchen send whose table matches no tables row", async () => {
    const { createKitchenOrder } = await import("@/app/actions/operations")
    const lines = [{ itemId: liveItem.id, qty: 1 }]

    await expect(
      createKitchenOrder({
        table: "99",
        server: "Maya",
        lines,
      }),
    ).rejects.toThrow("errors.floor.tableNotFound")
    expect(mocks.insertOrder).not.toHaveBeenCalled()
    expect(mocks.insertOrderItems).not.toHaveBeenCalled()

    mocks.insertOrder.mockClear()
    mocks.insertOrderItems.mockClear()

    await expect(
      createKitchenOrder({
        table: "",
        server: "Maya",
        lines,
      }),
    ).rejects.toThrow("errors.floor.tableNotFound")
    expect(mocks.insertOrder).not.toHaveBeenCalled()
    expect(mocks.insertOrderItems).not.toHaveBeenCalled()

    mocks.insertOrder.mockClear()
    mocks.insertOrderItems.mockClear()

    await createKitchenOrder({
      table: "1",
      server: "Maya",
      lines,
    })
    expect(mocks.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({ table_id: "t1" }),
    )
  })
})
