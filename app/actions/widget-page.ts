"use server"

import { requireSuperAdminUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

function storedText(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

export async function updateStandaloneWidgetCopy(input: {
  restaurant_display_name: string
  tagline: string
  welcome_title: string
  welcome_message: string
  closing_message: string
  show_reservation_phone: boolean
}): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) return { error: "unauthorized" }

  const { error } = await createServiceClient()
    .from("restaurant_settings")
    .upsert({
      id: 1,
      restaurant_display_name: storedText(input.restaurant_display_name),
      tagline: storedText(input.tagline),
      welcome_title: storedText(input.welcome_title),
      welcome_message: storedText(input.welcome_message),
      closing_message: storedText(input.closing_message),
      show_reservation_phone: Boolean(input.show_reservation_phone),
      updated_at: new Date().toISOString(),
    })

  if (error) return { error: error.message }
  return {}
}
