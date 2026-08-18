export const BRANDING_BUCKET = "branding"
export const MAX_LOGO_BYTES = 2 * 1024 * 1024
export const LOGO_CONTENT_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
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
}

export function validateLogoUpload(input: Partial<LogoUploadInput>): string | null {
  if (!input.base64 || typeof input.size !== "number" || input.size <= 0) {
    return "Please choose an image file."
  }
  if (!input.contentType || !LOGO_CONTENT_TYPES[input.contentType]) {
    return "Please upload a PNG, JPG, SVG, or WEBP image."
  }
  if (input.size > MAX_LOGO_BYTES) {
    return "Logo image must be smaller than 2MB."
  }
  return null
}

export function logoStoragePath(contentType: string): string {
  return `logo.${LOGO_CONTENT_TYPES[contentType]}`
}
