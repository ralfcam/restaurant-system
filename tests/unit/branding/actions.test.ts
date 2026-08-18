import { beforeEach, describe, expect, it, vi } from "vitest"

const requireStaffUser = vi.fn()
const revalidatePath = vi.fn()
const upload = vi.fn()
const getPublicUrl = vi.fn()
const remove = vi.fn()
const upsert = vi.fn()
const maybeSingle = vi.fn()

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: (...args: unknown[]) => requireStaffUser(...args),
}))

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
      upsert,
    }),
    storage: {
      from: () => ({ upload, getPublicUrl, remove }),
    },
  }),
}))

const { uploadRestaurantLogo, removeRestaurantLogo, getRestaurantLogoUrl } =
  await import("@/app/actions/branding")

const staff = { id: "staff-1" }
const pngUpload = {
  base64: "aaaa",
  contentType: "image/png",
  size: 128,
}

describe("uploadRestaurantLogo", () => {
  beforeEach(() => {
    requireStaffUser.mockReset()
    revalidatePath.mockReset()
    upload.mockReset()
    getPublicUrl.mockReset()
    remove.mockReset()
    upsert.mockReset()
    requireStaffUser.mockResolvedValue(staff)
    upload.mockResolvedValue({ error: null })
    remove.mockResolvedValue({ error: null })
    upsert.mockResolvedValue({ error: null })
    getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example/logo.png" } })
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)
  })

  it("rejects unauthenticated callers", async () => {
    requireStaffUser.mockResolvedValue(null)
    await expect(uploadRestaurantLogo(pngUpload)).rejects.toThrow("Unauthorized")
    expect(upload).not.toHaveBeenCalled()
  })

  it("returns a validation error without touching storage", async () => {
    const result = await uploadRestaurantLogo({
      ...pngUpload,
      contentType: "image/gif",
    })
    expect(result.error).toMatch(/PNG, JPG, SVG, or WEBP/)
    expect(upload).not.toHaveBeenCalled()
  })

  it("stores the object, writes logo_url, and revalidates guest + staff surfaces", async () => {
    const result = await uploadRestaurantLogo(pngUpload)
    expect(result.error).toBeUndefined()
    expect(result.logoUrl).toBe("https://cdn.example/logo.png?v=1700000000000")
    expect(upload).toHaveBeenCalledWith(
      "logo.png",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    )
    expect(remove).toHaveBeenCalledWith(["logo.jpg", "logo.svg", "logo.webp"])
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        logo_url: "https://cdn.example/logo.png?v=1700000000000",
      }),
    )
    const paths = revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/menu", "/auth/login"]))
  })
})

describe("removeRestaurantLogo", () => {
  beforeEach(() => {
    requireStaffUser.mockReset()
    revalidatePath.mockReset()
    remove.mockReset()
    upsert.mockReset()
    requireStaffUser.mockResolvedValue(staff)
    remove.mockResolvedValue({ error: null })
    upsert.mockResolvedValue({ error: null })
  })

  it("rejects unauthenticated callers", async () => {
    requireStaffUser.mockResolvedValue(null)
    await expect(removeRestaurantLogo()).rejects.toThrow("Unauthorized")
    expect(remove).not.toHaveBeenCalled()
  })

  it("deletes stored logo objects, nulls logo_url, and revalidates", async () => {
    const result = await removeRestaurantLogo()
    expect(result).toEqual({})
    expect(remove).toHaveBeenCalledWith(["logo.png", "logo.jpg", "logo.svg", "logo.webp"])
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, logo_url: null }),
    )
    const paths = revalidatePath.mock.calls.map((call) => call[0])
    expect(paths).toEqual(expect.arrayContaining(["/admin", "/", "/auth/login"]))
  })
})

describe("getRestaurantLogoUrl", () => {
  beforeEach(() => {
    maybeSingle.mockReset()
  })

  it("does not require a staff session", async () => {
    maybeSingle.mockResolvedValue({ data: { logo_url: "https://cdn.example/logo.png" }, error: null })
    await expect(getRestaurantLogoUrl()).resolves.toBe("https://cdn.example/logo.png")
    expect(requireStaffUser).not.toHaveBeenCalled()
  })

  it("returns null when no custom logo is stored", async () => {
    maybeSingle.mockResolvedValue({ data: { logo_url: null }, error: null })
    await expect(getRestaurantLogoUrl()).resolves.toBeNull()
  })
})
