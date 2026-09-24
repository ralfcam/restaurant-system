import { beforeEach, describe, expect, it, vi } from "vitest"
import { normalizeGuestEmail } from "@/lib/guest-profiles"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

type UpdateGuestProfilePii = (input: {
  email: string
  guest_name: string
  phone: string
}) => Promise<{ error?: string } | undefined>

const piiDraft = {
  email: "  Ada@Ex.com ",
  guest_name: "Ada Lovelace",
  phone: "555-0100",
}

function updatePayload() {
  return (mocks.update.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>
}

describe("updateGuestProfilePii", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.update.mockReset()
    mocks.eq.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.eq.mockResolvedValue({ error: null })
    mocks.update.mockImplementation(() => ({ eq: mocks.eq }))
    mocks.from.mockImplementation(() => ({ update: mocks.update }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("updateGuestProfilePii writes name and phone on the email group and never email", async () => {
    const { updateGuestProfilePii } =
      (await import("@/app/actions/guest-profiles")) as {
        updateGuestProfilePii: UpdateGuestProfilePii
      }

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await updateGuestProfilePii(piiDraft)
    expect(unauthorized).toMatchObject({
      error: "errors.guestProfiles.unauthorized",
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.from.mockClear()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.createServiceClient.mockClear()

    const result = await updateGuestProfilePii(piiDraft)
    expect(result?.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("reservations")
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith({
      guest_name: piiDraft.guest_name,
      phone: piiDraft.phone,
    })
    expect(updatePayload()).not.toHaveProperty("email")
    expect(mocks.eq).toHaveBeenCalledWith(
      "email_normalized",
      normalizeGuestEmail(piiDraft.email),
    )
  })
})
