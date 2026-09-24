"use server"

import { cache } from "react"
import { revalidatePath } from "next/cache"
import { createServiceClient } from "@/lib/supabase/service"
import {
  requireStaffUser,
  requireSuperAdminUser,
} from "@/lib/supabase/require-staff"
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
import {
  clampExpectedMinutes,
  DEFAULT_EXPECTED_MINUTES,
} from "@/lib/floor/table-use"
import {
  clampSafetyBufferMinutes,
  clampSlotIntervalMinutes,
  DEFAULT_SAFETY_BUFFER_MINUTES,
  DEFAULT_SLOT_INTERVAL_MINUTES,
  type SlotIntervalMinutes,
} from "@/lib/reservations/operating-hours"

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

async function createBrandingBucketIfMissing(
  db: ServiceDb,
  uploadFailedKey:
    "errors.branding.logoUploadFailed" | "errors.branding.heroUploadFailed",
): Promise<{ error?: string }> {
  const { error: createError } = await db.storage.createBucket(
    BRANDING_BUCKET,
    brandingBucketOptions(),
  )
  if (createError && !/already exists/i.test(createError.message)) {
    console.error("[branding] createBucket:", createError.message)
    return { error: uploadFailedKey }
  }
  return {}
}

async function removeStoredLogos(db: ServiceDb): Promise<{ error?: string }> {
  const { error } = await db.storage
    .from(BRANDING_BUCKET)
    .remove(LOGO_STORAGE_PATHS)
  if (error && !isMissingBucketError(error)) {
    console.error("[branding] storage remove:", error.message)
    return { error: "errors.branding.logoStorageRemoveFailed" }
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
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.branding.unauthorized")

  const validationError = validateLogoUpload(input)
  if (validationError) {
    return { logoUrl: "", error: validationError }
  }

  const contentType = resolveLogoContentType(input.contentType, input.fileName)
  if (!contentType) {
    return {
      logoUrl: "",
      error: "errors.branding.logoContentType",
    }
  }

  const bytes = logoBytesFromBase64(input.base64)
  const path = logoStoragePath(contentType)
  const db = createServiceClient()

  const uploadOptions = { contentType, upsert: true }
  let { error: uploadError } = await db.storage
    .from(BRANDING_BUCKET)
    .upload(path, bytes, uploadOptions)
  if (uploadError && isMissingBucketError(uploadError)) {
    const created = await createBrandingBucketIfMissing(
      db,
      "errors.branding.logoUploadFailed",
    )
    if (created.error) return { logoUrl: "", error: created.error }
    ;({ error: uploadError } = await db.storage
      .from(BRANDING_BUCKET)
      .upload(path, bytes, uploadOptions))
  }
  if (uploadError) {
    console.error("[branding] upload error:", uploadError.message)
    return {
      logoUrl: "",
      error: "errors.branding.logoUploadFailed",
    }
  }

  const stalePaths = LOGO_STORAGE_PATHS.filter((stored) => stored !== path)
  if (stalePaths.length > 0) {
    const { error: cleanupError } = await db.storage
      .from(BRANDING_BUCKET)
      .remove(stalePaths)
    if (cleanupError) {
      console.error("[branding] stale logo cleanup:", cleanupError.message)
    }
  }

  const { data: publicUrlData } = db.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(path)
  const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: settingsError } = await db
    .from("restaurant_settings")
    .upsert({ id: 1, logo_url: logoUrl, updated_at: new Date().toISOString() })
  if (settingsError) {
    console.error("[branding] settings update error:", settingsError.message)
    return {
      logoUrl: "",
      error: "errors.branding.logoSaveFailed",
    }
  }

  revalidateBrandingSurfaces()
  return { logoUrl }
}

export async function removeRestaurantLogo(): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.branding.unauthorized")

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
    return { error: "errors.branding.logoRemoveFailed" }
  }

  revalidateBrandingSurfaces()
  return {}
}

async function removeStoredHeroImages(
  db: ServiceDb,
): Promise<{ error?: string }> {
  const { error } = await db.storage
    .from(BRANDING_BUCKET)
    .remove(HERO_STORAGE_PATHS)
  if (error && !isMissingBucketError(error)) {
    console.error("[branding] hero storage remove:", error.message)
    return {
      error: "errors.branding.heroStorageRemoveFailed",
    }
  }
  return {}
}

