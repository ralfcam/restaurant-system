import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { createKitchenOrder } from "@/app/actions/operations"
import { createClient } from "@/lib/supabase/client-server"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"
import { authEnvReady } from "../helpers/env"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

// createKitchenOrder calls revalidatePath on success, which requires a
// Next.js request-scoped store that only exists inside an actual Next.js
// request/render lifecycle. This test invokes the server action directly
// (outside Next's runtime), so the cache-invalidation side effect is stubbed.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

const TABLE_LABEL = "REAZED-312 probe"
const VISIT_LABEL = "RES-167 visit probe"
const SERVER_NAME = "REAZED-312 probe"
const MENU_ITEM_ID = "reazed-312-probe"
const ITEM_NAME = "REAZED-312 probe item"
// Far-future Wednesdays: seed hours 09:00-22:00, never a blocked date.
// Distinct from status-transitions (2028-01-12) and cover-limits (2028-01-05).
const PERSIST_DATE = "2028-04-12"
const VISIT_DATE = "2028-04-19"
const VISIT_TIME = "19:00"
const UNKNOWN_RESERVATION_ID = "00000000-0000-4000-8000-000000000000"
// Another far-future Wednesday, unused by the service-role insert tests.
const C5_DATE = "2028-04-26"
const C5_VISIT_LABEL = "RES-167 C5 visit"
const C5_HAND_LABEL = "RES-167 C5 hand"
const C5_SERVER = "RES-167 C5"
const C5_MENU_ID = "res-167-c5-probe"
const C5_MENU_SLUG = "res-167-c5-probe"
const C5_ITEM_NAME = "RES-167 C5 probe item"
const C5_PROBE_SEATS = 2
const C5_LABELS = [C5_VISIT_LABEL, C5_HAND_LABEL] as const

let c5SavedCeiling: number | null = null

function isPermissionError(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  const code = error.code ?? ""
  const message = error.message ?? ""
  return (
    code === "42501" ||
    code === "PGRST301" ||
    /permission denied|row-level security|not authorized|unauthorized|forbidden/i.test(
      message,
    )
  )
}

function orderInsert(tableLabel: string, reservationId: string | null) {
  return {
    table_id: null,
    table_label: tableLabel,
    server_name: SERVER_NAME,
    subtotal: 10,
    tax: 1.5,
    total: 11.5,
    status: "new" as const,
    reservation_id: reservationId,
  }
}

async function insertSeatedReservation(input: {
  guestName: string
  confCode: string
  date: string
  tableLabel: string
  email: string
}) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      guest_name: input.guestName,
      party_size: 2,
      date: input.date,
      time: VISIT_TIME,
      phone: "555-0167",
      email: input.email,
      conf_code: input.confCode,
      status: "seated",
      table_label: input.tableLabel,
    })
    .select("id")
    .single()
  expect(error).toBeNull()
  expect(data?.id).toEqual(expect.any(String))
  return data!.id
}

async function cleanupC5Fixtures() {
  const supabase = createServiceClient()
  const { data: orders } = await supabase
    .from("orders")
    .select("id")
    .in("table_label", [...C5_LABELS])
  const orderIds = (orders ?? []).map((row) => row.id)
  if (orderIds.length > 0) {
    await supabase.from("order_items").delete().in("order_id", orderIds)
  }
  await supabase
    .from("orders")
    .delete()
    .in("table_label", [...C5_LABELS])
  await supabase.from("reservations").delete().eq("date", C5_DATE)
  await supabase
    .from("tables")
    .delete()
    .in("label", [...C5_LABELS])
  await supabase.from("menu_items").delete().eq("id", C5_MENU_ID)
  if (c5SavedCeiling !== null) {
    const { error } = await supabase
      .from("restaurant_settings")
      .update({ max_cover_capacity: c5SavedCeiling })
      .eq("id", 1)
    if (!error) c5SavedCeiling = null
  }
}

async function cleanupProbeRows() {
  const supabase = createServiceClient()
  await cleanupC5Fixtures()
  await supabase
    .from("orders")
    .delete()
    .in("table_label", [TABLE_LABEL, VISIT_LABEL])
  await supabase
    .from("reservations")
    .delete()
    .in("date", [PERSIST_DATE, VISIT_DATE])
}

async function raiseCoverCeiling(extraSeats: number) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("restaurant_settings")
    .select("max_cover_capacity")
    .eq("id", 1)
    .single()
  expect(error, error?.message ?? "").toBeNull()
  const current = data?.max_cover_capacity
  expect(typeof current).toBe("number")
  c5SavedCeiling = current
  const { error: updateError } = await supabase
    .from("restaurant_settings")
    .update({ max_cover_capacity: current + extraSeats })
    .eq("id", 1)
  expect(updateError, updateError?.message ?? "").toBeNull()
}

