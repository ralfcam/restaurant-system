"use server"

import { revalidatePath } from "next/cache"
import { MENU_ITEMS, type TableStatus } from "@/lib/data"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"

export type PersistedTable = {
  id: string
  label: string
  seats: number
  status: TableStatus
  x: number
  y: number
  shape: "round" | "square" | "rect"
}

export type KdsOrder = {
  id: string
  orderNumber: number
  table: string
  server: string
  placedAt: string
  placedAtMs: number
  status: "new" | "preparing" | "ready"
  lines: { itemId: string; name: string; qty: number; notes?: string }[]
}

const TAX_RATE = 0.077
const TABLE_STATUSES = new Set<TableStatus>(["available", "seated", "reserved", "cleaning", "out_of_service"])
const TABLE_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: ["reserved", "seated", "cleaning", "out_of_service"],
  reserved: ["seated", "available", "out_of_service"],
  seated: ["cleaning", "available", "out_of_service"],
  cleaning: ["available", "out_of_service"],
  out_of_service: ["available"],
}

function mapTable(row: Record<string, unknown>): PersistedTable {
  return {
    id: String(row.id), label: String(row.label), seats: Number(row.seats),
    status: row.status as TableStatus, x: Number(row.x), y: Number(row.y),
    shape: row.shape as PersistedTable["shape"],
  }
}

export async function getTables(): Promise<PersistedTable[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const { data, error } = await createServiceClient().from("tables").select("*").order("label")
  if (error) { console.error("[operations] getTables:", error.message); return [] }
  return (data ?? []).map(mapTable)
}

export async function updateTableState(input: { id: string; status?: TableStatus; seats?: number }) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: current, error: currentError } = await db.from("tables").select("status").eq("id", input.id).single()
  if (currentError || !current) throw new Error("Table not found")
  if (input.status && (!TABLE_STATUSES.has(input.status) || !TABLE_TRANSITIONS[current.status as TableStatus].includes(input.status))) throw new Error(`Invalid table transition: ${current.status} → ${input.status}`)
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.status) patch.status = input.status
  if (input.seats !== undefined) patch.seats = Math.max(1, Math.min(12, Math.round(input.seats)))
  const { error } = await db.from("tables").update(patch).eq("id", input.id)
  if (error) throw new Error("Unable to update table")
  if (input.status) await db.from("status_events").insert({ entity_type: "table", entity_id: input.id, from_status: current.status, to_status: input.status })
  revalidatePath("/admin/floor")
  revalidatePath("/pos")
}

export async function createTable() {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: existing } = await db.from("tables").select("label").order("label")
  const next = Math.max(0, ...(existing ?? []).map((row) => Number(row.label) || 0)) + 1
  const { data, error } = await db.from("tables").insert({ label: String(next), seats: 2, status: "available", x: 0, y: 0, shape: "round" }).select("*").single()
  if (error) throw new Error("Unable to add table")
  revalidatePath("/admin/floor")
  return mapTable(data)
}

export async function deleteTable(id: string) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const { error } = await createServiceClient().from("tables").delete().eq("id", id)
  if (error) throw new Error("Unable to remove table")
  revalidatePath("/admin/floor")
}

export async function createKitchenOrder(input: { table: string; server: string; lines: { itemId: string; qty: number; notes?: string }[] }) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")
  if (!input.lines.length || input.lines.length > 50) throw new Error("Order must contain items")
  const normalized = input.lines.map((line) => {
    const item = MENU_ITEMS.find((candidate) => candidate.id === line.itemId)
    const qty = Math.max(1, Math.min(99, Math.round(line.qty)))
    if (!item) throw new Error("Menu item is unavailable")
    return { itemId: item.id, name: item.name, unitPrice: item.priceValue ?? 0, qty, notes: line.notes?.slice(0, 240) }
  })
  const subtotal = normalized.reduce((sum, line) => sum + line.unitPrice * line.qty, 0)
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100
  const db = createServiceClient()
  const { data: table } = await db.from("tables").select("id").eq("label", input.table).maybeSingle()
  const { data: order, error } = await db.from("orders").insert({ table_id: table?.id ?? null, table_label: input.table, server_name: input.server.slice(0, 80), subtotal, tax, total: subtotal + tax, status: "new" }).select("*").single()
  if (error || !order) throw new Error("Unable to send order to kitchen")
  const { error: itemError } = await db.from("order_items").insert(normalized.map((line) => ({ order_id: order.id, menu_item_id: line.itemId, item_name: line.name, unit_price: line.unitPrice, quantity: line.qty, notes: line.notes ?? null })))
  if (itemError) { await db.from("orders").delete().eq("id", order.id); throw new Error("Unable to save order items") }
  revalidatePath("/kds")
  return { id: order.id, orderNumber: Number(order.order_number) }
}

export async function getActiveKitchenOrders(): Promise<KdsOrder[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const db = createServiceClient()
  const { data, error } = await db.from("orders").select("id, order_number, table_label, server_name, status, created_at, order_items(menu_item_id, item_name, quantity, notes)").in("status", ["new", "preparing", "ready"]).order("created_at", { ascending: true })
  if (error) { console.error("[operations] getActiveKitchenOrders:", error.message); return [] }
  return (data ?? []).map((row) => ({
    id: row.id, orderNumber: Number(row.order_number), table: row.table_label, server: row.server_name,
    placedAt: new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    placedAtMs: new Date(row.created_at).getTime(), status: row.status as KdsOrder["status"],
    lines: (row.order_items ?? []).map((item: { menu_item_id: string; item_name: string; quantity: number; notes: string | null }) => ({ itemId: item.menu_item_id, name: item.item_name, qty: item.quantity, notes: item.notes ?? undefined })),
  }))
}

const ORDER_TRANSITIONS: Record<KdsOrder["status"] | "completed" | "cancelled" | "voided", string[]> = {
  new: ["preparing", "cancelled", "voided"], preparing: ["ready", "cancelled", "voided"], ready: ["completed", "voided"],
  completed: [], cancelled: [], voided: [],
}

export async function updateKitchenOrderStatus(id: string, status: "preparing" | "ready" | "completed" | "cancelled" | "voided") {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: current, error: readError } = await db.from("orders").select("status").eq("id", id).single()
  if (readError || !current) throw new Error("Kitchen order not found")
  if (!ORDER_TRANSITIONS[current.status as keyof typeof ORDER_TRANSITIONS]?.includes(status)) throw new Error(`Invalid order transition: ${current.status} → ${status}`)
  const { error } = await db.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw new Error("Unable to update kitchen order")
  await db.from("status_events").insert({ entity_type: "order", entity_id: id, from_status: current.status, to_status: status })
  revalidatePath("/kds")
}
