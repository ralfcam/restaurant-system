import { beforeEach, describe, expect, it, vi } from "vitest"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"
import { validateReservationPayload } from "@/lib/reservations/validation"

const KEYS = {
  nameRequired: "errors.reservation.nameRequired",
  nameTooLong: "errors.reservation.nameTooLong",
  partySizeInvalid: "errors.reservation.partySizeInvalid",
  partyTooLarge: "errors.reservation.partyTooLarge",
  dateInvalid: "errors.reservation.dateInvalid",
  dateInPast: "errors.reservation.dateInPast",
  timeInvalid: "errors.reservation.timeInvalid",
  phoneInvalid: "errors.reservation.phoneInvalid",
  emailInvalid: "errors.reservation.emailInvalid",
  notesTooLong: "errors.reservation.notesTooLong",
  dateUnavailable: "errors.reservation.dateUnavailable",
  closed: "errors.reservation.closed",
  hoursWindow: "errors.reservation.hoursWindow",
  outsideHours: "errors.reservation.outsideHours",
  saveFailed: "errors.reservation.saveFailed",
  bookingDateBlocked: "errors.reservation.bookingDateBlocked",
  bookingClosed: "errors.reservation.bookingClosed",
  bookingOutsideHours: "errors.reservation.bookingOutsideHours",
  fullyBooked: "errors.reservation.fullyBooked",
  unauthorized: "errors.reservation.unauthorized",
  loadFailed: "errors.reservation.loadFailed",
  notFound: "errors.reservation.notFound",
  invalidTransition: "errors.reservation.invalidTransition",
  statusUpdateFailed: "errors.reservation.statusUpdateFailed",
  nothingToUndo: "errors.reservation.nothingToUndo",
  staleStatusChange: "errors.reservation.staleStatusChange",
  undoFailed: "errors.reservation.undoFailed",
  tableUnavailable: "errors.reservation.tableUnavailable",
  closedReservation: "errors.reservation.closedReservation",
  tableTooSmall: "errors.reservation.tableTooSmall",
  assignFailed: "errors.reservation.assignFailed",
  tableOverlap: "errors.reservation.tableOverlap",
  tablesLoadFailed: "errors.reservation.tablesLoadFailed",
} as const

const P0001_KEYS: Record<string, string> = {
  "Booking denied: Date is explicitly blocked.": KEYS.bookingDateBlocked,
  "Booking denied: Restaurant is closed on this day.": KEYS.bookingClosed,
  "Booking denied: Outside operating hours.": KEYS.bookingOutsideHours,
  "Booking denied: This time is fully booked.": KEYS.fullyBooked,
}

const TODAY = "2026-08-18"

const dinnerWindow = {
  day_of_week: 2,
  is_closed: false,
  segments: [
    { label: "Dinner", opens_at: "18:00", closes_at: "22:00", sort_order: 0 },
  ],
}

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  today: vi.fn(() => "2026-08-18"),
  nowTime: vi.fn(() => "18:00"),
  anonFrom: vi.fn(),
  serviceFrom: vi.fn(),
  insert: vi.fn(),
  isDateBlocked: vi.fn(),
  getOperatingWindowForDate: vi.fn(),
  sendBookingConfirmation: vi.fn(),
  requireStaffUser: vi.fn(),
  serviceQueue: [] as Array<{ data: unknown; error: unknown }>,
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
  createServiceClient: () => ({ from: mocks.serviceFrom }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({ from: mocks.anonFrom }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "staff-1" } } }) },
  }),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/marketing/booking-confirmation", () => ({
  sendBookingConfirmation: mocks.sendBookingConfirmation,
}))

type QueryResult = { data: unknown; error: unknown }

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
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as QueryResult
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

function expectMessageKey(actual: string | null | undefined, key: string) {
  expect(actual).toBe(key)
  expectCatalogKey(key)
}

function basePayload(
  overrides: Partial<{
    guestName: string
    partySize: number
    date: string
    time: string
    phone: string
    email: string
    notes: string
  }> = {},
) {
  return {
    guestName: "Amelia Brooks",
    partySize: 2,
    date: "2026-08-25",
    time: "18:30",
    phone: "555-0100",
    email: "guest@test.local",
    ...overrides,
  }
}

function openForBooking() {
  mocks.isDateBlocked.mockResolvedValue(false)
  mocks.getOperatingWindowForDate.mockResolvedValue(dinnerWindow)
  mocks.insert.mockReset()
  mocks.insert.mockResolvedValue({ error: null })
  mocks.anonFrom.mockImplementation(() => ({ insert: mocks.insert }))
}

