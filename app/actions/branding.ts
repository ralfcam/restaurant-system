"use server"

import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import { requireStaffUser } from "@/lib/supabase/require-staff"
import {
  BRANDING_BUCKET,
  BRANDING_REVALIDATE_PATHS,
  HERO_STORAGE_PATHS,
  LOGO_STORAGE_PATHS,
  type LogoUploadInput,
  brandingBucketOptions,
  heroStoragePath,
  isMissingBucketError,
  logoBytesFromBase64,
  logoStoragePath,
  resolveHeroContentType,
  resolveLogoContentType,
  validateHeroUpload,
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

export async function getRestaurantHeroImageUrl(): Promise<string | null> {
  const { data, error } = await createServiceClient()
    .from("restaurant_settings")
    .select("hero_image_url")
    .eq("id", 1)
    .maybeSingle()
  if (error) {
    console.error("[branding] getRestaurantHeroImageUrl:", error.message)
    return null
  }
  return data?.hero_image_url ?? null
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

type ServiceDb = ReturnType<typeof createServiceClient>

async function createBrandingBucketIfMissing(db: ServiceDb): Promise<{ error?: string }> {
  const { error: createError } = await db.storage.createBucket(
    BRANDING_BUCKET,
    brandingBucketOptions(),
  )
  if (createError && !/already exists/i.test(createError.message)) {
    console.error("[branding] createBucket:", createError.message)
    return { error: "Could not upload the logo. Please try again." }
  }
  return {}
}

async function removeStoredLogos(db: ServiceDb): Promise<{ error?: string }> {
  const { error } = await db.storage.from(BRANDING_BUCKET).remove(LOGO_STORAGE_PATHS)
  if (error && !isMissingBucketError(error)) {
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

  const contentType = resolveLogoContentType(input.contentType, input.fileName)
  if (!contentType) {
    return { logoUrl: "", error: "Please upload a PNG, JPG, SVG, or WEBP image." }
  }

  const bytes = logoBytesFromBase64(input.base64)
  const path = logoStoragePath(contentType)
  const db = createServiceClient()

  const uploadOptions = { contentType, upsert: true }
  let { error: uploadError } = await db.storage
    .from(BRANDING_BUCKET)
    .upload(path, bytes, uploadOptions)
  if (uploadError && isMissingBucketError(uploadError)) {
    const created = await createBrandingBucketIfMissing(db)
    if (created.error) return { logoUrl: "", error: created.error }
    ;({ error: uploadError } = await db.storage
      .from(BRANDING_BUCKET)
      .upload(path, bytes, uploadOptions))
  }
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

async function removeStoredHeroImages(db: ServiceDb): Promise<{ error?: string }> {
  const { error } = await db.storage.from(BRANDING_BUCKET).remove(HERO_STORAGE_PATHS)
  if (error && !isMissingBucketError(error)) {
    console.error("[branding] hero storage remove:", error.message)
    return { error: "Could not remove the stored hero image. Please try again." }
  }
  return {}
}

// See the comment on `uploadRestaurantLogo` — same base64-over-Server-Action
// rationale applies here.
export async function uploadRestaurantHeroImage(
  input: LogoUploadInput,
): Promise<{ heroImageUrl: string; error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const validationError = validateHeroUpload(input)
  if (validationError) {
    return { heroImageUrl: "", error: validationError }
  }

  const contentType = resolveHeroContentType(input.contentType, input.fileName)
  if (!contentType) {
    return { heroImageUrl: "", error: "Please upload a PNG, JPG, or WEBP image." }
  }

  const bytes = logoBytesFromBase64(input.base64)
  const path = heroStoragePath(contentType)
  const db = createServiceClient()

  const uploadOptions = { contentType, upsert: true }
  let { error: uploadError } = await db.storage
    .from(BRANDING_BUCKET)
    .upload(path, bytes, uploadOptions)
  if (uploadError && isMissingBucketError(uploadError)) {
    const created = await createBrandingBucketIfMissing(db)
    if (created.error) return { heroImageUrl: "", error: created.error }
    ;({ error: uploadError } = await db.storage
      .from(BRANDING_BUCKET)
      .upload(path, bytes, uploadOptions))
  }
  if (uploadError) {
    console.error("[branding] hero upload error:", uploadError.message)
    return { heroImageUrl: "", error: "Could not upload the hero image. Please try again." }
  }

  const stalePaths = HERO_STORAGE_PATHS.filter((stored) => stored !== path)
  if (stalePaths.length > 0) {
    const { error: cleanupError } = await db.storage.from(BRANDING_BUCKET).remove(stalePaths)
    if (cleanupError) {
      console.error("[branding] stale hero cleanup:", cleanupError.message)
    }
  }

  const { data: publicUrlData } = db.storage.from(BRANDING_BUCKET).getPublicUrl(path)
  const heroImageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: settingsError } = await db
    .from("restaurant_settings")
    .upsert({ id: 1, hero_image_url: heroImageUrl, updated_at: new Date().toISOString() })
  if (settingsError) {
    console.error("[branding] hero settings update error:", settingsError.message)
    return { heroImageUrl: "", error: "Hero image uploaded but could not be saved. Please try again." }
  }

  revalidateBrandingSurfaces()
  return { heroImageUrl }
}

export async function removeRestaurantHeroImage(): Promise<{ error?: string }> {
  const staffUser = await requireStaffUser()
  if (!staffUser) throw new Error("Unauthorized")

  const db = createServiceClient()
  const stored = await removeStoredHeroImages(db)
  if (stored.error) return stored

  const { error } = await db.from("restaurant_settings").upsert({
    id: 1,
    hero_image_url: null,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error("[branding] removeRestaurantHeroImage:", error.message)
    return { error: "Could not remove the hero image. Please try again." }
  }

  revalidateBrandingSurfaces()
  return {}
}
