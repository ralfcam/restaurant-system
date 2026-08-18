"use server"

import { revalidatePath } from "next/cache"
import { MENU_ITEMS, type TableStatus } from "@/lib/data"
import { tableShapeForSeats } from "@/lib/table-shape"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import {
  canAddTablesToMerge,
  canMergeTables,
  clampExpectedMinutes,
  DEFAULT_EXPECTED_MINUTES,
  defaultMergeExpectedMinutes,
  dissolvesMerge,
  mergeExpiresAt,
  mergeLabel,
  mergeSeatCapacity,
  restartsMergeClock,
  shouldExpireMerge,
} from "@/lib/floor/table-use"
import {
  MERGE_EVENT_TYPE,
  activeMergesFromEvents,
  encodeMergeState,
  isMissingRelationError,
  mergeStateFromTables,
  type FallbackMerge,
} from "@/lib/floor/merge-fallback"

export type PersistedTable = {
  id: string
  label: string
  seats: number
  status: TableStatus
  expectedMinutes: number
  x: number
  y: number
  shape: "round" | "square" | "rect"
  mergeId: string | null
}

export type PersistedMerge = {
  id: string
  expectedMinutes: number
  expiresAt: string
  status: TableStatus
  tableIds: string[]
  seats: number
  label: string
}

type ServiceDb = ReturnType<typeof createServiceClient>

type MergeContext = {
  mergeId: string
  expectedMinutes: number
  status: TableStatus
  expiresAt: string
  tableIds: string[]
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

function mapTable(row: Record<string, unknown>, mergeId: string | null = null): PersistedTable {
  const seats = Number(row.seats)
  return {
    id: String(row.id),
    label: String(row.label),
    seats,
    status: row.status as TableStatus,
    expectedMinutes: clampExpectedMinutes(Number(row.expected_minutes ?? DEFAULT_EXPECTED_MINUTES)),
    x: Number(row.x),
    y: Number(row.y),
    shape: tableShapeForSeats(seats),
    mergeId,
  }
}

async function loadMergeEvents(db: ServiceDb): Promise<FallbackMerge[]> {
  const { data, error } = await db
    .from("status_events")
    .select("entity_id, to_status, reason, created_at")
    .eq("entity_type", MERGE_EVENT_TYPE)
    .like("reason", "{%")
    .order("created_at", { ascending: true })
  if (error) {
    console.error("[operations] loadMergeEvents:", error.message)
    return []
  }
  return activeMergesFromEvents(data ?? [])
}

async function recordMergeEvent(
  db: ServiceDb,
  mergeId: string,
  toStatus: string,
  reason: string,
  fromStatus: string | null = null,
) {
  const { error } = await db.from("status_events").insert({
    entity_type: MERGE_EVENT_TYPE,
    entity_id: mergeId,
    from_status: fromStatus,
    to_status: toStatus,
    reason,
  })
  if (error) {
    console.error("[operations] recordMergeEvent:", error.message)
    return error
  }
  return null
}

async function loadMergeContext(db: ServiceDb, tableId: string): Promise<MergeContext | null> {
  const { data: membership, error: membershipError } = await db
    .from("table_merge_members")
    .select("merge_id")
    .eq("table_id", tableId)
    .maybeSingle()

  if (membershipError) {
    console.error("[operations] loadMergeContext:", membershipError.message)
    const fallback = (await loadMergeEvents(db)).find((merge) => merge.tableIds.includes(tableId))
    if (!fallback) return null
    return {
      mergeId: fallback.id,
      expectedMinutes: fallback.expectedMinutes,
      status: fallback.status,
      expiresAt: fallback.expiresAt,
      tableIds: fallback.tableIds,
    }
  }
  if (!membership?.merge_id) return null

  const { data: merge } = await db.from("table_merges").select("*").eq("id", membership.merge_id).maybeSingle()
  const { data: members } = await db
    .from("table_merge_members")
    .select("table_id")
    .eq("merge_id", membership.merge_id)
  if (!merge) return null

  return {
    mergeId: String(merge.id),
    expectedMinutes: clampExpectedMinutes(Number(merge.expected_minutes ?? DEFAULT_EXPECTED_MINUTES)),
    status: merge.status as TableStatus,
    expiresAt: String(merge.expires_at),
    tableIds: (members ?? []).map((row) => String(row.table_id)),
  }
}

async function dissolveMerge(db: ServiceDb, mergeId: string, reason = "split") {
  // to_status must be a table status — live DBs may also check that column.
  await recordMergeEvent(db, mergeId, "available", reason)
  const { error } = await db.from("table_merges").delete().eq("id", mergeId)
  if (error && !isMissingRelationError(error)) {
    console.error("[operations] dissolveMerge:", error.message)
  }
}

function mapMerge(
  row: Record<string, unknown>,
  members: Array<{ id: string; label: string; seats: number }>,
): PersistedMerge {
  return {
    id: String(row.id),
    expectedMinutes: clampExpectedMinutes(Number(row.expected_minutes ?? DEFAULT_EXPECTED_MINUTES)),
    expiresAt: String(row.expires_at),
    status: row.status as TableStatus,
    tableIds: members.map((member) => member.id),
    seats: mergeSeatCapacity(members),
    label: mergeLabel(members),
  }
}

export async function getTables(): Promise<PersistedTable[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const db = createServiceClient()
  const { data, error } = await db.from("tables").select("*").order("label")
  if (error) { console.error("[operations] getTables:", error.message); return [] }
  const { data: members, error: memberError } = await db.from("table_merge_members").select("merge_id, table_id")
  let mergeByTable = new Map((members ?? []).map((row) => [String(row.table_id), String(row.merge_id)]))
  if (memberError) {
    console.error("[operations] getTables members:", memberError.message)
    mergeByTable = new Map(
      (await loadMergeEvents(db)).flatMap((merge) => merge.tableIds.map((id) => [id, merge.id] as const)),
    )
  }
  return (data ?? []).map((row) => mapTable(row, mergeByTable.get(String(row.id)) ?? null))
}

export async function getActiveMerges(): Promise<PersistedMerge[]> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return []

  const db = createServiceClient()
  const { data: merges, error } = await db.from("table_merges").select("*")
  if (error) {
    console.error("[operations] getActiveMerges:", error.message)
    return (await loadMergeEvents(db)).map((merge) => ({
      id: merge.id,
      expectedMinutes: merge.expectedMinutes,
      expiresAt: merge.expiresAt,
      status: merge.status,
      tableIds: merge.tableIds,
      seats: merge.seats,
      label: merge.label,
    }))
  }
  const { data: members } = await db.from("table_merge_members").select("merge_id, table_id")
  const { data: tables } = await db.from("tables").select("id, label, seats")
  const tableById = new Map((tables ?? []).map((row) => [String(row.id), row]))

  return (merges ?? []).flatMap((merge) => {
    const mergeMembers = (members ?? [])
      .filter((row) => row.merge_id === merge.id)
      .map((row) => tableById.get(String(row.table_id)))
      .filter((row): row is { id: string; label: string; seats: number } => Boolean(row))
      .map((row) => ({ id: String(row.id), label: String(row.label), seats: Number(row.seats) }))
    if (mergeMembers.length < 2) return []
    return [mapMerge(merge, mergeMembers)]
  })
}

