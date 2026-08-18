import { describe, expect, it } from "vitest"
import {
  BRANDING_REVALIDATE_PATHS,
  MAX_LOGO_BYTES,
  logoStoragePath,
  validateLogoUpload,
} from "@/lib/branding"

const valid = {
  base64: "aaaa",
  contentType: "image/png",
  size: 128,
}

describe("validateLogoUpload", () => {
  it("accepts a PNG under the size limit", () => {
    expect(validateLogoUpload(valid)).toBeNull()
  })

  it("rejects a missing file", () => {
    expect(validateLogoUpload({ ...valid, base64: "" })).toBe("Please choose an image file.")
    expect(validateLogoUpload({ ...valid, size: 0 })).toBe("Please choose an image file.")
  })

  it("rejects an unsupported content type", () => {
    expect(validateLogoUpload({ ...valid, contentType: "image/gif" })).toBe(
      "Please upload a PNG, JPG, SVG, or WEBP image.",
    )
  })

  it("rejects a file larger than 2MB", () => {
    expect(validateLogoUpload({ ...valid, size: MAX_LOGO_BYTES + 1 })).toBe(
      "Logo image must be smaller than 2MB.",
    )
  })

  it("accepts a file at exactly 2MB", () => {
    expect(validateLogoUpload({ ...valid, size: MAX_LOGO_BYTES })).toBeNull()
  })
})

describe("logoStoragePath", () => {
  it("maps each allowed type to a stable logo.* object key", () => {
    expect(logoStoragePath("image/png")).toBe("logo.png")
    expect(logoStoragePath("image/jpeg")).toBe("logo.jpg")
    expect(logoStoragePath("image/svg+xml")).toBe("logo.svg")
    expect(logoStoragePath("image/webp")).toBe("logo.webp")
  })
})

describe("branding revalidate paths", () => {
  it("covers guest, staff, and login surfaces", () => {
    const paths = BRANDING_REVALIDATE_PATHS.map((entry) => entry.path)
    expect(paths).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/settings",
        "/pos",
        "/kds",
        "/",
        "/menu",
        "/en",
        "/en/menu",
        "/auth/login",
      ]),
    )
  })
})
