"use client"

import useSWR from "swr"
import {
  getFloorSnapshot,
  type FloorSnapshot,
} from "@/app/actions/reservations"
import { overlayReservationsOnTables } from "@/lib/reservations/auto-assign"
import { attachMergesToTables } from "@/lib/floor/floor-units"

/**
 * Shared SWR key so the dining-room grid and any other live floor surface
 * read from — and revalidate against — the same cache entry.
 */
export const FLOOR_PLAN_SWR_KEY = (date: string) =>
  ["floor-plan", date] as const

const FLOOR_REFRESH_MS = 5000

/**
 * Live Floor Plan data: tables + today's reservations, refreshed every 5s.
 * Each fetch runs auto-assign so a due reservation receives a table at the
 * proper time without a manual dropdown.
 */
export function useFloorPlan(date: string, fallbackData?: FloorSnapshot) {
  const { data, mutate, isLoading, isValidating } = useSWR(
    FLOOR_PLAN_SWR_KEY(date),
    () => getFloorSnapshot(date),
    { refreshInterval: FLOOR_REFRESH_MS, fallbackData },
  )

  const merges = data?.merges ?? []
  const tables = attachMergesToTables(
    overlayReservationsOnTables(
      data?.tables ?? [],
      data?.reservations ?? [],
      merges,
    ),
    merges,
  )

  return {
    tables,
    merges,
    reservations: data?.reservations ?? [],
    assigned: data?.assigned ?? [],
    isLoading: isLoading && !data,
    isValidating,
    mutate,
    isLive: true,
  }
}