export async function expireDueMerges(now = new Date()): Promise<number> {
  const staffUser = await requireStaffUser()
  if (!staffUser) return 0

  const merges = await getActiveMerges()
  const db = createServiceClient()
  let expired = 0
  for (const merge of merges) {
    if (!shouldExpireMerge(merge, now)) continue
    await dissolveMerge(db, merge.id, "expired")
    expired += 1
  }
  if (expired > 0) revalidatePath("/admin/floor")
  return expired
}

async function applyStatusToIds(
  db: ServiceDb,
  ids: string[],
  fromStatus: string,
  status: TableStatus,
) {
  const now = new Date().toISOString()
  for (const id of ids) {
    const { error } = await db.from("tables").update({ status, updated_at: now }).eq("id", id)
    if (error) throw new Error("Unable to update table")
    await db.from("status_events").insert({
      entity_type: "table",
      entity_id: id,
      from_status: fromStatus,
      to_status: status,
    })
  }
}

export async function updateTableState(input: {
  id: string
  status?: TableStatus
  seats?: number
  expectedMinutes?: number
}) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: current, error: currentError } = await db.from("tables").select("status").eq("id", input.id).single()
  if (currentError || !current) throw new Error("Table not found")
  if (input.status && (!TABLE_STATUSES.has(input.status) || !TABLE_TRANSITIONS[current.status as TableStatus].includes(input.status))) {
    throw new Error(`Invalid table transition: ${current.status} → ${input.status}`)
  }

  const merge = input.status !== undefined || input.expectedMinutes !== undefined
    ? await loadMergeContext(db, input.id)
    : null
  const targetIds = merge?.tableIds.length ? merge.tableIds : [input.id]
  const now = new Date()

  if (input.seats !== undefined) {
    const seats = Math.max(1, Math.min(12, Math.round(input.seats)))
    const { error } = await db.from("tables").update({
      seats,
      shape: tableShapeForSeats(seats),
      updated_at: now.toISOString(),
    }).eq("id", input.id)
    if (error) throw new Error("Unable to update table")
  }

  if (input.expectedMinutes !== undefined) {
    const expectedMinutes = clampExpectedMinutes(input.expectedMinutes)
    if (merge) {
      const expiresAt = mergeExpiresAt(now, expectedMinutes).toISOString()
      const { error } = await db.from("table_merges").update({
        expected_minutes: expectedMinutes,
        expires_at: expiresAt,
        updated_at: now.toISOString(),
      }).eq("id", merge.mergeId)
      if (error) throw new Error("Unable to update expected time")
    } else {
      const { error } = await db.from("tables").update({
        expected_minutes: expectedMinutes,
        updated_at: now.toISOString(),
      }).eq("id", input.id)
      if (error) throw new Error("Unable to update expected time")
    }
  }

  if (input.status) {
    await applyStatusToIds(db, targetIds, String(current.status), input.status)
    if (merge) {
      if (dissolvesMerge(input.status)) {
        await dissolveMerge(db, merge.mergeId, `status:${input.status}`)
      } else {
        const patch: Record<string, unknown> = { status: input.status, updated_at: now.toISOString() }
        if (restartsMergeClock(input.status)) {
          patch.expires_at = mergeExpiresAt(now, merge.expectedMinutes).toISOString()
        }
        const { error } = await db.from("table_merges").update(patch).eq("id", merge.mergeId)
        if (error) throw new Error("Unable to update arrangement")
      }
    }
  }

  revalidatePath("/admin/floor")
  revalidatePath("/pos")
}

