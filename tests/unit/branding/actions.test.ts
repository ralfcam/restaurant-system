import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getRestaurantLogoUrl,
  removeRestaurantLogo,
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
    mocks.requireStaffUser.mockResolvedValue(staff)
    mocks.upload.mockResolvedValue({ error: null })
    mocks.remove.mockResolvedValue({ error: null })
    mocks.upsert.mockResolvedValue({ error: null })
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
    expect(mocks.upload).toHaveBeenCalledWith(
      "logo.png",
      expect.any(Buffer),
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
