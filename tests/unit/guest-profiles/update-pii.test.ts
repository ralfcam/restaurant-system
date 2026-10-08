import { beforeEach, describe, expect, it, vi } from "vitest"
import { normalizeGuestEmail } from "@/lib/guest-profiles"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
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
}) => Promise<{ ok?: true; error?: string } | undefined>

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
    mocks.select.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.select.mockResolvedValue({ data: [{ id: "row-1" }], error: null })
    mocks.eq.mockImplementation(() => ({ select: mocks.select }))
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

  it("updateGuestProfilePii returns ok when rows update and notFound when none match", async () => {
    const { updateGuestProfilePii } =
      (await import("@/app/actions/guest-profiles")) as {
        updateGuestProfilePii: UpdateGuestProfilePii
      }

    mocks.select.mockResolvedValue({ data: [{ id: "row-1" }], error: null })
    const updated = await updateGuestProfilePii(piiDraft)
    expect(updated).toEqual({ ok: true })

    mocks.select.mockResolvedValue({ data: [], error: null })
    const missing = await updateGuestProfilePii(piiDraft)
    expect(missing).toEqual({ error: "errors.guestProfiles.notFound" })

    expect(updatePayload()).not.toHaveProperty("email")
    expectCatalogKey("errors.guestProfiles.notFound")
  })

  it("updateGuestProfilePii rejects a blank or oversized guest_name and does not update", async () => {
    const { updateGuestProfilePii } =
      (await import("@/app/actions/guest-profiles")) as {
        updateGuestProfilePii: UpdateGuestProfilePii
      }

    await expect(mocks.requireStaffUser()).resolves.toEqual({ id: "staff-1" })
    mocks.requireStaffUser.mockClear()

    const blank = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "   ",
      phone: "555-0100",
    })
    expect(blank).toEqual({ error: "errors.guestProfiles.nameRequired" })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.from.mockClear()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.createServiceClient.mockClear()

    const tooLong = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "a".repeat(101),
      phone: "555-0100",
    })
    expect(tooLong).toEqual({ error: "errors.guestProfiles.nameTooLong" })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    expectCatalogKey("errors.guestProfiles.nameRequired")
    expectCatalogKey("errors.guestProfiles.nameTooLong")

    mocks.from.mockClear()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.createServiceClient.mockClear()

    const boundedName = "a".repeat(100)
    const accepted = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: boundedName,
      phone: "555-0100",
    })
    expect(accepted?.error).toBeUndefined()
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith({
      guest_name: boundedName,
      phone: "555-0100",
    })
  })

  it("updateGuestProfilePii rejects an invalid phone and allows a blank phone", async () => {
    const { updateGuestProfilePii } =
      (await import("@/app/actions/guest-profiles")) as {
        updateGuestProfilePii: UpdateGuestProfilePii
      }

    const invalid = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "Ada Lovelace",
      phone: "abc",
    })
    expect(invalid).toEqual({ error: "errors.guestProfiles.phoneInvalid" })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.from.mockClear()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.createServiceClient.mockClear()

    const blankPhone = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "Ada Lovelace",
      phone: "",
    })
    expect(blankPhone).toEqual({ ok: true })
    expect(mocks.update).toHaveBeenCalledTimes(1)

    expectCatalogKey("errors.guestProfiles.phoneInvalid")
  })

  it("updateGuestProfilePii stores trimmed guest_name and phone", async () => {
    const { updateGuestProfilePii } =
      (await import("@/app/actions/guest-profiles")) as {
        updateGuestProfilePii: UpdateGuestProfilePii
      }

    const padded = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "  Ada Lovelace  ",
      phone: "  555-0100  ",
    })
    expect(padded?.error).toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith({
      guest_name: "Ada Lovelace",
      phone: "555-0100",
    })
    expect(updatePayload()).not.toHaveProperty("email")
    expect(mocks.eq).toHaveBeenCalledWith(
      "email_normalized",
      normalizeGuestEmail(piiDraft.email),
    )

    mocks.from.mockClear()
    mocks.update.mockClear()
    mocks.eq.mockClear()
    mocks.createServiceClient.mockClear()

    const blankPhone = await updateGuestProfilePii({
      email: piiDraft.email,
      guest_name: "Ada Lovelace",
      phone: "   ",
    })
    expect(blankPhone?.error).toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith({
      guest_name: "Ada Lovelace",
      phone: "",
    })
  })
})