async function insertProbeTable(label: string, status: "available" | "seated") {
  const supabase = createServiceClient()
  const { error } = await supabase.from("tables").insert({
    label,
    seats: C5_PROBE_SEATS,
    status,
    x: 9,
    y: label === C5_VISIT_LABEL ? 9 : 10,
    shape: "square",
  })
  expect(error, error?.message ?? "").toBeNull()
}

async function insertAvailableMenuItem() {
  const supabase = createServiceClient()
  const { error } = await supabase.from("menu_items").insert({
    id: C5_MENU_ID,
    slug: C5_MENU_SLUG,
    name: C5_ITEM_NAME,
    name_en: C5_ITEM_NAME,
    price: "12.-",
    price_value: 12,
    menu_id: "midi",
    section: "C5",
    section_en: "C5",
    available: true,
  })
  expect(error, error?.message ?? "").toBeNull()
}

describe.skipIf(!authEnvReady)("orders persistence after local reset", () => {
  beforeAll(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupProbeRows()
  })

  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
  })

  afterEach(async () => {
    assertIsolatedHoursMutationTarget()
    await cleanupProbeRows()
  })

  it("service-role can persist and query orders/order_items after a local reset (send-to-kitchen)", async () => {
    const supabase = createServiceClient()
    const reservationId = await insertSeatedReservation({
      guestName: "REAZED-312 seated visit",
      confCode: "TVL-3167",
      date: PERSIST_DATE,
      tableLabel: TABLE_LABEL,
      email: "reazed-312@example.test",
    })

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderInsert(TABLE_LABEL, reservationId))
      .select("*")
      .single()

    expect(orderError).toBeNull()
    expect(order).toBeTruthy()
    expect(order.reservation_id).toBe(reservationId)
    expect(Number(order.order_number)).toBeGreaterThan(0)

    const { error: itemError } = await supabase.from("order_items").insert({
      order_id: order.id,
      menu_item_id: MENU_ITEM_ID,
      item_name: ITEM_NAME,
      unit_price: 10,
      quantity: 1,
      notes: null,
    })
    expect(itemError).toBeNull()

    const { data: row, error: selectError } = await supabase
      .from("orders")
      .select(
        "id, order_number, table_label, server_name, status, created_at, reservation_id, order_items(menu_item_id, item_name, quantity, notes)",
      )
      .eq("id", order.id)
      .single()

    expect(selectError).toBeNull()
    expect(row?.table_label).toBe(TABLE_LABEL)
    expect(row?.server_name).toBe(SERVER_NAME)
    expect(row?.status).toBe("new")
    expect(row?.reservation_id).toBe(reservationId)
    expect(row?.order_items).toHaveLength(1)
    expect(row?.order_items[0]).toMatchObject({
      menu_item_id: MENU_ITEM_ID,
      item_name: ITEM_NAME,
      quantity: 1,
      notes: null,
    })
  })

  it("orders require a visit: reservation_id FK + CHECK, and a past visit's orders survive a new visit", async () => {
    const supabase = createServiceClient()
    const visitAId = await insertSeatedReservation({
      guestName: "RES-167 visit A",
      confCode: "TVL-1671",
      date: VISIT_DATE,
      tableLabel: VISIT_LABEL,
      email: "res-167-a@example.test",
    })

    const { error: nullVisitError } = await supabase
      .from("orders")
      .insert(orderInsert(VISIT_LABEL, null))
    expect(nullVisitError).not.toBeNull()
    expect(nullVisitError?.code).toBe("23514")

    const { error: unknownVisitError } = await supabase
      .from("orders")
      .insert(orderInsert(VISIT_LABEL, UNKNOWN_RESERVATION_ID))
    expect(unknownVisitError).not.toBeNull()
    expect(unknownVisitError?.code).toBe("23503")

    const { data: order, error: seatedError } = await supabase
      .from("orders")
      .insert(orderInsert(VISIT_LABEL, visitAId))
      .select("id, table_label, reservation_id")
      .single()
    expect(seatedError).toBeNull()
    expect(order?.reservation_id).toBe(visitAId)
    expect(order?.table_label).toBe(VISIT_LABEL)

    const { error: completeError } = await supabase
      .from("reservations")
      .update({ status: "completed" })
      .eq("id", visitAId)
    expect(completeError).toBeNull()

    const visitBId = await insertSeatedReservation({
      guestName: "RES-167 visit B",
      confCode: "TVL-1672",
      date: VISIT_DATE,
      tableLabel: VISIT_LABEL,
      email: "res-167-b@example.test",
    })
    expect(visitBId).not.toBe(visitAId)

    const { data: survived, error: surviveError } = await supabase
      .from("orders")
      .select("id, table_label, reservation_id")
      .eq("id", order!.id)
      .single()
    expect(surviveError).toBeNull()
    expect(survived?.table_label).toBe(VISIT_LABEL)
    expect(survived?.reservation_id).toBe(visitAId)

    const anon = createClient()
    const { data: listed, error: listError } = await anon
      .from("orders")
      .select("id")
    expect(listed ?? []).toHaveLength(0)
    expect(isPermissionError(listError)).toBe(true)

    const { data: anonInserted, error: anonInsertError } = await anon
      .from("orders")
      .insert(orderInsert(VISIT_LABEL, visitAId))
      .select("id")
    expect(anonInserted ?? []).toHaveLength(0)
    expect(isPermissionError(anonInsertError)).toBe(true)
  })

  it("createKitchenOrder stamps the seated reservation and refuses a hand-set seated table against real Postgres", async () => {
    await raiseCoverCeiling(C5_PROBE_SEATS * C5_LABELS.length)
    await insertProbeTable(C5_VISIT_LABEL, "available")
    await insertProbeTable(C5_HAND_LABEL, "seated")
    await insertAvailableMenuItem()
    const reservationId = await insertSeatedReservation({
      guestName: "RES-167 C5 seated visit",
      confCode: "TVL-1675",
      date: C5_DATE,
      tableLabel: C5_VISIT_LABEL,
      email: "res-167-c5@example.test",
    })

    const supabase = createServiceClient()
    const created = await createKitchenOrder({
      table: C5_VISIT_LABEL,
      server: C5_SERVER,
      lines: [{ itemId: C5_MENU_ID, qty: 1 }],
    })
    expect(created).toMatchObject({
      id: expect.any(String),
      orderNumber: expect.any(Number),
    })
    const createdId = "id" in created ? created.id : ""

    const { data: row, error: readError } = await supabase
      .from("orders")
      .select(
        "id, reservation_id, table_label, order_items(menu_item_id, quantity)",
      )
      .eq("id", createdId)
      .single()
    expect(readError).toBeNull()
    expect(row?.reservation_id).toBe(reservationId)
    expect(row?.table_label).toBe(C5_VISIT_LABEL)
    expect(row?.order_items).toEqual([
      expect.objectContaining({ menu_item_id: C5_MENU_ID, quantity: 1 }),
    ])

    const refused = await createKitchenOrder({
      table: C5_HAND_LABEL,
      server: C5_SERVER,
      lines: [{ itemId: C5_MENU_ID, qty: 1 }],
    })
    expect(refused).toEqual({ error: "errors.pos.tableNotSeated" })

    const { data: handOrders, error: handReadError } = await supabase
      .from("orders")
      .select("id")
      .eq("table_label", C5_HAND_LABEL)
    expect(handReadError).toBeNull()
    expect(handOrders ?? []).toHaveLength(0)
  })

  it("a legacy order created before the migration keeps its null reservation_id and can still change status, while a new null-visit order is still refused", async () => {
    const supabase = createServiceClient()
    let legacyId: string | null = null
    try {
      const { data: legacy, error: legacyError } = await supabase
        .from("orders")
        .insert({
          ...orderInsert(TABLE_LABEL, null),
          created_at: "2020-01-01T00:00:00Z",
        })
        .select("id, status, reservation_id")
        .single()

      expect(legacyError, legacyError?.message ?? "").toBeNull()
      expect(legacy?.reservation_id).toBeNull()
      expect(legacy?.status).toBe("new")
      legacyId = legacy!.id

      const { data: preparing, error: preparingError } = await supabase
        .from("orders")
        .update({ status: "preparing" })
        .eq("id", legacyId)
        .select("status, reservation_id")
        .single()
      expect(preparingError, preparingError?.message ?? "").toBeNull()
      expect(preparing?.status).toBe("preparing")
      expect(preparing?.reservation_id).toBeNull()

      const { data: completed, error: completedError } = await supabase
        .from("orders")
        .update({ status: "completed" })
        .eq("id", legacyId)
        .select("status, reservation_id")
        .single()
      expect(completedError, completedError?.message ?? "").toBeNull()
      expect(completed?.status).toBe("completed")
      expect(completed?.reservation_id).toBeNull()

      const { error: freshNullError } = await supabase
        .from("orders")
        .insert(orderInsert(TABLE_LABEL, null))
      expect(freshNullError).not.toBeNull()
      expect(freshNullError?.code).toBe("23514")
    } finally {
      if (legacyId) {
        await supabase.from("order_items").delete().eq("order_id", legacyId)
        await supabase.from("orders").delete().eq("id", legacyId)
      }
    }
  })
})