function scriptService(...results: QueryResult[]) {
  mocks.serviceQueue.length = 0
  mocks.serviceQueue.push(...results)
  mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
}

describe("reservation producers return errors.* catalog keys", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockReset()
    mocks.anonFrom.mockReset()
    mocks.serviceFrom.mockReset()
    mocks.insert.mockReset()
    mocks.isDateBlocked.mockReset()
    mocks.getOperatingWindowForDate.mockReset()
    mocks.sendBookingConfirmation.mockReset()
    mocks.requireStaffUser.mockReset()
    mocks.serviceQueue.length = 0
    mocks.today.mockReturnValue(TODAY)
    mocks.nowTime.mockReturnValue("18:00")
    mocks.sendBookingConfirmation.mockResolvedValue(undefined)
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.serviceFrom.mockImplementation(() => {
      const next = mocks.serviceQueue.shift() ?? {
        data: null,
        error: { message: "unscripted query" },
      }
      return thenable(next)
    })
    openForBooking()
  })

  it("validation errors are errors.* catalog keys", () => {
    const cases: Array<[Partial<Parameters<typeof basePayload>[0]>, string]> = [
      [{ guestName: "" }, KEYS.nameRequired],
      [{ guestName: "a".repeat(101) }, KEYS.nameTooLong],
      [{ partySize: 0 }, KEYS.partySizeInvalid],
      [{ partySize: 9 }, KEYS.partyTooLarge],
      [{ date: "not-a-date" }, KEYS.dateInvalid],
      [{ date: "2026-02-30" }, KEYS.dateInvalid],
      [{ date: "2020-01-01" }, KEYS.dateInPast],
      [{ time: "25:99" }, KEYS.timeInvalid],
      [{ phone: "nope" }, KEYS.phoneInvalid],
      [{ email: "not-an-email" }, KEYS.emailInvalid],
      [{ notes: "n".repeat(501) }, KEYS.notesTooLong],
    ]

    for (const [overrides, key] of cases) {
      expectMessageKey(
        validateReservationPayload(basePayload(overrides), TODAY),
        key,
      )
    }
  })

  it("createReservation maps booking denials and unmapped failures to errors.* keys", async () => {
    const { createReservation } = await import("@/app/actions/reservations")

    openForBooking()
    mocks.isDateBlocked.mockResolvedValue(true)
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.dateUnavailable,
    )

    openForBooking()
    mocks.getOperatingWindowForDate.mockResolvedValue({
      ...dinnerWindow,
      is_closed: true,
    })
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.closed,
    )

    openForBooking()
    expectMessageKey(
      (await createReservation(basePayload({ time: "12:00" }))).error,
      KEYS.hoursWindow,
    )

    openForBooking()
    mocks.getOperatingWindowForDate.mockResolvedValue({
      ...dinnerWindow,
      segments: [],
    })
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.outsideHours,
    )

    openForBooking()
    expectMessageKey(
      (await createReservation(basePayload({ email: "not-an-email" }))).error,
      KEYS.emailInvalid,
    )

    for (const [message, key] of Object.entries(P0001_KEYS)) {
      openForBooking()
      mocks.insert.mockResolvedValue({ error: { code: "P0001", message } })
      expectMessageKey((await createReservation(basePayload())).error, key)
    }

    openForBooking()
    mocks.insert.mockResolvedValue({
      error: {
        code: "P0001",
        message: "Booking denied: unrecognized reason",
      },
    })
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.saveFailed,
    )

    openForBooking()
    mocks.insert.mockResolvedValue({
      error: {
        code: "PGRST301",
        message: "JWT expired",
      },
    })
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.saveFailed,
    )

    openForBooking()
    mocks.insert.mockResolvedValue({
      error: {
        code: "23502",
        message:
          'null value in column "guest_name" violates not-null constraint',
      },
    })
    expectMessageKey(
      (await createReservation(basePayload())).error,
      KEYS.saveFailed,
    )
  })

  it("status, undo, assign, and list errors are errors.* catalog keys", async () => {
    const {
      assignReservationTable,
      autoAssignDueReservations,
      getReservationsByDate,
      transitionReservationStatus,
      undoReservationStatus,
    } = await import("@/app/actions/reservations")

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      (await getReservationsByDate("2026-08-25")).error,
      KEYS.unauthorized,
    )

    scriptService({
      data: null,
      error: { message: "could not query reservations" },
    })
    expectMessageKey(
      (await getReservationsByDate("2026-08-25")).error,
      KEYS.loadFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      (await transitionReservationStatus("res-1", "seated")).error,
      KEYS.unauthorized,
    )

    scriptService({ data: null, error: { message: "PGRST116" } })
    expectMessageKey(
      (await transitionReservationStatus("res-1", "seated")).error,
      KEYS.notFound,
    )

    scriptService({
      data: { status: "completed", table_label: null },
      error: null,
    })
    expectMessageKey(
      (await transitionReservationStatus("res-1", "seated")).error,
      KEYS.invalidTransition,
    )

    scriptService(
      { data: { status: "confirmed", table_label: null }, error: null },
      { data: null, error: { message: "write failed" } },
    )
    expectMessageKey(
      (await transitionReservationStatus("res-1", "seated")).error,
      KEYS.statusUpdateFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      (await undoReservationStatus("res-1")).error,
      KEYS.unauthorized,
    )

    scriptService(
      { data: { status: "seated", table_label: null }, error: null },
      { data: null, error: { message: "no rows" } },
    )
    expectMessageKey(
      (await undoReservationStatus("res-1")).error,
      KEYS.nothingToUndo,
    )

    scriptService(
      { data: { status: "seated", table_label: null }, error: null },
      {
        data: {
          id: "evt-1",
          from_status: "confirmed",
          to_status: "completed",
        },
        error: null,
      },
    )
    expectMessageKey(
      (await undoReservationStatus("res-1")).error,
      KEYS.staleStatusChange,
    )

    scriptService(
      { data: { status: "seated", table_label: null }, error: null },
      {
        data: { id: "evt-1", from_status: "confirmed", to_status: "seated" },
        error: null,
      },
      { data: null, error: { message: "could not write" } },
    )
    expectMessageKey(
      (await undoReservationStatus("res-1")).error,
      KEYS.undoFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.unauthorized,
    )

    scriptService({ data: null, error: { message: "missing table" } })
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.tableUnavailable,
    )

    scriptService(
      { data: { label: "4", seats: 4 }, error: null },
      { data: null, error: { message: "PGRST116" } },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.notFound,
    )

    scriptService(
      { data: { label: "4", seats: 4 }, error: null },
      {
        data: {
          id: "res-1",
          date: "2026-08-25",
          time: "18:00",
          status: "completed",
          table_label: null,
          party_size: 2,
        },
        error: null,
      },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.closedReservation,
    )

    scriptService(
      { data: { label: "4", seats: 2 }, error: null },
      {
        data: {
          id: "res-1",
          date: "2026-08-25",
          time: "18:00",
          status: "confirmed",
          table_label: null,
          party_size: 4,
        },
        error: null,
      },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.tableTooSmall,
    )

    scriptService(
      { data: { label: "4", seats: 4 }, error: null },
      {
        data: {
          id: "res-1",
          date: "2026-08-25",
          time: "18:00",
          status: "confirmed",
          table_label: null,
          party_size: 2,
        },
        error: null,
      },
      { data: null, error: null },
      { data: null, error: { message: "connection reset" } },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.assignFailed,
    )

    scriptService(
      { data: { label: "4", seats: 4 }, error: null },
      {
        data: {
          id: "res-1",
          date: "2026-08-25",
          time: "18:00",
          status: "confirmed",
          table_label: null,
          party_size: 2,
        },
        error: null,
      },
      { data: null, error: null },
      {
        data: [{ id: "other", time: "18:00", table_label: "4" }],
        error: null,
      },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", "4")).error,
      KEYS.tableOverlap,
    )

    scriptService(
      {
        data: {
          id: "res-1",
          date: "2026-08-25",
          time: "18:00",
          status: "confirmed",
          table_label: "1",
          party_size: 2,
        },
        error: null,
      },
      { data: null, error: { message: "deadlock detected" } },
    )
    expectMessageKey(
      (await assignReservationTable("res-1", null)).error,
      KEYS.assignFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    expectMessageKey(
      (await autoAssignDueReservations()).error,
      KEYS.unauthorized,
    )

    scriptService({
      data: null,
      error: { message: "could not query reservations" },
    })
    expectMessageKey((await autoAssignDueReservations()).error, KEYS.loadFailed)

    scriptService(
      { data: [], error: null },
      {
        data: null,
        error: { message: "permission denied for table tables" },
      },
    )
    expectMessageKey(
      (await autoAssignDueReservations()).error,
      KEYS.tablesLoadFailed,
    )
  })
})
