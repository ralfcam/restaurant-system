"use server"

import { revalidatePath } from "next/cache"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import { getAllOperatingWindows } from "@/app/actions/availability"
import { RESTAURANT } from "@/lib/data"
import { summarizeOperatingDays } from "@/lib/reservations/operating-hours"
import { createServiceClient } from "@/lib/supabase/service"

export type RestaurantInfoBar = {
  hours: string
  address: string
  phone: string
}

export async function getRestaurantInfoBar(): Promise<RestaurantInfoBar> {
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
    hours: summarizeOperatingDays(operatingDays),
    address: settings.data?.address?.trim() || RESTAURANT.address,
    phone: settings.data?.phone?.trim() || RESTAURANT.phone,
  }
}

export async function updateRestaurantContactInfo(input: {
  address: string
  phone: string
}): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const address = input.address.trim()
  const phone = input.phone.trim()
  if (!address || !phone) {
    return { error: "Address and phone are required." }
  }
  if (address.length > 240 || phone.length > 40) {
    return { error: "Address or phone is too long." }
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
    return { error: "Could not save contact information. Please try again." }
  }

  revalidatePath("/", "layout")
  revalidatePath("/admin/scheduling")
  return {}
}
