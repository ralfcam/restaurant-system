"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import {
  BRANDING_BUCKET,
  BRANDING_REVALIDATE_PATHS,
  LOGO_STORAGE_PATHS,
  type LogoUploadInput,
  logoStoragePath,
  validateLogoUpload,
} from "@/lib/branding"

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

function revalidateBrandingSurfaces() {
  for (const entry of BRANDING_REVALIDATE_PATHS) {
    if (entry.type) {
      revalidatePath(entry.path, entry.type)
    } else {
      revalidatePath(entry.path)
    }
  }
}

async function removeStoredLogos(
  db: ReturnType<typeof createServiceClient>,
): Promise<{ error?: string }> {
  const { error } = await db.storage.from(BRANDING_BUCKET).remove(LOGO_STORAGE_PATHS)
  if (error) {
    console.error("[branding] storage remove:", error.message)
    return { error: "Could not remove the stored logo. Please try again." }
  }
  return {}
}

// Accepts the file as a base64 string rather than FormData/File. Passing a
// File through FormData to a Server Action requires a multipart/form-data
// request body, which this environment's request pipeline mangles ("Error:
// Unexpected end of form"). Plain string arguments use the RSC flight
// serialization instead of multipart, sidestepping the issue entirely.
export async function uploadRestaurantLogo(
  input: LogoUploadInput,
): Promise<{ logoUrl: string; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const validationError = validateLogoUpload(input)
  if (validationError) {
    return { logoUrl: "", error: validationError }
  }

  const bytes = Buffer.from(input.base64, "base64")
  const path = logoStoragePath(input.contentType)
  const db = createServiceClient()

  const { error: uploadError } = await db.storage.from(BRANDING_BUCKET).upload(path, bytes, {
    contentType: input.contentType,
    upsert: true,
  })
  if (uploadError) {
    console.error("[branding] upload error:", uploadError.message)
    return { logoUrl: "", error: "Could not upload the logo. Please try again." }
  }

  const stalePaths = LOGO_STORAGE_PATHS.filter((stored) => stored !== path)
  if (stalePaths.length > 0) {
    const { error: cleanupError } = await db.storage.from(BRANDING_BUCKET).remove(stalePaths)
    if (cleanupError) {
      console.error("[branding] stale logo cleanup:", cleanupError.message)
    }
  }

  const { data: publicUrlData } = db.storage.from(BRANDING_BUCKET).getPublicUrl(path)
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: settingsError } = await db
    .from("restaurant_settings")
    .upsert({ id: 1, logo_url: logoUrl, updated_at: new Date().toISOString() })
  if (settingsError) {
    console.error("[branding] settings update error:", settingsError.message)
    return { logoUrl: "", error: "Logo uploaded but could not be saved. Please try again." }
  }

  revalidateBrandingSurfaces()
  return { logoUrl }
}

export async function removeRestaurantLogo(): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const stored = await removeStoredLogos(db)
  if (stored.error) return stored

  const { error } = await db.from("restaurant_settings").upsert({
    id: 1,
    logo_url: null,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error("[branding] removeRestaurantLogo:", error.message)
    return { error: "Could not remove the logo. Please try again." }
  }

  revalidateBrandingSurfaces()
  return {}
}
