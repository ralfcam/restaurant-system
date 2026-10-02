import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  EMAIL_RE,
  PHONE_RE,
  RESERVATION_ONLINE_MAX_PARTY,
  validateReservationPayload,
} from "@/lib/reservations/validation"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn(),
  sendBookingConfirmation: vi.fn(),
  today: vi.fn(() => "2026-10-02"),
  nowTime: vi.fn(() => "12:21"),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: (to: string) => mocks.redirect(to),
}))

vi.mock("@/lib/timezone", () => ({
  getTodayInRestaurantTZ: () => mocks.today(),
  getNowTimeInRestaurantTZ: () => mocks.nowTime(),
}))

vi.mock("@/lib/marketing/booking-confirmation", () => ({
  sendBookingConfirmation: (...args: unknown[]) =>
    mocks.sendBookingConfirmation(...args),
}))

vi.mock("next/cache", () => ({
  revalidatePath: () => undefined,
}))

type Row = Record<string, unknown>

type SeatWalkIn = (input: {
  table_label: string
  party_size: number
}) => Promise<unknown>

const root = process.cwd()
const walkIn = { table_label: "4", party_size: 2 }
const walkInToday = "2026-10-02"
const walkInNow = "12:21"

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "insert") {
        return (...args: unknown[]) => {
          mocks.insert(...args)
          return self
        }
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as { data: Row | Row[] | null; error: unknown }
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: row ? null : payload.error })
      }
      return () => self
    },
  })
  return self
}

function existingAdminLoginRedirect() {
  const proxy = readFileSync(path.join(root, "lib/supabase/proxy.ts"), "utf8")
  const match = proxy.match(/user \? "\/" : "([^"]+)"/)
  if (!match?.[1]) {
    throw new Error("existing /admin login redirect missing from proxy.ts")
  }
  return match[1]
}

async function settle(run: () => Promise<unknown>) {
  try {
    return { outcome: await run(), thrown: null as unknown }
  } catch (error) {
    return { outcome: undefined, thrown: error }
  }
}

