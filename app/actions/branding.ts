"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"

const BUCKET = "branding"
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
}

export async function getRestaurantLogoUrl(): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("restaurant_settings")
    .select("logo_url")
    .eq("id", 1)
    .maybeSingle()
  if (error) {
    console.error("[branding] getRestaurantLogoUrl:", error.message)
    return null
  }
  return data?.logo_url ?? null
}

export async function uploadRestaurantLogo(formData: FormData): Promise<{ logoUrl: string; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const file = formData.get("logo")
  if (!(file instanceof File) || file.size === 0) {
    return { logoUrl: "", error: "Please choose an image file." }
  }
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) {
    return { logoUrl: "", error: "Please upload a PNG, JPG, SVG, or WEBP image." }
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { logoUrl: "", error: "Logo image must be smaller than 2MB." }
  }

  const db = createServiceClient()
  // Fixed filename per extension keeps the bucket tidy (old logo of a
  // different format is orphaned but harmless); a cache-busting query
  // param is appended to the stored URL so the sidebar picks up changes
  // immediately without needing to invalidate a CDN cache by path.
  const path = `logo.${ext}`
  const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (uploadError) {
    console.log("[v0] upload error full:", JSON.stringify(uploadError))
    console.error("[branding] upload error:", uploadError.message)
    return { logoUrl: "", error: "Could not upload the logo. Please try again." }
  }

  const { data: publicUrlData } = db.storage.from(BUCKET).getPublicUrl(path)
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: settingsError } = await db
    .from("restaurant_settings")
    .upsert({ id: 1, logo_url: logoUrl, updated_at: new Date().toISOString() })
  if (settingsError) {
    console.error("[branding] settings update error:", settingsError.message)
    return { logoUrl: "", error: "Logo uploaded but could not be saved. Please try again." }
  }

  revalidatePath("/admin", "layout")
  revalidatePath("/pos")
  revalidatePath("/kds")
  return { logoUrl }
}

export async function removeRestaurantLogo(): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const { error } = await db.from("restaurant_settings").upsert({
    id: 1,
    logo_url: null,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error("[branding] removeRestaurantLogo:", error.message)
    return { error: "Could not remove the logo. Please try again." }
  }

  revalidatePath("/admin", "layout")
  revalidatePath("/pos")
  revalidatePath("/kds")
  return {}
}