export async function syncTableGroupStatus(label: string, status: TableStatus) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")
  if (!TABLE_STATUSES.has(status)) throw new Error("Invalid table status")

  const db = createServiceClient()
  const { data: table, error } = await db.from("tables").select("id, status").eq("label", label).maybeSingle()
  if (error || !table) return

  const merge = await loadMergeContext(db, String(table.id))
  const targetIds = merge?.tableIds.length ? merge.tableIds : [String(table.id)]
  const now = new Date()
  await applyStatusToIds(db, targetIds, String(table.status), status)

  if (merge) {
    if (dissolvesMerge(status)) {
      await dissolveMerge(db, merge.mergeId, `status:${status}`)
    } else {
      const patch: Record<string, unknown> = { status, updated_at: now.toISOString() }
      if (restartsMergeClock(status)) {
        patch.expires_at = mergeExpiresAt(now, merge.expectedMinutes).toISOString()
      }
      await db.from("table_merges").update(patch).eq("id", merge.mergeId)
    }
  }

  revalidatePath("/admin/floor")
  revalidatePath("/pos")
}

async function membersForMerge(db: ServiceDb, mergeId: string) {
  const { data: members } = await db
    .from("table_merge_members")
    .select("table_id")
    .eq("merge_id", mergeId)
  const memberIds = (members ?? []).map((row) => String(row.table_id))
  if (memberIds.length === 0) return []
  const { data: rows } = await db.from("tables").select("*").in("id", memberIds)
  return (rows ?? []).map((row) => mapTable(row, mergeId))
}

export type MergeTablesResult = PersistedMerge | { error: string }

async function persistMergeViaEvents(
  db: ServiceDb,
  members: PersistedTable[],
  tableIds: string[],
  expectedMinutes: number,
  expiresAt: string,
  existingId?: string,
  fromStatus: string | null = null,
): Promise<MergeTablesResult> {
  const mergeId = existingId ?? crypto.randomUUID()
  const payload = mergeStateFromTables(tableIds, members, {
    expectedMinutes,
    expiresAt,
    status: "available",
  })
  if (payload.tableIds.length < 2) return { error: "Select at least two tables to merge." }
  const eventError = await recordMergeEvent(
    db,
    mergeId,
    "available",
    encodeMergeState(payload),
    fromStatus,
  )
  if (eventError) return { error: eventError.message || "Unable to merge tables" }
  revalidatePath("/admin/floor")
  return {
    id: mergeId,
    expectedMinutes: payload.expectedMinutes,
    expiresAt: payload.expiresAt,
    status: payload.status,
    tableIds: payload.tableIds,
    seats: payload.seats,
    label: payload.label,
  }
}

