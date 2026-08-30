import { describe, expect, it, vi } from "vitest"
import { sendBookingConfirmation } from "@/lib/marketing/booking-confirmation"

type ConfirmationMailer = { send: (payload?: unknown) => unknown }

const sendConfirmation = sendBookingConfirmation as (
  input: {
    email: string
    confCode: string
    guestName: string
    date: string
    time: string
    partySize: number
  },
  mailer?: ConfirmationMailer,
) => Promise<void>

describe("sendBookingConfirmation", () => {
  it("confirmation html includes escaped name date time party and conf_code", async () => {
    const email = "guest@test.local"
    const confCode = "TVL-1234"
    const guestName = "Ann & Bob <VIP>"
    const date = "2026-08-25"
    const time = "18:30"
    const partySize = 4

    const mailer = { send: vi.fn() }

    await sendConfirmation(
      {
        email,
        confCode,
        guestName,
        date,
        time,
        partySize,
      },
      mailer,
    )

    expect(mailer.send).toHaveBeenCalledTimes(1)
    const payload = mailer.send.mock.calls[0]?.[0] as
      { to?: string; html?: string } | undefined
    expect(payload?.to).toBe(email)

    const html = String(payload?.html ?? "")
    expect(html).toContain("&amp;")
    expect(html).toContain("&lt;")
    expect(html).not.toContain(guestName)
    expect(html).toContain(date)
    expect(html).toContain(time)
    expect(html).toContain(String(partySize))
    expect(html).toContain(confCode)
  })
})
