import { afterEach, describe, expect, it } from "vitest"
import { createServiceClient } from "@/lib/supabase/service"
import { authEnvReady } from "../helpers/env"

const TABLE_LABEL = "REAZED-312 probe"
const SERVER_NAME = "REAZED-312 probe"
const MENU_ITEM_ID = "reazed-312-probe"
const ITEM_NAME = "REAZED-312 probe item"

describe.skipIf(!authEnvReady)("orders persistence after local reset", () => {
  let probeOrderId: string | null = null

  afterEach(async () => {
    if (!probeOrderId) return
    const supabase = createServiceClient()
    await supabase.from("orders").delete().eq("id", probeOrderId)
    probeOrderId = null
  })

  it("service-role can persist and query orders/order_items after a local reset (send-to-kitchen)", async () => {
    const supabase = createServiceClient()

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: null,
        table_label: TABLE_LABEL,
        server_name: SERVER_NAME,
        subtotal: 10,
        tax: 1.5,
        total: 11.5,
        status: "new",
      })
      .select("*")
      .single()

    expect(orderError).toBeNull()
    expect(order).toBeTruthy()
    probeOrderId = order.id
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
        "id, order_number, table_label, server_name, status, created_at, order_items(menu_item_id, item_name, quantity, notes)",
      )
      .eq("id", order.id)
      .single()

    expect(selectError).toBeNull()
    expect(row?.table_label).toBe(TABLE_LABEL)
    expect(row?.server_name).toBe(SERVER_NAME)
    expect(row?.status).toBe("new")
    expect(row?.order_items).toHaveLength(1)
    expect(row?.order_items[0]).toMatchObject({
      menu_item_id: MENU_ITEM_ID,
      item_name: ITEM_NAME,
      quantity: 1,
      notes: null,
    })
  })
})
