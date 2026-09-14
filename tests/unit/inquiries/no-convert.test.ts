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

describe("inquiries no conversion", () => {
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

  it("inquiries actions have no convert or confirm export and closing does not touch reservations", async () => {
    const actions = await import("@/app/actions/inquiries")
    const convertOrConfirm = Object.keys(actions).filter((name) =>
      /convert|confirm/i.test(name),
    )
    expect(convertOrConfirm).toEqual([])

    const { updateInquiryStatus } = actions as {
      updateInquiryStatus: UpdateInquiryStatus
    }
    const result = await updateInquiryStatus(INQUIRY_ID, "closed")
    expect(result.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("event_inquiries")
    expect(mocks.from).not.toHaveBeenCalledWith("reservations")
  })
})
