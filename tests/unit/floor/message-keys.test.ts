import { beforeEach, describe, expect, it, vi } from "vitest"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"
import { canAddTablesToMerge, canMergeTables } from "@/lib/floor/table-use"
import {
  resolveMergeDrop,
  resolveSplitDrop,
  type MergeDropTable,
} from "@/lib/floor/merge-drop"

const KEYS = {
  mergeNeedsTwo: "errors.floor.mergeNeedsTwo",
  alreadyInArrangement: "errors.floor.alreadyInArrangement",
  onlyAvailableTables: "errors.floor.onlyAvailableTables",
  arrangementNotAvailable: "errors.floor.arrangementNotAvailable",
  tablesNotFound: "errors.floor.tablesNotFound",
  notInArrangement: "errors.floor.notInArrangement",
  splitNotAvailable: "errors.floor.splitNotAvailable",
  dropDifferentTable: "errors.floor.dropDifferentTable",
  alreadyMerged: "errors.floor.alreadyMerged",
  splitBeforeCombine: "errors.floor.splitBeforeCombine",
  unauthorized: "errors.operations.unauthorized",
  unmapped: "errors.operations.unmapped",
  tableNotFound: "errors.floor.tableNotFound",
  invalidTableTransition: "errors.floor.invalidTableTransition",
  updateTableFailed: "errors.floor.updateTableFailed",
  expectedTimeFailed: "errors.floor.expectedTimeFailed",
  arrangementUpdateFailed: "errors.floor.arrangementUpdateFailed",
  invalidTableStatus: "errors.floor.invalidTableStatus",
  arrangementNotFound: "errors.floor.arrangementNotFound",
  mergeFailed: "errors.floor.mergeFailed",
  splitFailed: "errors.floor.splitFailed",
  addTableFailed: "errors.floor.addTableFailed",
  removeTableFailed: "errors.floor.removeTableFailed",
  orderNeedsItems: "errors.pos.orderNeedsItems",
  itemUnavailable: "errors.pos.itemUnavailable",
  sendFailed: "errors.pos.sendFailed",
  saveItemsFailed: "errors.pos.saveItemsFailed",
  orderNotFound: "errors.kds.orderNotFound",
  invalidOrderTransition: "errors.kds.invalidTransition",
  kitchenUpdateFailed: "errors.kds.updateFailed",
} as const

type QueryResult = {
  data: unknown
  error: { message?: string; code?: string } | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  serviceQueue: [] as QueryResult[],
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => {
      const next = mocks.serviceQueue.shift() ?? {
        data: null,
        error: { message: "unscripted query" },
      }
      return thenable(next)
    },
  }),
}))

function thenable(value: QueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (result: QueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        return async () => {
          const row = Array.isArray(value.data)
            ? (value.data[0] ?? null)
            : value.data
          return { data: row, error: value.error }
        }
      }
      return () => self
    },
  })
  return self
}

function expectMessageKey(actual: string | null | undefined, key: string) {
  expect(actual).toBe(key)
  expectCatalogKey(key)
}

function ok(data: unknown): QueryResult {
  return { data, error: null }
}

function fail(message: string, code?: string): QueryResult {
  return { data: null, error: { message, ...(code ? { code } : {}) } }
}

function script(...results: QueryResult[]) {
  mocks.serviceQueue.length = 0
  mocks.serviceQueue.push(...results)
  mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
}

function dropTable(
  id: string,
  overrides: Partial<MergeDropTable> = {},
): MergeDropTable {
  return {
    id,
    status: "available",
    displayStatus: "available",
    merge: null,
    reservation: null,
    ...overrides,
  }
}

function tableRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    label: id.replace(/^t/, ""),
    seats: 2,
    status: "available",
    expected_minutes: 90,
    x: 0,
    y: 0,
    ...overrides,
  }
}

const current = { status: "available", x: 0, y: 0 }
const mergeRow = {
  id: "m1",
  expected_minutes: 90,
  status: "available",
  expires_at: "2026-08-18T19:30:00.000Z",
}