describe("walk-in seating", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.insert.mockReset()
    mocks.getUser.mockReset()
    mocks.redirect.mockReset()
    mocks.sendBookingConfirmation.mockReset()
    mocks.sendBookingConfirmation.mockResolvedValue(undefined)
    mocks.today.mockReset()
    mocks.nowTime.mockReset()
    mocks.today.mockReturnValue(walkInToday)
    mocks.nowTime.mockReturnValue(walkInNow)
    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.from.mockImplementation(() => thenable({ data: [], error: null }))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
    mocks.redirect.mockImplementation((to: string) => {
      throw new Error(`NEXT_REDIRECT:${to}`)
    })
  })

  it("walk-in create requires a staff session and the floor control is walk-in-seat", async () => {
    const loginPath = existingAdminLoginRedirect()
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: SeatWalkIn
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as SeatWalkIn

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.createServiceClient.mockClear()
    mocks.insert.mockClear()
    mocks.redirect.mockClear()
    await expect(seatWalkIn(walkIn)).rejects.toThrow(
      `NEXT_REDIRECT:${loginPath}`,
    )
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    mocks.requireStaffUser.mockResolvedValue(null)
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "guest-1",
          app_metadata: {},
          user_metadata: { role: "staff" },
        },
      },
    })
    mocks.createServiceClient.mockClear()
    mocks.insert.mockClear()
    mocks.redirect.mockClear()
    const refused = await settle(() => seatWalkIn(walkIn))
    const refusedMessage =
      refused.thrown instanceof Error ? refused.thrown.message : ""
    expect(refusedMessage).not.toContain(loginPath)
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(mocks.createServiceClient).not.toHaveBeenCalled()

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.createServiceClient.mockClear()
    await settle(() => seatWalkIn(walkIn))
    expect(mocks.requireStaffUser).toHaveBeenCalled()
    expect(mocks.createServiceClient).toHaveBeenCalled()

    const floor = readFileSync(
      path.join(root, "components/staff/floor-plan.tsx"),
      "utf8",
    )
    const selectedPanel = floor.slice(floor.indexOf("{selected ?"))
    expect(selectedPanel).toContain('data-testid="walk-in-seat"')
  })

  it("successful walk-in inserts one seated reservation for today and now and sends no confirmation email", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
        email?: string | null
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.insert.mockClear()
    mocks.sendBookingConfirmation.mockClear()

    const omitted = await seatWalkIn(walkIn)
    expect(omitted.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const omittedRow = mocks.insert.mock.calls[0]?.[0] as {
      status: string
      table_label: string
      date: string
      time: string
      party_size: number
      guest_name: string
      phone: string
      email: string | null
      conf_code: string
    }
    expect(omittedRow).toMatchObject({
      status: "seated",
      table_label: walkIn.table_label,
      date: walkInToday,
      time: walkInNow,
      party_size: walkIn.party_size,
      guest_name: "",
      phone: "",
      email: null,
    })
    expect(omittedRow.conf_code).toMatch(/^TVL-\d{4}$/)
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled()

    mocks.insert.mockClear()
    mocks.sendBookingConfirmation.mockClear()
    const withEmail = await seatWalkIn({
      table_label: "12",
      party_size: 5,
      email: "walkin@test.local",
    })
    expect(withEmail.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    const stored = mocks.insert.mock.calls[0]?.[0] as {
      status?: string
      email?: string | null
    }
    expect(stored).toMatchObject({
      status: "seated",
      email: "walkin@test.local",
    })
    expect(mocks.sendBookingConfirmation).not.toHaveBeenCalled()
  })

  it("walk-in create returns the availability trigger refusal and adds no walk-in exception", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const triggerMessage = "Booking denied: Outside operating hours."
    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.insert.mockClear()
    mocks.from.mockImplementation(() =>
      thenable({
        data: {
          id: "walk-in-row",
          status: "seated",
          conf_code: "TVL-1111",
        },
        error: { message: triggerMessage, code: "P0001" },
      }),
    )

    const refused = await seatWalkIn(walkIn)
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(refused).toEqual({ error: triggerMessage })

    const baseline = readFileSync(
      path.join(root, "supabase/migrations/00000000000000_baseline.sql"),
      "utf8",
    )
    const marker =
      "CREATE OR REPLACE FUNCTION validate_reservation_availability()"
    const start = baseline.indexOf(marker)
    expect(start).toBeGreaterThanOrEqual(0)
    const end = baseline.indexOf("$$;", start)
    expect(end).toBeGreaterThan(start)
    const fn = baseline.slice(start, end)
    expect(fn).toContain("Booking denied: Date is explicitly blocked.")
    expect(fn).toContain("Booking denied: Restaurant is closed on this day.")
    expect(fn).toContain(triggerMessage)
    expect(fn).toContain("Booking denied: This time is fully booked.")
    expect(fn).toContain("IF NEW.status IN ('confirmed', 'seated')")
    expect(fn).not.toMatch(/walk[-_ ]?in/i)
    const beforeRefusals = fn.slice(0, fn.indexOf("Booking denied:"))
    expect(beforeRefusals).not.toMatch(/RETURN\s+NEW/i)
    expect(beforeRefusals).not.toMatch(
      /NEW\.status\s*(?:=|<>|!=)\s*'seated'|NEW\.status\s+IS\s+DISTINCT\s+FROM\s+'seated'/i,
    )
    expect(fn).not.toMatch(
      /IF\s+NEW\.status\s*=\s*'seated'\s+THEN[\s\S]{0,400}?RETURN\s+NEW/i,
    )
  })

  it("walk-in create refuses a table that is too small or overlaps an occupying reservation", async () => {
    const { occupyingWindowMinutes, occupyingWindowsOverlap } =
      await import("@/lib/reservations/auto-assign")
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const occupancyDurationMinutes = 90
    const safetyBufferMinutes = 15
    const walkInWindow = occupyingWindowMinutes(
      walkInNow,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )
    const overlappingTime = "13:00"
    const clearTime = "14:06"
    const overlappingWindow = occupyingWindowMinutes(
      overlappingTime,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )
    const clearWindow = occupyingWindowMinutes(
      clearTime,
      occupancyDurationMinutes,
      safetyBufferMinutes,
    )
    expect(walkInWindow).not.toBeNull()
    expect(overlappingWindow).not.toBeNull()
    expect(clearWindow).not.toBeNull()
    expect(occupyingWindowsOverlap(walkInWindow!, overlappingWindow!)).toBe(
      true,
    )
    expect(occupyingWindowsOverlap(walkInWindow!, clearWindow!)).toBe(false)

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const label = "4"

    function script(input: { seats: number; reservations: Row[] }) {
      mocks.insert.mockClear()
      mocks.from.mockImplementation((table: string) => {
        if (table === "tables") {
          return thenable({
            data: { label, seats: input.seats },
            error: null,
          })
        }
        if (table === "restaurant_settings") {
          return thenable({
            data: {
              occupancy_duration_minutes: occupancyDurationMinutes,
              safety_buffer_minutes: safetyBufferMinutes,
            },
            error: null,
          })
        }
        return thenable({ data: input.reservations, error: null })
      })
    }

    script({ seats: 2, reservations: [] })
    const tooSmall = await seatWalkIn({ table_label: label, party_size: 4 })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(tooSmall).toEqual({ error: expect.any(String) })

    for (const status of ["confirmed", "seated"] as const) {
      script({
        seats: 4,
        reservations: [
          {
            id: `occ-${status}`,
            status,
            time: overlappingTime,
            table_label: label,
            date: walkInToday,
          },
        ],
      })
      const refused = await seatWalkIn({ table_label: label, party_size: 2 })
      expect(mocks.insert).not.toHaveBeenCalled()
      expect(refused).toEqual({ error: expect.any(String) })
    }

    script({
      seats: 4,
      reservations: [
        {
          id: "clear-1",
          status: "confirmed",
          time: clearTime,
          table_label: label,
          date: walkInToday,
        },
      ],
    })
    const allowed = await seatWalkIn({ table_label: label, party_size: 2 })
    expect(allowed.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({
      status: "seated",
      table_label: label,
      party_size: 2,
      date: walkInToday,
      time: walkInNow,
    })
  })

  it("seated walk-in completion persists completed, stamps completed_at, clears the label, and frees the table", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      transitionReservationStatus?: (
        reservationId: string,
        nextStatus: "completed",
      ) => Promise<{ error?: string }>
    }
    expect(typeof actions.transitionReservationStatus).toBe("function")
    const transitionReservationStatus =
      actions.transitionReservationStatus as NonNullable<
        typeof actions.transitionReservationStatus
      >

    const actionsSource = readFileSync(
      path.join(root, "app/actions/reservations.ts"),
      "utf8",
    )
    const matrixStart = actionsSource.indexOf("const RESERVATION_TRANSITIONS")
    const matrixEnd = actionsSource.indexOf(
      "export async function transitionReservationStatus",
    )
    expect(matrixStart).toBeGreaterThanOrEqual(0)
    expect(matrixEnd).toBeGreaterThan(matrixStart)
    const matrix = actionsSource.slice(matrixStart, matrixEnd)
    expect(matrix).toContain('seated: ["completed"]')
    expect(matrix).not.toMatch(/walk[-_ ]?in/i)

    const reservationId = "walk-in-seated-1"
    const label = "4"
    const tableId = "table-4"
    const updates: {
      table: string
      patch: Record<string, unknown>
      eq: unknown[][]
    }[] = []

    function recordUpdate(table: string) {
      return (patch: Record<string, unknown>) => {
        const recorded = { table, patch, eq: [] as unknown[][] }
        updates.push(recorded)
        const chain = {
          eq: (...args: unknown[]) => {
            recorded.eq.push(args)
            return chain
          },
          then: (
            resolve: (value: unknown) => unknown,
            reject?: (reason: unknown) => unknown,
          ) => Promise.resolve({ error: null }).then(resolve, reject),
        }
        return chain
      }
    }

    mocks.requireStaffUser.mockResolvedValue({
      id: "staff-1",
      app_metadata: { role: "super_admin" },
    })
    mocks.from.mockImplementation((table: string) => {
      if (table === "reservations") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { status: "seated", table_label: label },
                error: null,
              }),
            }),
          }),
          update: recordUpdate(table),
        }
      }
      if (table === "tables") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: tableId, status: "seated", label },
                error: null,
              }),
            }),
          }),
          update: recordUpdate(table),
        }
      }
      return thenable({ data: null, error: null })
    })

    const result = await transitionReservationStatus(reservationId, "completed")
    expect(result).toEqual({})

    const reservationUpdate = updates.find(
      (update) => update.table === "reservations",
    )
    expect(reservationUpdate?.eq).toContainEqual(["id", reservationId])
    expect(reservationUpdate?.patch).toMatchObject({
      status: "completed",
      table_label: null,
    })
    expect(reservationUpdate?.patch.completed_at).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    )

    const tableUpdate = updates.find((update) => update.table === "tables")
    expect(tableUpdate?.eq).toContainEqual(["id", tableId])
    expect(tableUpdate?.patch).toMatchObject({ status: "available" })
  })

  it("walk-in party size must be an integer of at least 1 and may exceed 8", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: unknown
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const refusedSizes = [0, -2, 1.5, "4"] as const
    for (const party_size of refusedSizes) {
      mocks.insert.mockClear()
      const refused = await seatWalkIn({ table_label: "4", party_size })
      expect(mocks.insert).not.toHaveBeenCalled()
      expect(refused).toEqual({ error: expect.any(String) })
    }

    const largeParty = RESERVATION_ONLINE_MAX_PARTY + 1
    const label = "4"
    mocks.insert.mockClear()
    mocks.from.mockImplementation((table: string) => {
      if (table === "tables") {
        return thenable({
          data: { label, seats: largeParty },
          error: null,
        })
      }
      if (table === "restaurant_settings") {
        return thenable({
          data: {
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      return thenable({ data: [], error: null })
    })

    const accepted = await seatWalkIn({
      table_label: label,
      party_size: largeParty,
    })
    expect(accepted.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({
      status: "seated",
      table_label: label,
      party_size: largeParty,
    })

    expect(
      validateReservationPayload(
        {
          guestName: "Amelia Brooks",
          partySize: largeParty,
          date: "2026-10-03",
          time: "18:30",
          phone: "+1 (503) 555-0111",
          email: "guest@test.local",
        },
        walkInToday,
      ),
    ).toBe("errors.reservation.partyTooLarge")
  })

  it("walk-in stores trimmed valid contact and refuses a bad phone or email", async () => {
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
        guest_name?: string
        phone?: string
        email?: string | null
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })

    const badPhone = "555-HELP"
    const badEmail = "not-an-email"
    const validPhone = "+15035550111"
    const validEmail = "walkin@test.local"
    const paddedName = "  Ada Lovelace  "
    const paddedPhone = ` ${validPhone} `
    const paddedEmail = ` ${validEmail} `

    expect(badPhone.trim()).not.toBe("")
    expect(PHONE_RE.test(badPhone)).toBe(false)
    expect(badEmail.trim()).not.toBe("")
    expect(EMAIL_RE.test(badEmail)).toBe(false)
    expect(PHONE_RE.test(validPhone)).toBe(true)
    expect(EMAIL_RE.test(validEmail)).toBe(true)
    expect(PHONE_RE.test(paddedPhone.trim())).toBe(true)
    expect(EMAIL_RE.test(paddedEmail.trim())).toBe(true)

    mocks.insert.mockClear()
    const badPhoneResult = await seatWalkIn({
      table_label: "4",
      party_size: 2,
      guest_name: "Ada Lovelace",
      phone: badPhone,
      email: validEmail,
    })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(badPhoneResult).toEqual({ error: expect.any(String) })

    mocks.insert.mockClear()
    const badEmailResult = await seatWalkIn({
      table_label: "4",
      party_size: 2,
      guest_name: "Ada Lovelace",
      phone: validPhone,
      email: badEmail,
    })
    expect(mocks.insert).not.toHaveBeenCalled()
    expect(badEmailResult).toEqual({ error: expect.any(String) })

    mocks.insert.mockClear()
    const stored = await seatWalkIn({
      table_label: "4",
      party_size: 2,
      guest_name: paddedName,
      phone: paddedPhone,
      email: paddedEmail,
    })
    expect(stored.error).toBeUndefined()
    expect(mocks.insert).toHaveBeenCalledTimes(1)
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({
      guest_name: paddedName.trim(),
      phone: paddedPhone.trim(),
      email: paddedEmail.trim(),
    })
  })

  it("successful walk-in sets the table group seated and the floor overlay shows party size and time", async () => {
    const { overlayReservationsOnTables } =
      await import("@/lib/reservations/auto-assign")
    const actions = (await import("@/app/actions/reservations")) as {
      seatWalkIn?: (input: {
        table_label: string
        party_size: number
      }) => Promise<{ error?: string }>
    }
    expect(typeof actions.seatWalkIn).toBe("function")
    const seatWalkIn = actions.seatWalkIn as NonNullable<
      typeof actions.seatWalkIn
    >

    const label = walkIn.table_label
    const tableId = "table-4"
    const updates: {
      table: string
      patch: Record<string, unknown>
      eq: unknown[][]
    }[] = []

    function recordUpdate(table: string) {
      return (patch: Record<string, unknown>) => {
        const recorded = { table, patch, eq: [] as unknown[][] }
        updates.push(recorded)
        const chain = {
          eq: (...args: unknown[]) => {
            recorded.eq.push(args)
            return chain
          },
          then: (
            resolve: (value: unknown) => unknown,
            reject?: (reason: unknown) => unknown,
          ) => Promise.resolve({ error: null }).then(resolve, reject),
        }
        return chain
      }
    }

    const superAdmin = {
      id: "super-admin-1",
      app_metadata: { role: "super_admin" },
    }
    mocks.requireStaffUser.mockResolvedValue(superAdmin)
    mocks.getUser.mockResolvedValue({ data: { user: superAdmin } })
    mocks.insert.mockClear()
    mocks.from.mockImplementation((table: string) => {
      if (table === "tables") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: tableId,
                  label,
                  seats: 4,
                  status: "available",
                },
                error: null,
              }),
            }),
          }),
          update: recordUpdate(table),
        }
      }
      if (table === "restaurant_settings") {
        return thenable({
          data: {
            occupancy_duration_minutes: 90,
            safety_buffer_minutes: 15,
          },
          error: null,
        })
      }
      return thenable({ data: [], error: null })
    })

    const seated = await seatWalkIn(walkIn)
    expect(seated.error).toBeUndefined()
    const inserted = mocks.insert.mock.calls[0]?.[0] as {
      status: "seated"
      table_label: string
      party_size: number
      time: string
      guest_name: string
    }
    expect(inserted).toMatchObject({
      status: "seated",
      table_label: label,
      party_size: walkIn.party_size,
      time: walkInNow,
    })

    const overlay = overlayReservationsOnTables(
      [{ id: tableId, label, seats: 4, status: "available" }],
      [
        {
          id: "walk-in-row",
          guest_name: inserted.guest_name,
          party_size: inserted.party_size,
          time: inserted.time,
          status: inserted.status,
          table_label: inserted.table_label,
        },
      ],
    ).find((table) => table.label === label)
    expect(overlay).toMatchObject({
      displayStatus: "seated",
      reservation: {
        status: "seated",
        partySize: walkIn.party_size,
        time: walkInNow,
      },
    })

    const tableStatusEvent = mocks.insert.mock.calls
      .slice(1)
      .map((call) => call[0])
      .find(
        (payload) =>
          !!payload &&
          typeof payload === "object" &&
          (payload as { entity_type?: unknown }).entity_type === "table",
      )
    const tableUpdate = updates.find((update) => update.table === "tables")
    expect({
      tableStatusEvent,
      table: tableUpdate?.table,
      patch: tableUpdate?.patch,
      eq: tableUpdate?.eq,
    }).toEqual({
      tableStatusEvent: expect.objectContaining({
        entity_type: "table",
        entity_id: tableId,
        from_status: "available",
        to_status: "seated",
      }),
      table: "tables",
      patch: expect.objectContaining({
        status: "seated",
        updated_at: expect.any(String),
      }),
      eq: expect.arrayContaining([["id", tableId]]),
    })
  })
})