export async function mergeTables(input: {
  tableIds: string[]
  expectedMinutes?: number
}): Promise<MergeTablesResult> {
  try {
    const staffUser = await requireStaffUser()
    if (!staffUser) return { error: "Unauthorized" }

    const ids = [...new Set(input.tableIds ?? [])]
    const db = createServiceClient()
    const { data: rows, error } = await db.from("tables").select("*").in("id", ids)
    if (error || !rows || rows.length !== ids.length) return { error: "Tables not found" }

    const { data: existing, error: existingError } = await db
      .from("table_merge_members")
      .select("merge_id, table_id")
      .in("table_id", ids)

    const mapped = rows.map((row) => {
      const membership = (existing ?? []).find((member) => String(member.table_id) === String(row.id))
      return mapTable(row, membership ? String(membership.merge_id) : null)
    })

    if (existingError) {
      console.error("[operations] mergeTables members:", existingError.message)
      return mergeUsingEvents(db, mapped, ids, input.expectedMinutes)
    }

    const mergeIds = [...new Set((existing ?? []).map((row) => String(row.merge_id)))]
    if (mergeIds.length > 1) {
      return { error: "Split an arrangement before combining it with another." }
    }

    if (mergeIds.length === 1) {
      const mergeId = mergeIds[0]!
      const { data: merge, error: mergeReadError } = await db
        .from("table_merges")
        .select("*")
        .eq("id", mergeId)
        .maybeSingle()
      if (mergeReadError || !merge) {
        if (isMissingRelationError(mergeReadError)) {
          return mergeUsingEvents(db, mapped, ids, input.expectedMinutes)
        }
        return { error: "Arrangement not found" }
      }

      const newcomers = mapped.filter((table) => !table.mergeId)
      const reason = canAddTablesToMerge({ status: merge.status as TableStatus }, newcomers)
      if (reason) return { error: reason }

      const { error: memberError } = await db
        .from("table_merge_members")
        .insert(newcomers.map((table) => ({ merge_id: mergeId, table_id: table.id })))
      if (memberError) {
        console.error("[operations] mergeTables add:", memberError.message)
        if (isMissingRelationError(memberError)) {
          return mergeUsingEvents(db, mapped, ids, input.expectedMinutes)
        }
        return { error: memberError.message || "Unable to merge tables" }
      }

      const allMembers = await membersForMerge(db, mergeId)
      const expectedMinutes = clampExpectedMinutes(
        input.expectedMinutes ?? defaultMergeExpectedMinutes(
          allMembers.length ? allMembers : mapped,
        ),
      )
      const now = new Date()
      const expiresAt = mergeExpiresAt(now, expectedMinutes).toISOString()
      const { error: updateError } = await db.from("table_merges").update({
        expected_minutes: expectedMinutes,
        expires_at: expiresAt,
        updated_at: now.toISOString(),
      }).eq("id", mergeId)
      if (updateError) {
        console.error("[operations] mergeTables update:", updateError.message)
        if (isMissingRelationError(updateError)) {
          return persistMergeViaEvents(db, allMembers.length ? allMembers : mapped, ids, expectedMinutes, expiresAt, mergeId, String(merge.status))
        }
        return { error: updateError.message || "Unable to merge tables" }
      }

      const payload = mergeStateFromTables(
        allMembers.map((table) => table.id),
        allMembers,
        { expectedMinutes, expiresAt, status: merge.status as TableStatus },
      )
      await recordMergeEvent(db, mergeId, String(merge.status), encodeMergeState(payload), String(merge.status))
      revalidatePath("/admin/floor")
      return mapMerge({ ...merge, expected_minutes: expectedMinutes, expires_at: expiresAt }, allMembers)
    }

    const reason = canMergeTables(mapped)
    if (reason) return { error: reason }

    const expectedMinutes = clampExpectedMinutes(
      input.expectedMinutes ?? defaultMergeExpectedMinutes(mapped),
    )
    const now = new Date()
    const expiresAt = mergeExpiresAt(now, expectedMinutes).toISOString()
    const { data: merge, error: mergeError } = await db
      .from("table_merges")
      .insert({
        expected_minutes: expectedMinutes,
        expires_at: expiresAt,
        status: "available",
      })
      .select("*")
      .single()
    if (mergeError || !merge) {
      console.error("[operations] mergeTables:", mergeError?.message)
      if (isMissingRelationError(mergeError)) {
        return persistMergeViaEvents(db, mapped, ids, expectedMinutes, expiresAt)
      }
      return { error: mergeError?.message || "Unable to merge tables" }
    }

    const { error: memberError } = await db
      .from("table_merge_members")
      .insert(ids.map((table_id) => ({ merge_id: merge.id, table_id })))
    if (memberError) {
      console.error("[operations] mergeTables members:", memberError.message)
      await db.from("table_merges").delete().eq("id", merge.id)
      if (isMissingRelationError(memberError)) {
        return persistMergeViaEvents(db, mapped, ids, expectedMinutes, expiresAt)
      }
      return { error: memberError.message || "Unable to merge tables" }
    }

    const payload = mergeStateFromTables(ids, mapped, {
      expectedMinutes,
      expiresAt,
      status: "available",
    })
    await recordMergeEvent(db, String(merge.id), "available", encodeMergeState(payload))
    revalidatePath("/admin/floor")
    return mapMerge(merge, mapped)
  } catch (error) {
    console.error("[operations] mergeTables unexpected:", error)
    return { error: error instanceof Error ? error.message : "Unable to merge tables" }
  }
}

