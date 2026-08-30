import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mocks.from,
  }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({}),
}))

const settings = {
  enabled: true,
  copy: "Thank you for dining with us.",
  mapsUrl: "https://maps.google.com/?q=Restaurant+Link",
  delayHours: 24,
}

describe("saveReviewEmailSettings", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.from.mockReset()
    mocks.upsert.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.upsert.mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({ upsert: mocks.upsert })
  })

  it("staff persist toggle copy maps URL and delay; unauthenticated writes return Unauthorized", async () => {
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")

    const staffResult = await saveReviewEmailSettings(settings)
    expect(staffResult.error).toBeUndefined()
    expect(mocks.from).toHaveBeenCalledWith("restaurant_settings")
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        review_email_enabled: settings.enabled,
        review_email_copy: settings.copy,
        review_email_maps_url: settings.mapsUrl,
        review_email_delay_hours: settings.delayHours,
      }),
    )

    mocks.from.mockClear()
    mocks.upsert.mockClear()
    mocks.requireStaffUser.mockResolvedValue(null)

    const unauthResult = await saveReviewEmailSettings(settings)
    expect(unauthResult).toEqual({ error: "Unauthorized." })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it("enable requires non-blank copy and valid https Maps URL", async () => {
    const { saveReviewEmailSettings } = await import("@/app/actions/marketing")
    const pv10Error =
      "Review email cannot be enabled without thank-you copy and a valid https Maps URL."

    const blankCopy = await saveReviewEmailSettings({
      ...settings,
      enabled: true,
      copy: "",
    })
    expect(blankCopy).toEqual({ error: pv10Error })
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ review_email_enabled: true }),
    )

    mocks.upsert.mockClear()

    const httpMaps = await saveReviewEmailSettings({
      ...settings,
      enabled: true,
      mapsUrl: "http://maps.google.com/?q=Restaurant+Link",
    })
    expect(httpMaps).toEqual({ error: pv10Error })
    expect(mocks.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ review_email_enabled: true }),
    )

    mocks.upsert.mockClear()

    const incompleteDraft = await saveReviewEmailSettings({
      ...settings,
      enabled: false,
      copy: "",
      mapsUrl: "http://maps.google.com/?q=Restaurant+Link",
    })
    expect(incompleteDraft.error).toBeUndefined()
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        review_email_enabled: false,
        review_email_copy: "",
        review_email_maps_url: "http://maps.google.com/?q=Restaurant+Link",
      }),
    )
  })
})
