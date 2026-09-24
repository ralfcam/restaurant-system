"use client"

import { useLocale, useTranslations } from "next-intl"
import useSWR from "swr"
import {
  getRestaurantInfoBar,
  type RestaurantInfoBar,
} from "@/app/actions/restaurant-info"
import { RESTAURANT } from "@/lib/data"

export function useRestaurantInfoBar(initialData?: RestaurantInfoBar) {
  const t = useTranslations("site")
  const locale = useLocale()
  const fallback: RestaurantInfoBar = {
    hours: t("hoursFallback"),
    address: RESTAURANT.address,
    phone: RESTAURANT.phone,
  }
  const { data, isLoading, mutate } = useSWR<RestaurantInfoBar>(
    ["restaurant-info-bar", locale],
    () => getRestaurantInfoBar(locale),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
    },
  )

  return {
    ...(data ?? fallback),
    isLoading,
    mutate,
  }
}
