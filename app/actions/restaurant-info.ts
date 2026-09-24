"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdminUser } from "@/lib/supabase/require-staff"
import { getAllOperatingWindows } from "@/app/actions/availability"
import { RESTAURANT } from "@/lib/data"
import { summarizeOperatingDays } from "@/lib/reservations/operating-hours"
import { createServiceClient } from "@/lib/supabase/service"

export type RestaurantInfoBar = {
  hours: string
  address: string
  phone: string
}

export async function getRestaurantInfoBar(
  locale: string,
): Promise<RestaurantInfoBar> {
  const [operatingDays, settings] = await Promise.all([
    getAllOperatingWindows(),
    createServiceClient()
      .from("restaurant_settings")
      .select("address, phone")
      .eq("id", 1)
      .maybeSingle(),
  ])

  if (settings.error) {
    console.error(
      "[restaurant-info] getRestaurantInfoBar:",
      settings.error.message,
    )
  }

  return {
    hours: summarizeOperatingDays(operatingDays, locale),
    address: settings.data?.address?.trim() || RESTAURANT.address,
    phone: settings.data?.phone?.trim() || RESTAURANT.phone,
  }
}

export async function updateRestaurantContactInfo(input: {
  address: string
  phone: string
}): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.restaurantInfo.unauthorized")

  const address = input.address.trim()
  const phone = input.phone.trim()
  if (!address || !phone) {
    return { error: "errors.restaurantInfo.contactRequired" }
  }
  if (address.length > 240 || phone.length > 40) {
    return { error: "errors.restaurantInfo.contactTooLong" }
  }

  const { error } = await createServiceClient()
    .from("restaurant_settings")
    .upsert({
      id: 1,
      address,
      phone,
      updated_at: new Date().toISOString(),
    })
  if (error) {
    console.error(
      "[restaurant-info] updateRestaurantContactInfo:",
      error.message,
    )
    return { error: "errors.restaurantInfo.saveFailed" }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/scheduling")
  return {}
}
