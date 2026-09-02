import { beforeEach, describe, expect, it, vi } from "vitest"
import { updateRestaurantContactInfo } from "@/app/actions/restaurant-info"

const mocks = vi.hoisted(() => ({
  requireSuperAdminUser: vi.fn(),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireSuperAdminUser: mocks.requireSuperAdminUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      upsert: mocks.upsert,
    }),
  }),
}))

const superAdmin = { id: "super-admin-1" }
const contact = { address: "10 Kitchen Lane", phone: "+1 555 0199" }

describe("updateRestaurantContactInfo", () => {
  beforeEach(() => {
    mocks.requireSuperAdminUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.upsert.mockReset()
    mocks.requireSuperAdminUser.mockResolvedValue(superAdmin)
    mocks.upsert.mockResolvedValue({ error: null })
  })

  it("updateRestaurantContactInfo requires super_admin", async () => {
    mocks.requireSuperAdminUser.mockResolvedValue(null)
    await expect(updateRestaurantContactInfo(contact)).rejects.toThrow(
      "Unauthorized",
    )
    expect(mocks.upsert).not.toHaveBeenCalled()

    mocks.requireSuperAdminUser.mockResolvedValue(superAdmin)
    const result = await updateRestaurantContactInfo(contact)
    expect(result).toEqual({})
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        address: contact.address,
        phone: contact.phone,
      }),
    )
  })
})
