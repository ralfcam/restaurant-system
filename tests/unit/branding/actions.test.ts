import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getRestaurantHeroImageUrl,
  getRestaurantLogoUrl,
  removeRestaurantHeroImage,
  removeRestaurantLogo,
  uploadRestaurantHeroImage,
  uploadRestaurantLogo,
} from "@/app/actions/branding"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  revalidatePath: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
  upsert: vi.fn(),
  maybeSingle: vi.fn(),
  createBucket: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mocks.maybeSingle }),
      }),
      upsert: mocks.upsert,
    }),
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl,
        remove: mocks.remove,
      }),
      createBucket: mocks.createBucket,
    },
  }),
}))

const staff = { id: "staff-1" }
const pngUpload = {
  base64: "aaaa",
  contentType: "image/png",
  size: 128,
}

describe("uploadRestaurantLogo", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upload.mockReset()
    mocks.getPublicUrl.mockReset()
    mocks.remove.mockReset()
    mocks.upsert.mockReset()
    mocks.createBucket.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staff)
    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createBucket.mockResolvedValue({ data: { name: "branding" }, error: null })
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example/logo.png" } })
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    await expect(uploadRestaurantLogo(pngUpload)).rejects.toThrow("Unauthorized")
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("returns a validation error without touching storage", async () => {
    const result = await uploadRestaurantLogo({
      ...pngUpload,
      contentType: "image/gif",
    })
    expect(result.error).toMatch(/PNG, JPG, SVG, or WEBP/)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("stores the object, writes logo_url, and revalidates guest + staff surfaces", async () => {
    const result = await uploadRestaurantLogo(pngUpload)
    expect(result.error).toBeUndefined()
    expect(result.logoUrl).toBe("https://cdn.example/logo.png?v=1700000000000")
    expect(mocks.createBucket).not.toHaveBeenCalled()
    expect(mocks.upload).toHaveBeenCalledWith(
      "logo.png",
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    )
    expect(mocks.remove).toHaveBeenCalledWith(["logo.jpg", "logo.svg", "logo.webp"])
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        logo_url: "https://cdn.example/logo.png?v=1700000000000",
      }),
    )
    const paths = mocks.revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/menu", "/auth/login"]))
  })

  it("creates the branding bucket when it is missing, then uploads", async () => {
    mocks.upload
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ error: null })
    const result = await uploadRestaurantLogo(pngUpload)
    expect(result.error).toBeUndefined()
    // The branding bucket also holds hero photos, so its size limit covers
    // the larger of the two asset types (hero: 4MB) rather than the logo's
    // own 2MB cap.
    expect(mocks.createBucket).toHaveBeenCalledWith(
      "branding",
      expect.objectContaining({ public: true, fileSizeLimit: 4 * 1024 * 1024 }),
    )
    expect(mocks.upload).toHaveBeenCalledTimes(2)
  })

  it("returns the upload error when the branding bucket cannot be created", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Bucket not found" } })
    mocks.createBucket.mockResolvedValue({ error: { message: "permission denied" } })
    const result = await uploadRestaurantLogo(pngUpload)
    expect(result.error).toBe("Could not upload the logo. Please try again.")
    expect(mocks.upload).toHaveBeenCalledTimes(1)
  })

  it("accepts image/jpg as JPEG and stores logo.jpg", async () => {
    const result = await uploadRestaurantLogo({
      ...pngUpload,
      contentType: "image/jpg",
      fileName: "mark.jpg",
    })
    expect(result.error).toBeUndefined()
    expect(mocks.upload).toHaveBeenCalledWith(
      "logo.jpg",
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/jpeg", upsert: true }),
    )
  })
})

describe("removeRestaurantLogo", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.remove.mockReset()
    mocks.upsert.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staff)
    mocks.remove.mockResolvedValue({ error: null })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    await expect(removeRestaurantLogo()).rejects.toThrow("Unauthorized")
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("deletes stored logo objects, nulls logo_url, and revalidates", async () => {
    const result = await removeRestaurantLogo()
    expect(result).toEqual({})
    expect(mocks.remove).toHaveBeenCalledWith(["logo.png", "logo.jpg", "logo.svg", "logo.webp"])
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, logo_url: null }),
    )
    const paths = mocks.revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/auth/login"]))
  })
})

