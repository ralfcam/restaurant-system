import { describe, expect, it } from "vitest"
import {
  RESERVATION_ONLINE_MAX_PARTY,
  validateReservationPayload,
} from "@/lib/reservations/validation"

const TODAY = "2026-08-10"

type ReservationPayloadArg = Parameters<typeof validateReservationPayload>[0]

function basePayload(
  overrides: Partial<ReservationPayloadArg> & { email?: string } = {},
): ReservationPayloadArg {
  return {
    guestName: "Amelia Brooks",
    partySize: 2,
    date: "2026-08-15",
    time: "18:30",
    phone: "+1 (503) 555-0111",
    notes: "Window seat please",
    email: "guest@test.local",
    ...overrides,
  } as ReservationPayloadArg
}

describe("validateReservationPayload", () => {
  it("accepts a fully valid payload", () => {
    expect(validateReservationPayload(basePayload(), TODAY)).toBeNull()
  })

  it("accepts a payload with no notes", () => {
    expect(
      validateReservationPayload(basePayload({ notes: undefined }), TODAY),
    ).toBeNull()
  })

  describe("guest name", () => {
    it("rejects an empty name", () => {
      expect(
        validateReservationPayload(basePayload({ guestName: "" }), TODAY),
      ).toMatch(/name/i)
    })

    it("rejects a whitespace-only name", () => {
      expect(
        validateReservationPayload(basePayload({ guestName: "   " }), TODAY),
      ).toMatch(/name/i)
    })

    it("rejects a name over 100 characters", () => {
      expect(
        validateReservationPayload(
          basePayload({ guestName: "a".repeat(101) }),
          TODAY,
        ),
      ).toMatch(/too long/i)
    })

    it("accepts a name at exactly 100 characters", () => {
      expect(
        validateReservationPayload(
          basePayload({ guestName: "a".repeat(100) }),
          TODAY,
        ),
      ).toBeNull()
    })
  })

  describe("party size", () => {
    it("rejects zero", () => {
      expect(
        validateReservationPayload(basePayload({ partySize: 0 }), TODAY),
      ).toMatch(/whole number/i)
    })

    it("rejects a negative party size", () => {
      expect(
        validateReservationPayload(basePayload({ partySize: -3 }), TODAY),
      ).toMatch(/whole number/i)
    })

    it("rejects a fractional party size", () => {
      expect(
        validateReservationPayload(basePayload({ partySize: 2.5 }), TODAY),
      ).toMatch(/whole number/i)
    })

    it("rejects NaN", () => {
      expect(
        validateReservationPayload(
          basePayload({ partySize: Number.NaN }),
          TODAY,
        ),
      ).toMatch(/whole number/i)
    })

    it("rejects a party size above the online max", () => {
      const result = validateReservationPayload(
        basePayload({ partySize: RESERVATION_ONLINE_MAX_PARTY + 1 }),
        TODAY,
      )
      expect(result).toMatch(/maximum/i)
    })

    it("accepts the party size exactly at the online max", () => {
      expect(
        validateReservationPayload(
          basePayload({ partySize: RESERVATION_ONLINE_MAX_PARTY }),
          TODAY,
        ),
      ).toBeNull()
    })
  })

  describe("date", () => {
    it("rejects a malformed date string", () => {
      expect(
        validateReservationPayload(basePayload({ date: "15/08/2026" }), TODAY),
      ).toMatch(/valid date/i)
    })

    it("rejects a non-date string", () => {
      expect(
        validateReservationPayload(basePayload({ date: "not-a-date" }), TODAY),
      ).toMatch(/valid date/i)
    })

    it("rejects a calendar-invalid date", () => {
      // November has 30 days — the 31st should be rejected, not silently
      // rolled over to December 1st.
      expect(
        validateReservationPayload(basePayload({ date: "2026-11-31" }), TODAY),
      ).toMatch(/valid date/i)
    })

    it("rejects a date before today", () => {
      expect(
        validateReservationPayload(basePayload({ date: "2026-08-09" }), TODAY),
      ).toMatch(/past/i)
    })

    it("accepts today's date", () => {
      expect(
        validateReservationPayload(basePayload({ date: TODAY }), TODAY),
      ).toBeNull()
    })
  })

  describe("time", () => {
    it("rejects a malformed time string", () => {
      expect(
        validateReservationPayload(basePayload({ time: "6:30 PM" }), TODAY),
      ).toMatch(/valid time/i)
    })

    it("rejects an out-of-range hour", () => {
      expect(
        validateReservationPayload(basePayload({ time: "25:00" }), TODAY),
      ).toMatch(/valid time/i)
    })

    it("rejects an out-of-range minute", () => {
      expect(
        validateReservationPayload(basePayload({ time: "18:65" }), TODAY),
      ).toMatch(/valid time/i)
    })

    it("accepts a valid boundary time", () => {
      expect(
        validateReservationPayload(basePayload({ time: "23:59" }), TODAY),
      ).toBeNull()
    })
  })

  describe("phone", () => {
    it("accepts an empty phone number", () => {
      expect(
        validateReservationPayload(basePayload({ phone: "" }), TODAY),
      ).toBeNull()
    })

    it("rejects a phone number that is too short", () => {
      expect(
        validateReservationPayload(basePayload({ phone: "123" }), TODAY),
      ).toMatch(/phone/i)
    })

    it("rejects a phone number with letters", () => {
      expect(
        validateReservationPayload(
          basePayload({ phone: "call-me-maybe" }),
          TODAY,
        ),
      ).toMatch(/phone/i)
    })

    it("accepts a phone number with punctuation", () => {
      expect(
        validateReservationPayload(
          basePayload({ phone: "(503) 555-0111" }),
          TODAY,
        ),
      ).toBeNull()
    })

    it("still rejects a non-blank invalid phone", () => {
      expect(
        validateReservationPayload(
          basePayload({ phone: "not-a-phone" }),
          TODAY,
        ),
      ).toMatch(/phone/i)
    })
  })

  describe("email", () => {
    it("rejects a missing email", () => {
      expect(
        validateReservationPayload(basePayload({ email: undefined }), TODAY),
      ).toEqual(expect.stringMatching(/email/i))
    })

    it("rejects an invalid email", () => {
      expect(
        validateReservationPayload(
          basePayload({ email: "not-an-email" }),
          TODAY,
        ),
      ).toEqual(expect.stringMatching(/email/i))
    })

    it("accepts a valid email with a blank phone", () => {
      expect(
        validateReservationPayload(basePayload({ phone: "   " }), TODAY),
      ).toBeNull()
    })
  })

  describe("notes", () => {
    it("rejects notes over 500 characters", () => {
      expect(
        validateReservationPayload(
          basePayload({ notes: "a".repeat(501) }),
          TODAY,
        ),
      ).toMatch(/too long/i)
    })

    it("accepts notes at exactly 500 characters", () => {
      expect(
        validateReservationPayload(
          basePayload({ notes: "a".repeat(500) }),
          TODAY,
        ),
      ).toBeNull()
    })
  })
})
