"use server"

import { isHttpsUrl } from "@/lib/marketing/https-url"
import { requireSuperAdminUser } from "@/lib/supabase/require-staff"
import { createServiceClient } from "@/lib/supabase/service"

export async function saveReviewEmailSettings(input: {
  enabled: boolean
  copy: string
  mapsUrl: string
  delayHours: number
}): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) return { error: "errors.marketing.unauthorized" }

  if (input.enabled && (!input.copy.trim() || !isHttpsUrl(input.mapsUrl))) {
    return { error: "errors.marketing.reviewEmailRequiresCopyAndHttps" }
  }

  const { error } = await createServiceClient()
    .from("restaurant_settings")
    .upsert({
      id: 1,
      review_email_enabled: input.enabled,
      review_email_copy: input.copy,
      review_email_maps_url: input.mapsUrl,
      review_email_delay_hours: input.delayHours,
      updated_at: new Date().toISOString(),
    })
  if (error) {
    console.error("[marketing] saveReviewEmailSettings:", error.message)
    return { error: "errors.marketing.reviewEmailSaveFailed" }
  }
  return {}
}
