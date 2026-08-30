import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: mocks.from }),
}))

type Row = Record<string, unknown>

function thenable<T>(value: T, onUpdate?: (patch: Row) => void) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      if (prop === "update") {
        return (patch: Row) => {
          onUpdate?.(patch)
          return self
        }
      }
      return () => self
    },
  })
  return self
}

const validSettings = {
  id: 1,
  review_email_enabled: true,
  review_email_copy: "Thank you for dining with us.",
  review_email_maps_url: "https://maps.google.com/?q=Restaurant+Link",
  review_email_delay_hours: 0,
}

const validReservation: {
  id: string
  status: string
  email: string | null
  completed_at: string
  table_label: string
} = {
  id: "res-review-1",
  status: "completed",
  email: "guest@example.com",
  completed_at: "2026-08-27T18:00:00.000Z",
  table_label: "4",
}

describe("processDueReviewEmails", () => {
  beforeEach(() => {
    mocks.from.mockReset()
  })

  it("processDue does not call mailer for off, blank copy, invalid URL, missing email, or status not completed", async () => {
    const { processDueReviewEmails } =
      await import("@/lib/marketing/review-email")

    const cases: Array<{
      settings?: Partial<typeof validSettings>
      reservation?: Partial<typeof validReservation>
    }> = [
      { settings: { review_email_enabled: false } },
      { settings: { review_email_copy: "" } },
      { settings: { review_email_copy: "   " } },
      { settings: { review_email_maps_url: "" } },
      {
        settings: {
          review_email_maps_url: "http://maps.google.com/?q=Restaurant+Link",
        },
      },
      { reservation: { email: null } },
      { reservation: { email: "" } },
      { reservation: { status: "confirmed" } },
    ]

    for (const scenario of cases) {
      const settings = { ...validSettings, ...scenario.settings }
      const reservation = { ...validReservation, ...scenario.reservation }
      const originalStatus = reservation.status
      const reservationPatches: Row[] = []

      mocks.from.mockImplementation((table: string) => {
        if (table === "restaurant_settings") {
          return thenable({ data: [settings], error: null })
        }
        if (table === "review_email_sends") {
          return thenable({
            data: [
              {
                reservation_id: reservation.id,
                sent_at: null,
                reservations: reservation,
              },
            ],
            error: null,
          })
        }
        if (table === "reservations") {
          return thenable({ data: [reservation], error: null }, (patch) => {
            reservationPatches.push(patch)
          })
        }
        return thenable({ data: [], error: null })
      })

      const mailer = { send: vi.fn() }
      await processDueReviewEmails({ mailer })

      expect(mailer.send).toHaveBeenCalledTimes(0)
      expect(reservation.status).toBe(originalStatus)
      for (const patch of reservationPatches) {
        expect(patch).not.toHaveProperty("status")
      }
    }
  })

  it("send only after delay_hours from completed_at; 0 may send immediately; clamp 0-72 default 24", async () => {
    const { processDueReviewEmails } =
      await import("@/lib/marketing/review-email")

    const completedAt = validReservation.completed_at
    const completedMs = Date.parse(completedAt)
    const hourMs = 60 * 60 * 1000

    async function sendCount(input: {
      hoursAfterCompleted: number
      delayHours: number
      updatedAtHoursAfterCompleted?: number
    }) {
      const now = new Date(completedMs + input.hoursAfterCompleted * hourMs)
      const settings = {
        ...validSettings,
        review_email_delay_hours: input.delayHours,
      }
      const updatedAtMs =
        input.updatedAtHoursAfterCompleted === undefined
          ? completedMs
          : completedMs + input.updatedAtHoursAfterCompleted * hourMs
      const reservation = {
        ...validReservation,
        completed_at: completedAt,
        updated_at: new Date(updatedAtMs).toISOString(),
      }

      mocks.from.mockImplementation((table: string) => {
        if (table === "restaurant_settings") {
          return thenable({ data: [settings], error: null })
        }
        if (table === "review_email_sends") {
          return thenable({
            data: [
              {
                reservation_id: reservation.id,
                sent_at: null,
                reservations: reservation,
              },
            ],
            error: null,
          })
        }
        if (table === "reservations") {
          return thenable({ data: [reservation], error: null })
        }
        return thenable({ data: [], error: null })
      })

      const mailer = { send: vi.fn() }
      const options = { mailer, now }
      await processDueReviewEmails(options)
      return mailer.send.mock.calls.length
    }

    expect(await sendCount({ hoursAfterCompleted: 23, delayHours: 24 })).toBe(0)
    expect(await sendCount({ hoursAfterCompleted: 24, delayHours: 24 })).toBe(1)

    expect(await sendCount({ hoursAfterCompleted: 0, delayHours: 0 })).toBe(1)

    expect(await sendCount({ hoursAfterCompleted: 24, delayHours: 72 })).toBe(0)
    expect(await sendCount({ hoursAfterCompleted: 72, delayHours: 72 })).toBe(1)

    expect(
      await sendCount({ hoursAfterCompleted: 23, delayHours: Number.NaN }),
    ).toBe(0)
    expect(
      await sendCount({ hoursAfterCompleted: 24, delayHours: Number.NaN }),
    ).toBe(1)
    expect(await sendCount({ hoursAfterCompleted: 24, delayHours: 73 })).toBe(1)
    expect(await sendCount({ hoursAfterCompleted: 0, delayHours: -1 })).toBe(0)
    expect(await sendCount({ hoursAfterCompleted: 24, delayHours: -1 })).toBe(1)

    expect(
      await sendCount({
        hoursAfterCompleted: 24,
        delayHours: 24,
        updatedAtHoursAfterCompleted: 24,
      }),
    ).toBe(1)
    expect(
      await sendCount({
        hoursAfterCompleted: 23,
        delayHours: 24,
        updatedAtHoursAfterCompleted: -1,
      }),
    ).toBe(0)
  })

  it("second successful send never happens; settings edit does not resend; failure allows retry", async () => {
    const { processDueReviewEmails } =
      await import("@/lib/marketing/review-email")

    const sendRow: Row = {
      reservation_id: validReservation.id,
      sent_at: null,
      reservations: { ...validReservation },
    }
    let settings = { ...validSettings }
    const now = new Date(validReservation.completed_at)

    mocks.from.mockImplementation((table: string) => {
      if (table === "restaurant_settings") {
        return thenable({ data: [settings], error: null })
      }
      if (table === "review_email_sends") {
        const unsent = sendRow.sent_at == null ? [sendRow] : []
        return thenable({ data: unsent, error: null }, (patch) => {
          Object.assign(sendRow, patch)
        })
      }
      if (table === "reservations") {
        return thenable({ data: [{ ...validReservation }], error: null })
      }
      return thenable({ data: [], error: null })
    })

    const failingMailer = {
      send: vi.fn(() => Promise.reject(new Error("provider down"))),
    }
    await processDueReviewEmails({ mailer: failingMailer, now }).catch(
      () => undefined,
    )
    expect(failingMailer.send).toHaveBeenCalledTimes(1)
    expect(sendRow.sent_at).toBeNull()

    const successMailer = { send: vi.fn() }
    await processDueReviewEmails({ mailer: successMailer, now })
    expect(successMailer.send).toHaveBeenCalledTimes(1)
    expect(sendRow.sent_at).toBeTruthy()

    const secondMailer = { send: vi.fn() }
    await processDueReviewEmails({ mailer: secondMailer, now })
    expect(secondMailer.send).toHaveBeenCalledTimes(0)

    settings = {
      ...validSettings,
      review_email_copy: "Updated thank-you — please review us.",
      review_email_maps_url: "https://maps.google.com/?q=Updated+Restaurant",
      review_email_delay_hours: 12,
    }
    const later = new Date(
      Date.parse(validReservation.completed_at) + 12 * 60 * 60 * 1000,
    )
    const afterSettingsMailer = { send: vi.fn() }
    await processDueReviewEmails({ mailer: afterSettingsMailer, now: later })
    expect(afterSettingsMailer.send).toHaveBeenCalledTimes(0)
  })

  it("mailer called with reservation guest email, saved copy, and Maps URL as a link", async () => {
    const { processDueReviewEmails } =
      await import("@/lib/marketing/review-email")

    const savedCopy = "Thank you for dining with us — PV-7 staff copy."
    const mapsUrl = "https://maps.google.com/?q=Latest+Restaurant"
    const settings = {
      ...validSettings,
      review_email_copy: savedCopy,
      review_email_maps_url: mapsUrl,
      review_email_delay_hours: 0,
    }
    const now = new Date(validReservation.completed_at)

    mocks.from.mockImplementation((table: string) => {
      if (table === "restaurant_settings") {
        return thenable({ data: [settings], error: null })
      }
      if (table === "review_email_sends") {
        return thenable({
          data: [
            {
              reservation_id: validReservation.id,
              sent_at: null,
              reservations: { ...validReservation },
            },
          ],
          error: null,
        })
      }
      if (table === "reservations") {
        return thenable({ data: [{ ...validReservation }], error: null })
      }
      return thenable({ data: [], error: null })
    })

    const mailer = { send: vi.fn() }
    await processDueReviewEmails({ mailer, now })

    expect(mailer.send).toHaveBeenCalledTimes(1)
    const payload = mailer.send.mock.calls[0]?.[0] as
      { to?: string; html?: string; body?: string; text?: string } | undefined
    expect(payload?.to).toBe("guest@example.com")

    const body = String(payload?.html ?? payload?.body ?? payload?.text ?? "")
    expect(body).toContain(savedCopy)
    expect(body).not.toContain("Merci")
    expect(
      body.includes(`href="${mapsUrl}"`) || body.includes(`href='${mapsUrl}'`),
    ).toBe(true)
  })

  it("success or failure does not change status, table_label, or occupancy fields", async () => {
    const { processDueReviewEmails } =
      await import("@/lib/marketing/review-email")

    const now = new Date(validReservation.completed_at)
    const originalTableLabel = validReservation.table_label
    const occupancyTables = new Set(["tables", "table_merges"])
    const reservationIntegrityKeys = ["status", "table_label"] as const

    async function runProcessDue(mailer: { send: ReturnType<typeof vi.fn> }) {
      const reservation = { ...validReservation }
      const reservationPatches: Row[] = []
      const occupancyWrites: Array<{ table: string; patch: Row }> = []

      mocks.from.mockImplementation((table: string) => {
        const onUpdate = (patch: Row) => {
          if (table === "reservations") {
            reservationPatches.push(patch)
            Object.assign(reservation, patch)
          }
          if (occupancyTables.has(table)) {
            occupancyWrites.push({ table, patch })
          }
        }

        if (table === "restaurant_settings") {
          return thenable({ data: [{ ...validSettings }], error: null })
        }
        if (table === "review_email_sends") {
          return thenable({
            data: [
              {
                reservation_id: reservation.id,
                sent_at: null,
                reservations: reservation,
              },
            ],
            error: null,
          })
        }
        if (table === "reservations") {
          return thenable({ data: [reservation], error: null }, onUpdate)
        }
        return thenable({ data: [], error: null }, onUpdate)
      })

      await processDueReviewEmails({ mailer, now }).catch(() => undefined)
      return { reservation, reservationPatches, occupancyWrites }
    }

    for (const mailer of [
      { send: vi.fn() },
      { send: vi.fn(() => Promise.reject(new Error("provider down"))) },
    ]) {
      const { reservation, reservationPatches, occupancyWrites } =
        await runProcessDue(mailer)

      expect(mailer.send).toHaveBeenCalled()
      expect(reservation.status).toBe("completed")
      expect(reservation.table_label).toBe(originalTableLabel)
      expect(occupancyWrites).toEqual([])
      for (const patch of reservationPatches) {
        for (const key of reservationIntegrityKeys) {
          expect(patch).not.toHaveProperty(key)
        }
      }
    }
  })
})
