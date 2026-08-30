import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "10:00"),
  from: vi.fn(),
  insert: vi.fn(),
  isDateBlocked: vi.fn(),
  getOperatingWindowForDate: vi.fn(),
  sendBookingConfirmation: vi.fn(),
}))

vi.mock("@/app/actions/availability", () => ({
  isDateBlocked: mocks.isDateBlocked,
  getOperatingWindowForDate: mocks.getOperatingWindowForDate,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: mocks.today,
  getNowTimeInRestaurantTZ: mocks.nowTime,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({ from: mocks.from }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff-1" } } }) },
  }),
}))

vi.mock("@/lib/marketing/booking-confirmation", () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation,
}))

const dinnerWindow = {
  day_of_week: 2,
  is_closed: false,
  segments: [
    { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 0 },
  ],
}

describe("createReservation", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.isDateBlocked.mockReset()
    mocks.getOperatingWindowForDate.mockReset()
    mocks.today.mockReturnValue("2026-08-18")
    mocks.nowTime.mockReturnValue("10:00")
    mocks.isDateBlocked.mockResolvedValue(false)
    mocks.getOperatingWindowForDate.mockResolvedValue(dinnerWindow)
    mocks.insert.mockResolvedValue({ error: null })
    mocks.from.mockImplementation(() => ({ insert: mocks.insert }))
    mocks.sendBookingConfirmation.mockReset()
    mocks.sendBookingConfirmation.mockResolvedValue(undefined)
  })

  it("successful insert includes trimmed guest email", async () => {
    const { createReservation } = await import("@/app/actions/reservations")

    const result = await createReservation({
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "   ",
      notes: "Window seat please",
      email: "  guest@test.local  ",
    } as Parameters<typeof createReservation>[0])

    expect(result.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalled()
    const row = mocks.insert.mock.calls[0]?.[0] as {
      email?: string
      phone?: string
    }
    expect(row.email).toBe("guest@test.local")
    expect(row.phone).toBe("")
  })

  it("calls confirmation send after a successful insert with the guest email and conf_code", async () => {
    const { createReservation } = await import("@/app/actions/reservations")

    const result = await createReservation({
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      notes: "Window seat please",
      email: "  guest@test.local  ",
    })

    expect(result.error).toBeUndefined()
    expect(result.confCode).toMatch(/^TVL-\d{4}$/)
    expect(mocks.insert).toHaveBeenCalled()
    expect(mocks.sendBookingConfirmation).toHaveBeenCalledTimes(1)
    expect(
      mocks.sendBookingConfirmation.mock.invocationCallOrder[0],
    ).toBeGreaterThan(mocks.insert.mock.invocationCallOrder[0]!)
    expect(mocks.sendBookingConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "guest@test.local",
        confCode: result.confCode,
        guestName: "Amelia Brooks",
        date: "2026-08-25",
        time: "18:30",
        partySize: 2,
      }),
    )
  })

  it("mailer throw still returns confCode", async () => {
    mocks.sendBookingConfirmation.mockRejectedValue(
      new Error("Mail provider is not configured."),
    )
    const { createReservation } = await import("@/app/actions/reservations")

    const result = await createReservation({
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      notes: "Window seat please",
      email: "guest@test.local",
    })

    expect(result.error).toBeUndefined()
    expect(result.confCode).toMatch(/^TVL-\d{4}$/)
  })

  it("does not send on validation error", async () => {
    const { createReservation } = await import("@/app/actions/reservations")

    const result = await createReservation({
      guestName: "Amelia Brooks",
      partySize: 2,
      date: "2026-08-25",
      time: "18:30",
      phone: "",
      notes: "Window seat please",
      email: "not-an-email",
    })

    expect(result.error).toBe("Please provide a valid email.")
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled()
  })
})