async function mergeUsingEvents(
  db: ServiceDb,
  mapped: PersistedTable[],
  ids: string[],
  expectedMinutesInput?: number,
): Promise<MergeTablesResult> {
  const active = await loadMergeEvents(db)
  const touching = active.filter((merge) => ids.some((id) => merge.tableIds.includes(id)))
  if (touching.length > 1) {
    return { error: "Split an arrangement before combining it with another." }
  }

  if (touching.length === 1) {
    const merge = touching[0]!
    const newcomers = mapped.filter((table) => !merge.tableIds.includes(table.id))
    const reason = canAddTablesToMerge({ status: merge.status }, newcomers)
    if (reason) return { error: reason }
    const tableIds = [...new Set([...merge.tableIds, ...newcomers.map((table) => table.id)])]
    const catalog = [
      ...mapped,
      ...merge.tableIds
        .filter((id) => !mapped.some((table) => table.id === id))
        .map((id) => ({ id, label: id, seats: 0, status: "available" as const, expectedMinutes: merge.expectedMinutes, x: 0, y: 0, shape: "square" as const, mergeId: merge.id })),
    ]
    const { data: extra } = await db.from("tables").select("*").in("id", tableIds)
    const members = (extra ?? []).map((row) => mapTable(row))
    const expectedMinutes = clampExpectedMinutes(
      expectedMinutesInput ?? defaultMergeExpectedMinutes(members.length ? members : catalog),
    )
    const expiresAt = mergeExpiresAt(new Date(), expectedMinutes).toISOString()
    return persistMergeViaEvents(
      db,
      members.length ? members : catalog,
      tableIds,
      expectedMinutes,
      expiresAt,
      merge.id,
      merge.status,
    )
  }

  const reason = canMergeTables(mapped)
  if (reason) return { error: reason }
  const expectedMinutes = clampExpectedMinutes(
    expectedMinutesInput ?? defaultMergeExpectedMinutes(mapped),
  )
  const expiresAt = mergeExpiresAt(new Date(), expectedMinutes).toISOString()
  return persistMergeViaEvents(db, mapped, ids, expectedMinutes, expiresAt)
}

export async function splitMerge(mergeId: string) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: merge, error } = await db.from("table_merges").select("id").eq("id", mergeId).maybeSingle()
  if (error || !merge) {
    const fallback = (await loadMergeEvents(db)).find((row) => row.id === mergeId)
    if (!fallback) throw new Error("Arrangement not found")
  }
  await dissolveMerge(db, mergeId, "split")
  revalidatePath("/admin/floor")
}

export async function createTable() {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { data: existing } = await db.from("tables").select("label").order("label")
  const next = Math.max(0, ...(existing ?? []).map((row) => Number(row.label) || 0)) + 1
  const seats = 2
  const { data, error } = await db.from("tables").insert({
    label: String(next),
    seats,
    status: "available",
    expected_minutes: DEFAULT_EXPECTED_MINUTES,
    x: 0,
    y: 0,
    shape: tableShapeForSeats(seats),
  }).select("*").single()
  if (error) throw new Error("Unable to add table")
  revalidatePath("/admin/floor")
  return mapTable(data)
}

export async function deleteTable(id: string) {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const merge = await loadMergeContext(db, id)
  if (merge) await dissolveMerge(db, merge.mergeId, "table-removed")
  const { error } = await db.from("tables").delete().eq("id", id)
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
