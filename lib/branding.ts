export const BRANDING_BUCKET = "branding"
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
/**
 * Hero photos are full-bleed backgrounds, so they're allowed a larger cap
 * than the logo mark. Server Actions share a single body-size limit for the
 * whole app — keep `next.config.mjs` big enough for the larger of the two
 * (see `HERO_UPLOAD_BODY_SIZE_LIMIT`).
 */
export const MAX_HERO_BYTES = 4 * 1024 * 1024
/**
 * Server Actions default to a 1MB body. A 2MB logo encoded as base64 is
 * ~2.7MB plus RSC framing, so the action limit must be raised to match
 * `MAX_LOGO_BYTES`. Keep this in sync with `next.config.mjs`.
 */
export const LOGO_UPLOAD_BODY_SIZE_LIMIT = "4mb"
/**
 * A 4MB hero photo encoded as base64 is ~5.4MB plus RSC framing. Keep this
 * in sync with `next.config.mjs` (`experimental.serverActions.bodySizeLimit`
 * is shared across all Server Actions, so it must cover the larger value).
 */
export const HERO_UPLOAD_BODY_SIZE_LIMIT = "8mb"
export const LOGO_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
}

/** Hero photos are full-bleed backgrounds — no SVG (vector marks only make sense for logos). */
export const HERO_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

const IMAGE_CONTENT_TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
}

/** @deprecated Use `IMAGE_CONTENT_TYPE_ALIASES`. Kept for external references. */
const LOGO_CONTENT_TYPE_ALIASES = IMAGE_CONTENT_TYPE_ALIASES

const LOGO_EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
}

const HERO_EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
}

export const LOGO_STORAGE_PATHS = Object.values(LOGO_CONTENT_TYPES).map(
  (ext) => `logo.${ext}`,
)

export const HERO_STORAGE_PATHS = Object.values(HERO_CONTENT_TYPES).map(
  (ext) => `hero.${ext}`,
)

export const BRANDING_REVALIDATE_PATHS: Array<{
  path: string
  type?: "layout" | "page"
}> = [
  { path: "/admin", type: "layout" },
  { path: "/admin/settings" },
  { path: "/pos" },
  { path: "/kds" },
  { path: "/", type: "layout" },
  { path: "/menu" },
  { path: "/en" },
  { path: "/en/menu" },
  { path: "/auth/login" },
]

export type LogoUploadInput = {
  /** Base64-encoded file contents (no data URL prefix). */
  base64: string
  contentType: string
  size: number
  /** Original file name — used when the browser leaves `type` empty. */
  fileName?: string
}

export function resolveLogoContentType(
  contentType?: string,
  fileName?: string,
): string | null {
  const aliased = contentType
    ? (LOGO_CONTENT_TYPE_ALIASES[contentType] ?? contentType)
    : ""
  if (aliased && LOGO_CONTENT_TYPES[aliased]) return aliased
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (ext && LOGO_EXTENSION_TYPES[ext]) return LOGO_EXTENSION_TYPES[ext]
  }
  return null
}

export function validateLogoUpload(input: Partial<LogoUploadInput>): string | null {
  if (!input.base64 || typeof input.size !== "number" || input.size <= 0) {
    return "Please choose an image file."
  }
  if (!resolveLogoContentType(input.contentType, input.fileName)) {
    return "Please upload a PNG, JPG, SVG, or WEBP image."
  }
  if (input.size > MAX_LOGO_BYTES) {
    return "Logo image must be smaller than 2MB."
  }
  return null
}

export function logoStoragePath(contentType: string, fileName?: string): string {
  const resolved = resolveLogoContentType(contentType, fileName)
  return `logo.${LOGO_CONTENT_TYPES[resolved ?? contentType]}`
}

export function resolveHeroContentType(
  contentType?: string,
  fileName?: string,
): string | null {
  const aliased = contentType
    ? (IMAGE_CONTENT_TYPE_ALIASES[contentType] ?? contentType)
    : ""
  if (aliased && HERO_CONTENT_TYPES[aliased]) return aliased
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (ext && HERO_EXTENSION_TYPES[ext]) return HERO_EXTENSION_TYPES[ext]
  }
  return null
}

export function validateHeroUpload(input: Partial<LogoUploadInput>): string | null {
  if (!input.base64 || typeof input.size !== "number" || input.size <= 0) {
    return "Please choose an image file."
  }
  if (!resolveHeroContentType(input.contentType, input.fileName)) {
    return "Please upload a PNG, JPG, or WEBP image."
  }
  if (input.size > MAX_HERO_BYTES) {
    return "Hero image must be smaller than 4MB."
  }
  return null
}

export function heroStoragePath(contentType: string, fileName?: string): string {
  const resolved = resolveHeroContentType(contentType, fileName)
  return `hero.${HERO_CONTENT_TYPES[resolved ?? contentType]}`
}

/**
 * Copy into a standalone `Uint8Array` so storage-js cannot read past the
 * Buffer's byteLength into Node's shared allocation pool.
 */
export function logoBytesFromBase64(base64: string): Uint8Array {
  return Uint8Array.from(Buffer.from(base64, "base64"))
}

export function isMissingBucketError(error: {
  message?: string
  error?: string
} | null): boolean {
  if (!error) return false
  const text = `${error.message ?? ""} ${error.error ?? ""}`.toLowerCase()
  return text.includes("bucket not found")
}

/**
 * The `branding` bucket holds both logo marks and hero photos, so its
 * bucket-level limits must cover the larger asset (hero) and the union of
 * accepted MIME types.
 */
export function brandingBucketOptions() {
  return {
    public: true,
    fileSizeLimit: Math.max(MAX_LOGO_BYTES, MAX_HERO_BYTES),
    allowedMimeTypes: Array.from(
      new Set([...Object.keys(LOGO_CONTENT_TYPES), ...Object.keys(HERO_CONTENT_TYPES)]),
    ),
  }
}
