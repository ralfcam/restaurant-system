import { describe, expect, it } from "vitest"
import {
  BRANDING_REVALIDATE_PATHS,
  LOGO_UPLOAD_BODY_SIZE_LIMIT,
  MAX_LOGO_BYTES,
  isMissingBucketError,
  logoBytesFromBase64,
  logoStoragePath,
  resolveLogoContentType,
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

  it("accepts JPEG aliases and an empty type when the file name has an image extension", () => {
    expect(validateLogoUpload({ ...valid, contentType: "image/jpg" })).toBeNull()
    expect(
      validateLogoUpload({ ...valid, contentType: "", fileName: "brand-mark.webp" }),
    ).toBeNull()
  })
})

describe("resolveLogoContentType", () => {
  it("maps aliases and file extensions to canonical image types", () => {
    expect(resolveLogoContentType("image/jpg")).toBe("image/jpeg")
    expect(resolveLogoContentType("image/x-png")).toBe("image/png")
    expect(resolveLogoContentType("", "logo.svg")).toBe("image/svg+xml")
    expect(resolveLogoContentType("image/gif", "logo.gif")).toBeNull()
  })
})

describe("logoBytesFromBase64", () => {
  it("decodes to a standalone Uint8Array of the payload length", () => {
    const bytes = logoBytesFromBase64("aaaa")
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.byteLength).toBe(Buffer.from("aaaa", "base64").byteLength)
    expect(bytes.buffer.byteLength).toBe(bytes.byteLength)
  })
})

describe("isMissingBucketError", () => {
  it("detects the storage bucket-not-found message", () => {
    expect(isMissingBucketError({ message: "Bucket not found" })).toBe(true)
    expect(isMissingBucketError({ error: "Bucket not found" })).toBe(true)
    expect(isMissingBucketError({ message: "new row violates row-level security" })).toBe(false)
  })
})

describe("logo upload body size", () => {
  it("documents a 4mb Server Action limit for a 2MB base64 payload", () => {
    expect(LOGO_UPLOAD_BODY_SIZE_LIMIT).toBe("4mb")
  })
})

describe("logoStoragePath", () => {
  it("maps each allowed type to a stable logo.* object key", () => {
    expect(logoStoragePath("image/png")).toBe("logo.png")
    expect(logoStoragePath("image/jpg")).toBe("logo.jpg")
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
