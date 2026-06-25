"use client"

import { useSyncExternalStore } from "react"
import {
  INITIAL_TICKETS,
  type OrderTicket,
  type OrderTicketStatus,
} from "@/lib/data"

// A lightweight in-memory store shared across POS and KDS routes.
// Cross-tab updates are synced with BroadcastChannel so a kitchen screen
// in another tab/device reflects new orders without a refresh.
// This stands in for a realtime backend (e.g. Supabase Realtime) for the MVP.

let tickets: OrderTicket[] = [...INITIAL_TICKETS]
const listeners = new Set<() => void>()

let channel: BroadcastChannel | null = null
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  channel = new BroadcastChannel("tavola-orders")
  channel.onmessage = (e) => {
    if (e.data?.type === "sync" && Array.isArray(e.data.tickets)) {
      tickets = e.data.tickets
      emit(false)
    }
  }
}

function emit(broadcast = true) {
  listeners.forEach((l) => l())
  if (broadcast && channel) {
    channel.postMessage({ type: "sync", tickets })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return tickets
}

function getServerSnapshot() {
  return INITIAL_TICKETS
}

export function useOrders() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

let counter = INITIAL_TICKETS.length + 200

export function addOrder(order: Omit<OrderTicket, "id" | "placedAt" | "status">) {
  counter += 1
  const now = new Date()
  const placedAt = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`
  const ticket: OrderTicket = {
    ...order,
    id: `ord-${counter}`,
    placedAt,
    status: "new",
  }
  tickets = [ticket, ...tickets]
  emit()
  return ticket
}

const NEXT: Record<OrderTicketStatus, OrderTicketStatus | null> = {
  new: "preparing",
  preparing: "ready",
  ready: null,
}

export function advanceOrder(id: string) {
  tickets = tickets.map((t) => {
    if (t.id !== id) return t
    const next = NEXT[t.status]
    return next ? { ...t, status: next } : t
  })
  emit()
}

export function bumpOrder(id: string) {
  // Remove a completed ticket from the rail (server picked it up).
  tickets = tickets.filter((t) => t.id !== id)
  emit()
}
