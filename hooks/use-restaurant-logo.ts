"use client"

import useSWR from "swr"
import { getRestaurantLogoUrl } from "@/app/actions/branding"

/**
 * Shared SWR key so every surface that renders the restaurant's logo (staff
 * sidebar, public site header, staff login) reads from — and revalidates
 * against — the same cache entry.
 */
export const RESTAURANT_LOGO_SWR_KEY = "restaurant-logo"

/**
 * Fetches the restaurant's custom logo URL (set via the admin dashboard).
 * Returns `null` while loading or when no custom logo has been uploaded —
 * callers should fall back to their own default brand mark in that case.
 */
export function useRestaurantLogo() {
  const { data, mutate, isLoading } = useSWR(RESTAURANT_LOGO_SWR_KEY, getRestaurantLogoUrl)
  return { logoUrl: data ?? null, isLoading, mutate }
}
