import { beforeEach, describe, expect, it, vi } from "vitest"

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

type InquiryResult = { error?: string }

type UpdateInquiryStatus = (
  id: string,
  status: string,
) => Promise<InquiryResult>

const INQUIRY_ID = "11111111-1111-4111-8111-111111111111"

const STATUSES = ["open", "contacted", "declined", "closed"] as const

const FORBIDDEN_UPDATE_KEYS = [
  "guest_name",
  "email",
  "phone",
  "requested_date",
  "party_size",
  "kind",
  "notes",
] as const

function updatePayload() {
  return (mocks.update.mock.calls[0]?.[0] ?? {}) as Record<string, unknown>
}

function resetWriteSpies() {
  mocks.from.mockClear()
  mocks.update.mockClear()
  mocks.eq.mockClear()
  mocks.createServiceClient.mockClear()
}

describe("updateInquiryStatus", () => {
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

  it("staff may set any of four statuses and cannot edit other fields", async () => {
    const { updateInquiryStatus } =
      (await import("@/app/actions/inquiries")) as {
        updateInquiryStatus: UpdateInquiryStatus
      }

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await updateInquiryStatus(INQUIRY_ID, "contacted")
    expect(unauthorized).toMatchObject({
      error: "errors.inquiries.unauthorized",
    })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })

    resetWriteSpies()
    const invalid = await updateInquiryStatus(INQUIRY_ID, "confirmed")
    expect(invalid).toEqual({ error: "errors.inquiries.invalidStatus" })
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalled()

    for (const status of STATUSES) {
      resetWriteSpies()
      const result = await updateInquiryStatus(INQUIRY_ID, status)
      expect(result.error).toBeUndefined()
      expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
      expect(mocks.from).not.toHaveBeenCalledWith("reservations")
      expect(mocks.update).toHaveBeenCalledTimes(1)
      expect(mocks.update).toHaveBeenCalledWith({ status })
      const payload = updatePayload()
      for (const key of FORBIDDEN_UPDATE_KEYS) {
        expect(payload).not.toHaveProperty(key)
      }
      expect(mocks.eq).toHaveBeenCalledWith("id", INQUIRY_ID)
    }
  })
})
