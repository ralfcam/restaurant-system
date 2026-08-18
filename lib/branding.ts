export const BRANDING_BUCKET = "branding"
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
/**
 * Server Actions default to a 1MB body. A 2MB logo encoded as base64 is
 * ~2.7MB plus RSC framing, so the action limit must be raised to match
 * `MAX_LOGO_BYTES`. Keep this in sync with `next.config.mjs`.
 */
export const LOGO_UPLOAD_BODY_SIZE_LIMIT = "4mb"
export const LOGO_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
}

const LOGO_CONTENT_TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
}

const LOGO_EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  webp: "image/webp",
}

export const LOGO_STORAGE_PATHS = Object.values(LOGO_CONTENT_TYPES).map(
  (ext) => `logo.${ext}`,
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

export function brandingBucketOptions() {
  return {
    public: true,
    fileSizeLimit: MAX_LOGO_BYTES,
    allowedMimeTypes: Object.keys(LOGO_CONTENT_TYPES),
  }
}