describe("getRestaurantLogoUrl", () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.requireStaffUser.mockReset()
  })

  it("does not require a staff session", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { logo_url: "https://cdn.example/logo.png" }, error: null })
    await expect(getRestaurantLogoUrl()).resolves.toBe("https://cdn.example/logo.png")
    expect(mocks.requireStaffUser).not.toHaveBeenCalled()
  })

  it("returns null when no custom logo is stored", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { logo_url: null }, error: null })
    await expect(getRestaurantLogoUrl()).resolves.toBeNull()
  })
})

describe("uploadRestaurantHeroImage", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upload.mockReset()
    mocks.getPublicUrl.mockReset()
    mocks.remove.mockReset()
    mocks.upsert.mockReset()
    mocks.createBucket.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staff)
    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.createBucket.mockResolvedValue({ data: { name: "branding" }, error: null })
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example/hero.png" } })
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    await expect(uploadRestaurantHeroImage(pngUpload)).rejects.toThrow("Unauthorized")
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("returns a validation error without touching storage", async () => {
    const result = await uploadRestaurantHeroImage({
      ...pngUpload,
      contentType: "image/gif",
    })
    expect(result.error).toMatch(/PNG, JPG, or WEBP/)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("rejects SVG (logo-only format)", async () => {
    const result = await uploadRestaurantHeroImage({
      ...pngUpload,
      contentType: "image/svg+xml",
    })
    expect(result.error).toMatch(/PNG, JPG, or WEBP/)
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it("stores the object, writes hero_image_url, and revalidates guest + staff surfaces", async () => {
    const result = await uploadRestaurantHeroImage(pngUpload)
    expect(result.error).toBeUndefined()
    expect(result.heroImageUrl).toBe("https://cdn.example/hero.png?v=1700000000000")
    expect(mocks.createBucket).not.toHaveBeenCalled()
    expect(mocks.upload).toHaveBeenCalledWith(
      "hero.png",
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    )
    expect(mocks.remove).toHaveBeenCalledWith(["hero.jpg", "hero.webp"])
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        hero_image_url: "https://cdn.example/hero.png?v=1700000000000",
      }),
    )
    const paths = mocks.revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/menu", "/auth/login"]))
  })

  it("creates the branding bucket when it is missing, then uploads", async () => {
    mocks.upload
      .mockResolvedValueOnce({ error: { message: "Bucket not found" } })
      .mockResolvedValueOnce({ error: null })
    const result = await uploadRestaurantHeroImage(pngUpload)
    expect(result.error).toBeUndefined()
    expect(mocks.createBucket).toHaveBeenCalledWith(
      "branding",
      expect.objectContaining({ public: true, fileSizeLimit: 4 * 1024 * 1024 }),
    )
    expect(mocks.upload).toHaveBeenCalledTimes(2)
  })

  it("returns the upload error when the branding bucket cannot be created", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "Bucket not found" } })
    mocks.createBucket.mockResolvedValue({ error: { message: "permission denied" } })
    const result = await uploadRestaurantHeroImage(pngUpload)
    expect(result.error).toBe("Could not upload the hero image. Please try again.")
    expect(mocks.upload).toHaveBeenCalledTimes(1)
  })
})

describe("removeRestaurantHeroImage", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.remove.mockReset()
    mocks.upsert.mockReset()
    mocks.requireStaffUser.mockResolvedValue(staff)
    mocks.remove.mockResolvedValue({ error: null })
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    await expect(removeRestaurantHeroImage()).rejects.toThrow("Unauthorized")
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("deletes stored hero objects, nulls hero_image_url, and revalidates", async () => {
    const result = await removeRestaurantHeroImage()
    expect(result).toEqual({})
    expect(mocks.remove).toHaveBeenCalledWith(["hero.png", "hero.jpg", "hero.webp"])
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, hero_image_url: null }),
    )
    const paths = mocks.revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/auth/login"]))
  })
})

describe("getRestaurantHeroImageUrl", () => {
  beforeEach(() => {
    mocks.maybeSingle.mockReset()
    mocks.requireStaffUser.mockReset()
  })

  it("does not require a staff session", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { hero_image_url: "https://cdn.example/hero.png" },
      error: null,
    })
    await expect(getRestaurantHeroImageUrl()).resolves.toBe("https://cdn.example/hero.png")
    expect(mocks.requireStaffUser).not.toHaveBeenCalled()
  })

  it("returns null when no custom hero image is stored", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { hero_image_url: null }, error: null })
    await expect(getRestaurantHeroImageUrl()).resolves.toBeNull()
  })
})
