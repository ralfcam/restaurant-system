"use client"

import { useSyncExternalStore } from "react"
import {
  MENU_ITEMS,
  type MenuItem,
  type MenuCategory,
} from "@/lib/data"

// ---------------------------------------------------------------------------
// Client-side menu store (prototype). Mirrors lib/order-store.ts: an in-memory
// store backed by localStorage with cross-tab sync via BroadcastChannel, so
// edits made in /admin/menu reflect live on the guest /menu.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "tavola.menu.v1"

function seed(): MenuItem[] {
  return MENU_ITEMS.map((m) => ({ ...m, available: m.available ?? true }))
}

let items: MenuItem[] = seed()
let hydrated = false

const listeners = new Set<() => void>()

const channel: BroadcastChannel | null =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("tavola-menu")
    : null

function persist() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota/availability errors in the prototype
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MenuItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        items = parsed
      }
    }
  } catch {
    // ignore parse errors, keep seed
  }
}

function emit() {
  for (const l of listeners) l()
}

function setItems(next: MenuItem[], broadcast = true) {
  items = next
  persist()
  emit()
  if (broadcast && channel) channel.postMessage({ type: "sync" })
}

if (channel) {
  channel.onmessage = (e) => {
    if (e.data?.type === "sync") {
      // Another tab changed the menu — re-read from storage.
      try {
        const raw =
          typeof window !== "undefined"
            ? window.localStorage.getItem(STORAGE_KEY)
            : null
        if (raw) {
          items = JSON.parse(raw) as MenuItem[]
          emit()
        }
      } catch {
        // ignore
      }
    }
  }
}

function subscribe(listener: () => void) {
  hydrate()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return items
}

function getServerSnapshot() {
  return seed()
}

export function useMenu(): MenuItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

let counter = 0

export function upsertItem(item: MenuItem) {
  hydrate()
  const exists = items.some((i) => i.id === item.id)
  if (exists) {
    setItems(items.map((i) => (i.id === item.id ? item : i)))
  } else {
    setItems([{ ...item }, ...items])
  }
}

export function createItem(
  data: Omit<MenuItem, "id" | "available"> & { available?: boolean },
): MenuItem {
  hydrate()
  counter += 1
  const item: MenuItem = {
    ...data,
    id: `new-${Date.now()}-${counter}`,
    available: data.available ?? true,
  }
  setItems([item, ...items])
  return item
}

export function deleteItem(id: string) {
  hydrate()
  setItems(items.filter((i) => i.id !== id))
}

export function toggleAvailability(id: string) {
  hydrate()
  setItems(
    items.map((i) =>
      i.id === id ? { ...i, available: !(i.available ?? true) } : i,
    ),
  )
}

export type { MenuItem, MenuCategory }
