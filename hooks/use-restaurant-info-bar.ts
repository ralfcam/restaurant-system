"use client"

import useSWR from "swr"
import {
  getRestaurantInfoBar,
  type RestaurantInfoBar,
} from "@/app/actions/restaurant-info"
import { RESTAURANT } from "@/lib/data"

const fallback: RestaurantInfoBar = {
  hours: RESTAURANT.hours,
  address: RESTAURANT.address,
  phone: RESTAURANT.phone,
}

export function useRestaurantInfoBar(initialData?: RestaurantInfoBar) {
  const { data, isLoading, mutate } = useSWR<RestaurantInfoBar>(
    "restaurant-info-bar",
    getRestaurantInfoBar,
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
