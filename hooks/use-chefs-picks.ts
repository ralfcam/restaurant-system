"use client"

import useSWR from "swr"
import {
  getHomepageChefsPicks,
  type MenuItemRow,
} from "@/app/actions/menu"

export function useChefsPicks(initialData?: {
  enabled: boolean
  items: MenuItemRow[]
}) {
  const { data, isLoading, mutate } = useSWR(
    "homepage-chefs-picks",
    getHomepageChefsPicks,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    },
  )

  return {
    enabled: data?.enabled ?? true,
    items: data?.items ?? [],
    isLoading,
    mutate,
  }
}
