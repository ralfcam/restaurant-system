"use client"

import useSWR from "swr"
import { getRestaurantHeroImageUrl } from "@/app/actions/branding"

/**
 * Shared SWR key so every surface that renders the homepage hero
 * background — the guest homepage and the admin hero editor — reads from
 * and revalidates against the same cache entry.
 */
export const RESTAURANT_HERO_IMAGE_SWR_KEY = "restaurant-hero-image"

/**
 * Fetches the restaurant's custom hero background image URL (set via the
 * admin dashboard). Returns `null` while loading or when no image has been
 * uploaded — callers should render a blank/neutral hero background in that
 * case, which is also the seeded default.
 */
export function useRestaurantHeroImage() {
  const { data, mutate, isLoading } = useSWR(
    RESTAURANT_HERO_IMAGE_SWR_KEY,
    getRestaurantHeroImageUrl,
  )
  return { heroImageUrl: data ?? null, isLoading, mutate }
}