// See the comment on `uploadRestaurantLogo` — same base64-over-Server-Action
// rationale applies here.
export async function uploadRestaurantHeroImage(
  input: LogoUploadInput,
): Promise<{ heroImageUrl: string; error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.branding.unauthorized")

  const validationError = validateHeroUpload(input)
  if (validationError) {
    return { heroImageUrl: "", error: validationError }
  }

  const contentType = resolveHeroContentType(input.contentType, input.fileName)
  if (!contentType) {
    return {
      heroImageUrl: "",
      error: "errors.branding.heroContentType",
    }
  }

  const bytes = logoBytesFromBase64(input.base64)
  const path = heroStoragePath(contentType)
  const db = createServiceClient()

  const uploadOptions = { contentType, upsert: true }
  let { error: uploadError } = await db.storage
    .from(BRANDING_BUCKET)
    .upload(path, bytes, uploadOptions)
  if (uploadError && isMissingBucketError(uploadError)) {
    const created = await createBrandingBucketIfMissing(
      db,
      "errors.branding.heroUploadFailed",
    )
    if (created.error) return { heroImageUrl: "", error: created.error }
    ;({ error: uploadError } = await db.storage
      .from(BRANDING_BUCKET)
      .upload(path, bytes, uploadOptions))
  }
  if (uploadError) {
    console.error("[branding] hero upload error:", uploadError.message)
    return {
      heroImageUrl: "",
      error: "errors.branding.heroUploadFailed",
    }
  }

  const stalePaths = HERO_STORAGE_PATHS.filter((stored) => stored !== path)
  if (stalePaths.length > 0) {
    const { error: cleanupError } = await db.storage
      .from(BRANDING_BUCKET)
      .remove(stalePaths)
    if (cleanupError) {
      console.error("[branding] stale hero cleanup:", cleanupError.message)
    }
  }

  const { data: publicUrlData } = db.storage
    .from(BRANDING_BUCKET)
    .getPublicUrl(path)
  const heroImageUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

  const { error: settingsError } = await db.from("restaurant_settings").upsert({
    id: 1,
    hero_image_url: heroImageUrl,
    updated_at: new Date().toISOString(),
  })
  if (settingsError) {
    console.error(
      "[branding] hero settings update error:",
      settingsError.message,
    )
    return {
      heroImageUrl: "",
      error: "errors.branding.heroSaveFailed",
    }
  }

  revalidateBrandingSurfaces()
  return { heroImageUrl }
}

export async function removeRestaurantHeroImage(): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.branding.unauthorized")

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
    return { error: "errors.branding.heroRemoveFailed" }
  }

  revalidateBrandingSurfaces()
  return {}
}

type RestaurantBookingSettings = {
  slotInterval: SlotIntervalMinutes
  occupancyDuration: number
  safetyBuffer: number
}

const loadRestaurantBookingSettings = cache(
  async (): Promise<RestaurantBookingSettings | null> => {
    const staffUser = await requireStaffUser()
    if (!staffUser) return null

    const { data, error } = await createServiceClient()
      .from("restaurant_settings")
      .select(
        "slot_interval_minutes, occupancy_duration_minutes, safety_buffer_minutes",
      )
      .eq("id", 1)
      .maybeSingle()
    if (error) {
      console.error("[branding] loadRestaurantBookingSettings:", error.message)
      return null
    }
    return {
      slotInterval: clampSlotIntervalMinutes(
        data?.slot_interval_minutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
      ),
      occupancyDuration: clampExpectedMinutes(
        data?.occupancy_duration_minutes ?? DEFAULT_EXPECTED_MINUTES,
      ),
      safetyBuffer: clampSafetyBufferMinutes(
        data?.safety_buffer_minutes ?? DEFAULT_SAFETY_BUFFER_MINUTES,
      ),
    }
  },
)

async function upsertRestaurantSetting(
  patch: {
    slot_interval_minutes?: SlotIntervalMinutes
    occupancy_duration_minutes?: number
    safety_buffer_minutes?: number
  },
  logName: string,
  errorMessage: string,
): Promise<{ error?: string }> {
  const superAdminUser = await requireSuperAdminUser()
  if (!superAdminUser) throw new Error("errors.branding.unauthorized")

  const { error } = await createServiceClient()
    .from("restaurant_settings")
    .upsert({
      id: 1,
      ...patch,
      updated_at: new Date().toISOString(),
    })
  if (error) {
    console.error(`[branding] ${logName}:`, error.message)
    return { error: errorMessage }
  }

  revalidateBrandingSurfaces()
  return {}
}

export async function getSlotIntervalMinutes(): Promise<SlotIntervalMinutes> {
  const settings = await loadRestaurantBookingSettings()
  return settings?.slotInterval ?? DEFAULT_SLOT_INTERVAL_MINUTES
}

export async function updateSlotIntervalMinutes(
  minutes: number,
): Promise<{ error?: string }> {
  return upsertRestaurantSetting(
    { slot_interval_minutes: clampSlotIntervalMinutes(minutes) },
    "updateSlotIntervalMinutes",
    "errors.branding.slotIntervalSaveFailed",
  )
}

export async function getOccupancyDurationMinutes(): Promise<number> {
  const settings = await loadRestaurantBookingSettings()
  return settings?.occupancyDuration ?? DEFAULT_EXPECTED_MINUTES
}

export async function updateOccupancyDurationMinutes(
  minutes: number,
): Promise<{ error?: string }> {
  return upsertRestaurantSetting(
    { occupancy_duration_minutes: clampExpectedMinutes(minutes) },
    "updateOccupancyDurationMinutes",
    "errors.branding.occupancySaveFailed",
  )
}

export async function getSafetyBufferMinutes(): Promise<number> {
  const settings = await loadRestaurantBookingSettings()
  return settings?.safetyBuffer ?? DEFAULT_SAFETY_BUFFER_MINUTES
}

export async function updateSafetyBufferMinutes(
  minutes: number,
): Promise<{ error?: string }> {
  return upsertRestaurantSetting(
    { safety_buffer_minutes: clampSafetyBufferMinutes(minutes) },
    "updateSafetyBufferMinutes",
    "errors.branding.safetyBufferSaveFailed",
  )
}