async function messageFrom(
  run: () => Promise<unknown>,
): Promise<string | undefined> {
  try {
    const result = await run()
    if (result && typeof result === "object" && "error" in result) {
      const error = (result as { error?: string }).error
      return error
    }
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

describe("floor, POS, and KDS producers return errors.* catalog keys", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.serviceQueue.length = 0
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("table-use merge refusals are errors.* catalog keys", () => {
    expectMessageKey(
      canMergeTables([{ status: "available" }]),
      KEYS.mergeNeedsTwo,
    )
    expectMessageKey(
      canMergeTables([{ status: "available" }, { status: "reserved" }]),
      KEYS.onlyAvailableTables,
    )
    expectMessageKey(
      canMergeTables([
        { status: "available", mergeId: "m1" },
        { status: "available" },
      ]),
      KEYS.alreadyInArrangement,
    )
    expectMessageKey(
      canAddTablesToMerge({ status: "seated" }, [{ status: "available" }]),
      KEYS.arrangementNotAvailable,
    )
    expectMessageKey(
      canAddTablesToMerge({ status: "available" }, []),
      KEYS.alreadyInArrangement,
    )
    expectMessageKey(
      canAddTablesToMerge({ status: "available" }, [
        { status: "available", mergeId: "m2" },
      ]),
      KEYS.alreadyInArrangement,
    )
    expectMessageKey(
      canAddTablesToMerge({ status: "available" }, [{ status: "reserved" }]),
      KEYS.onlyAvailableTables,
    )
  })

  it("merge-drop refusals are errors.* catalog keys", () => {
    expectMessageKey(
      resolveMergeDrop("t3", "t3", [dropTable("t3")]).error,
      KEYS.dropDifferentTable,
    )
    expectMessageKey(
      resolveMergeDrop("", "t4", [dropTable("t4")]).error,
      KEYS.dropDifferentTable,
    )
    expectMessageKey(
      resolveMergeDrop("t3", "t9", [dropTable("t3")]).error,
      KEYS.tablesNotFound,
    )
    expectMessageKey(
      resolveSplitDrop("missing", [dropTable("t3")]).error,
      KEYS.tablesNotFound,
    )
    expectMessageKey(
      resolveMergeDrop("t3", "t5", [
        dropTable("t3", {
          merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
        }),
        dropTable("t5"),
      ]).error,
      KEYS.tablesNotFound,
    )
    expectMessageKey(
      resolveMergeDrop("t3", "t4", [
        dropTable("t3", {
          merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
        }),
        dropTable("t4", {
          merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
        }),
      ]).error,
      KEYS.alreadyMerged,
    )
    expectMessageKey(
      resolveMergeDrop("t3", "t5", [
        dropTable("t3", {
          merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
        }),
        dropTable("t4", {
          merge: { id: "m-34", status: "available", memberIds: ["t3", "t4"] },
        }),
        dropTable("t5", {
          merge: { id: "m-56", status: "available", memberIds: ["t5", "t6"] },
        }),
        dropTable("t6", {
          merge: { id: "m-56", status: "available", memberIds: ["t5", "t6"] },
        }),
      ]).error,
      KEYS.splitBeforeCombine,
    )
    expectMessageKey(
      resolveMergeDrop("t3", "t4", [
        dropTable("t3"),
        dropTable("t4", { status: "reserved", displayStatus: "reserved" }),
      ]).error,
      KEYS.onlyAvailableTables,
    )
    expectMessageKey(
      resolveMergeDrop("t5", "t3", [
        dropTable("t3", {
          merge: { id: "m-34", status: "seated", memberIds: ["t3", "t4"] },
        }),
        dropTable("t4", {
          merge: { id: "m-34", status: "seated", memberIds: ["t3", "t4"] },
        }),
        dropTable("t5"),
      ]).error,
      KEYS.arrangementNotAvailable,
    )
    expectMessageKey(
      resolveSplitDrop("t5", [dropTable("t5")]).error,
      KEYS.notInArrangement,
    )
    expectMessageKey(
      resolveSplitDrop("t3", [
        dropTable("t3", {
          merge: { id: "m-34", memberIds: ["t3", "t4"] },
          status: "seated",
          displayStatus: "seated",
        }),
      ]).error,
      KEYS.splitNotAvailable,
    )
  })

  it("updateTableState auth, lookup, and transition errors are errors.* catalog keys", async () => {
    const { updateTableState } = await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", seats: 4 })),
      KEYS.unauthorized,
    )

    script(fail("missing"))
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", seats: 4 })),
      KEYS.tableNotFound,
    )

    script(ok(current))
    expectMessageKey(
      await messageFrom(() =>
        updateTableState({ id: "t1", status: "available" }),
      ),
      KEYS.invalidTableTransition,
    )
  })

  it("updateTableState write failures are errors.* catalog keys", async () => {
    const { updateTableState } = await import("@/app/actions/operations")

    script(ok(current), fail("could not write seats"))
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", seats: 4 })),
      KEYS.updateTableFailed,
    )

    script(ok(current), fail("could not write position"))
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", x: 1, y: 1 })),
      KEYS.updateTableFailed,
    )

    script(ok(current), ok(null), fail("could not write status"))
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", status: "seated" })),
      KEYS.updateTableFailed,
    )

    script(ok(current), ok(null), fail("could not write expected time"))
    expectMessageKey(
      await messageFrom(() =>
        updateTableState({ id: "t1", expectedMinutes: 120 }),
      ),
      KEYS.expectedTimeFailed,
    )

    script(
      ok(current),
      ok({ merge_id: "m1" }),
      ok(mergeRow),
      ok([{ table_id: "t1" }]),
      fail("could not write merge expected time"),
    )
    expectMessageKey(
      await messageFrom(() =>
        updateTableState({ id: "t1", expectedMinutes: 120 }),
      ),
      KEYS.expectedTimeFailed,
    )

    script(
      ok(current),
      ok({ merge_id: "m1" }),
      ok(mergeRow),
      ok([{ table_id: "t1" }]),
      ok(null),
      ok(null),
      fail("could not write arrangement"),
    )
    expectMessageKey(
      await messageFrom(() => updateTableState({ id: "t1", status: "seated" })),
      KEYS.arrangementUpdateFailed,
    )
  })

  it("syncTableGroupStatus auth and status errors are errors.* catalog keys", async () => {
    const { syncTableGroupStatus } = await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => syncTableGroupStatus("1", "seated")),
      KEYS.unauthorized,
    )

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    expectMessageKey(
      await messageFrom(() => syncTableGroupStatus("1", "nope" as "seated")),
      KEYS.invalidTableStatus,
    )
  })

  it("mergeTables validation errors are errors.* catalog keys", async () => {
    const { mergeTables } = await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unauthorized,
    )

    script(fail("db down"))
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.tablesNotFound,
    )

    script(ok([tableRow("t1")]), ok([]))
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1"] })),
      KEYS.mergeNeedsTwo,
    )

    script(ok([tableRow("t1"), tableRow("t2", { status: "reserved" })]), ok([]))
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.onlyAvailableTables,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([
        { merge_id: "m1", table_id: "t1" },
        { merge_id: "m2", table_id: "t2" },
      ]),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.splitBeforeCombine,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([{ merge_id: "m1", table_id: "t1" }]),
      fail("no rows", "PGRST116"),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.arrangementNotFound,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([{ merge_id: "m1", table_id: "t1" }]),
      ok({ ...mergeRow, status: "seated" }),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.arrangementNotAvailable,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([
        { merge_id: "m1", table_id: "t1" },
        { merge_id: "m1", table_id: "t2" },
      ]),
      ok(mergeRow),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.alreadyInArrangement,
    )
  })

  it("mergeTables maps raw database text to one generic key and blank failures to mergeFailed", async () => {
    const { mergeTables } = await import("@/app/actions/operations")

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([{ merge_id: "m1", table_id: "t1" }]),
      ok(mergeRow),
      fail("duplicate key value violates unique constraint"),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([{ merge_id: "m1", table_id: "t1" }]),
      ok(mergeRow),
      ok(null),
      ok([{ table_id: "t1" }, { table_id: "t2" }]),
      ok([tableRow("t1"), tableRow("t2")]),
      fail("deadlock detected"),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([]),
      fail("permission denied for table table_merges"),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      ok([]),
      ok({ ...mergeRow, id: "m-new" }),
      fail("new row violates row-level security policy"),
      ok(null),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    script(
      ok([tableRow("t1"), tableRow("t2")]),
      {
        data: null,
        error: {
          code: "PGRST205",
          message:
            "Could not find the table 'public.table_merge_members' in the schema cache",
        },
      },
      ok([]),
      fail("could not insert status_events"),
    )
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    script(ok([tableRow("t1"), tableRow("t2")]), ok([]), fail(""))
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.mergeFailed,
    )

    mocks.requireStaffUser.mockRejectedValue(new Error("connection reset"))
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.unmapped,
    )

    mocks.requireStaffUser.mockRejectedValue("boom")
    expectMessageKey(
      await messageFrom(() => mergeTables({ tableIds: ["t1", "t2"] })),
      KEYS.mergeFailed,
    )
  })

  it("splitMerge errors are errors.* catalog keys", async () => {
    const { splitMerge } = await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => splitMerge("m1")),
      KEYS.unauthorized,
    )

    script(ok(null), ok([]))
    expectMessageKey(
      await messageFrom(() => splitMerge("m1")),
      KEYS.arrangementNotFound,
    )

    script(ok({ id: "m1" }), ok([]), fail("could not write event"))
    expectMessageKey(await messageFrom(() => splitMerge("m1")), KEYS.unmapped)

    script(ok({ id: "m1" }), ok([]), fail(""))
    expectMessageKey(
      await messageFrom(() => splitMerge("m1")),
      KEYS.splitFailed,
    )

    mocks.requireStaffUser.mockRejectedValue(new Error("socket hang up"))
    expectMessageKey(await messageFrom(() => splitMerge("m1")), KEYS.unmapped)

    mocks.requireStaffUser.mockRejectedValue("boom")
    expectMessageKey(
      await messageFrom(() => splitMerge("m1")),
      KEYS.splitFailed,
    )
  })

  it("createTable and deleteTable errors are errors.* catalog keys", async () => {
    const { createTable, deleteTable } =
      await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(await messageFrom(() => createTable()), KEYS.unauthorized)

    script(ok([]), fail("duplicate key"))
    expectMessageKey(
      await messageFrom(() => createTable()),
      KEYS.addTableFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => deleteTable("t1")),
      KEYS.unauthorized,
    )

    script(ok(null), fail("delete failed"))
    expectMessageKey(
      await messageFrom(() => deleteTable("t1")),
      KEYS.removeTableFailed,
    )
  })

  it("POS kitchen-order errors are errors.* catalog keys", async () => {
    const { createKitchenOrder } = await import("@/app/actions/operations")
    const order = {
      table: "1",
      server: "Maya",
      lines: [{ itemId: "item-1", qty: 1 }],
    }

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => createKitchenOrder(order)),
      KEYS.unauthorized,
    )

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    expectMessageKey(
      await messageFrom(() => createKitchenOrder({ ...order, lines: [] })),
      KEYS.orderNeedsItems,
    )

    script(
      ok([{ id: "item-1", name: "Soup", price_value: 10, available: false }]),
    )
    expectMessageKey(
      await messageFrom(() => createKitchenOrder(order)),
      KEYS.itemUnavailable,
    )

    script(
      ok([{ id: "item-1", name: "Soup", price_value: 10, available: true }]),
      ok({ id: "t1" }),
      fail("insert order failed"),
    )
    expectMessageKey(
      await messageFrom(() => createKitchenOrder(order)),
      KEYS.sendFailed,
    )

    script(
      ok([{ id: "item-1", name: "Soup", price_value: 10, available: true }]),
      ok({ id: "t1" }),
      ok({ id: "order-1", order_number: 4 }),
      fail("insert items failed"),
      ok(null),
    )
    expectMessageKey(
      await messageFrom(() => createKitchenOrder(order)),
      KEYS.saveItemsFailed,
    )
  })

  it("KDS status errors are errors.* catalog keys", async () => {
    const { updateKitchenOrderStatus } =
      await import("@/app/actions/operations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      await messageFrom(() => updateKitchenOrderStatus("order-1", "preparing")),
      KEYS.unauthorized,
    )

    script(fail("no rows"))
    expectMessageKey(
      await messageFrom(() => updateKitchenOrderStatus("order-1", "preparing")),
      KEYS.orderNotFound,
    )

    script(ok({ status: "completed" }))
    expectMessageKey(
      await messageFrom(() => updateKitchenOrderStatus("order-1", "preparing")),
      KEYS.invalidOrderTransition,
    )

    script(ok({ status: "new" }), fail("write failed"))
    expectMessageKey(
      await messageFrom(() => updateKitchenOrderStatus("order-1", "preparing")),
      KEYS.kitchenUpdateFailed,
    )
  })
})
