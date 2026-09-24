import { beforeEach, describe, expect, it, vi } from "vitest"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"
import {
  DEFAULT_OPERATING_DAYS,
  validateOperatingDays,
  type OperatingDay,
  type OperatingSegment,
} from "@/lib/reservations/operating-hours"

const KEYS = {
  weekRequired: "errors.scheduling.weekRequired",
  invalidDay: "errors.scheduling.invalidDay",
  duplicateDay: "errors.scheduling.duplicateDay",
  openWithoutSegments: "errors.scheduling.openWithoutSegments",
  guestNoteTooLong: "errors.scheduling.guestNoteTooLong",
  invalidSegmentTime: "errors.scheduling.invalidSegmentTime",
  closesBeforeOpen: "errors.scheduling.closesBeforeOpen",
  overlapping: "errors.scheduling.overlapping",
  invalidServiceMax: "errors.scheduling.invalidServiceMax",
  invalidSlotTime: "errors.scheduling.invalidSlotTime",
  slotOutsideWindow: "errors.scheduling.slotOutsideWindow",
  slotOffGrid: "errors.scheduling.slotOffGrid",
  invalidSlotMax: "errors.scheduling.invalidSlotMax",
  unauthorized: "errors.availability.unauthorized",
  blockedDatesLoadFailed: "errors.availability.blockedDatesLoadFailed",
  schemaUnavailable: "errors.availability.schemaUnavailable",
  unmapped: "errors.availability.unmapped",
  contactUnauthorized: "errors.restaurantInfo.unauthorized",
  contactRequired: "errors.restaurantInfo.contactRequired",
  contactTooLong: "errors.restaurantInfo.contactTooLong",
  contactSaveFailed: "errors.restaurantInfo.saveFailed",
} as const

type CatalogParams = Record<string, string | number>

type QueryResult = {
  data: unknown
  error: { message?: string; code?: string } | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  requireSuperAdminUser: vi.fn(),
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  anonQueue: [] as QueryResult[],
  serviceQueue: [] as QueryResult[],
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
  requireSuperAdminUser: mocks.requireSuperAdminUser,
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: mocks.rpc,
    from: () => {
      const next = mocks.serviceQueue.shift() ?? {
        data: null,
        error: { message: "unscripted query" },
      }
      return thenable(next)
    },
  }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({
    from: () => {
      const next = mocks.anonQueue.shift() ?? {
        data: null,
        error: { message: "unscripted query" },
      }
      return thenable(next)
    },
  }),
}))

function thenable(value: QueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (result: QueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        return async () => {
          const row = Array.isArray(value.data)
            ? (value.data[0] ?? null)
            : value.data
          return { data: row, error: value.error }
        }
      }
      return () => self
    },
  })
  return self
}

function expectCatalogMessage(
  actual: unknown,
  key: string,
  params?: CatalogParams,
) {
  const resolved =
    typeof actual === "object" &&
    actual !== null &&
    "key" in actual &&
    typeof (actual as { key: unknown }).key === "string"
      ? (actual as { key: string }).key
      : actual
  expect(resolved).toBe(key)
  expect(actual).toEqual(params === undefined ? key : { key, params })
  expectCatalogKey(key)
}

async function thrownMessage(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run()
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

function segment(
  opens_at: string,
  closes_at: string,
  extra: Partial<OperatingSegment> = {},
): OperatingSegment {
  return {
    label: "Dinner",
    opens_at,
    closes_at,
    sort_order: extra.sort_order ?? 0,
    ...extra,
  }
}

function onDay(
  dayOfWeek: number,
  segments: OperatingSegment[],
): OperatingDay[] {
  return DEFAULT_OPERATING_DAYS.map((day) =>
    day.day_of_week === dayOfWeek
      ? { day_of_week: dayOfWeek, is_closed: false, segments }
      : day,
  )
}

function ok(data: unknown): QueryResult {
  return { data, error: null }
}

function fail(message: string, code?: string): QueryResult {
  return { data: null, error: { message, ...(code ? { code } : {}) } }
}

function scriptAnon(...results: QueryResult[]) {
  mocks.anonQueue.length = 0
  mocks.anonQueue.push(...results)
}

function scriptService(...results: QueryResult[]) {
  mocks.serviceQueue.length = 0
  mocks.serviceQueue.push(...results)
  mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
}

const contact = { address: "10 Kitchen Lane", phone: "+1 555 0199" }

describe("scheduling producers return errors.* catalog keys", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.requireSuperAdminUser.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.rpc.mockReset()
    mocks.anonQueue.length = 0
    mocks.serviceQueue.length = 0
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    mocks.rpc.mockResolvedValue({ error: null })
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  it("day-named operating-day errors are catalog keys with interpolation params", () => {
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [
          segment("09:00", "13:00", { label: "Brunch", sort_order: 0 }),
          segment("12:00", "14:00", { label: "Lunch", sort_order: 1 }),
        ]),
      ),
      KEYS.overlapping,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(5, [
          segment("09:00", "13:00", { label: "Brunch", sort_order: 0 }),
          segment("12:00", "14:00", { label: "Lunch", sort_order: 1 }),
        ]),
      ),
      KEYS.overlapping,
      { day: "Friday" },
    )
    expectCatalogMessage(
      validateOperatingDays(onDay(1, [])),
      KEYS.openWithoutSegments,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(onDay(1, [segment("14:00", "12:00")])),
      KEYS.closesBeforeOpen,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(onDay(1, [segment("25:00", "26:00")])),
      KEYS.invalidSegmentTime,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [segment("18:00", "22:00", { max_covers: 0 })]),
      ),
      KEYS.invalidServiceMax,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [
          segment("18:00", "22:00", {
            bookable_slots: [{ time: "not-a-time" }],
          }),
        ]),
      ),
      KEYS.invalidSlotTime,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [
          segment("18:00", "22:00", {
            bookable_slots: [{ time: "17:30" }],
          }),
        ]),
      ),
      KEYS.slotOutsideWindow,
      { day: "Monday" },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [
          segment("18:00", "22:00", {
            bookable_slots: [{ time: "18:15" }],
          }),
        ]),
        30,
      ),
      KEYS.slotOffGrid,
      { day: "Monday", interval: 30 },
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [
          segment("18:00", "22:00", {
            bookable_slots: [{ time: "18:00", max_covers: 1.5 }],
          }),
        ]),
      ),
      KEYS.invalidSlotMax,
      { day: "Monday" },
    )
  })

  it("operating-day errors without a day name are errors.* catalog keys", () => {
    expectCatalogMessage(
      validateOperatingDays(DEFAULT_OPERATING_DAYS.slice(0, 6)),
      KEYS.weekRequired,
    )
    expectCatalogMessage(
      validateOperatingDays(
        DEFAULT_OPERATING_DAYS.map((day, index) =>
          index === 0 ? { ...day, day_of_week: 9 } : day,
        ),
      ),
      KEYS.invalidDay,
    )
    expectCatalogMessage(
      validateOperatingDays(
        DEFAULT_OPERATING_DAYS.map((day, index) =>
          index === 1 ? { ...day, day_of_week: 0 } : day,
        ),
      ),
      KEYS.duplicateDay,
    )
    expectCatalogMessage(
      validateOperatingDays(
        onDay(1, [segment("18:00", "22:00", { guest_note: "n".repeat(241) })]),
      ),
      KEYS.guestNoteTooLong,
      { max: 240 },
    )
  })

  it("upsertOperatingWindows errors are errors.* catalog keys", async () => {
    const { upsertOperatingWindows } =
      await import("@/app/actions/availability")

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await upsertOperatingWindows(DEFAULT_OPERATING_DAYS)
    expect(unauthorized.success).toBe(false)
    if (!unauthorized.success) {
      expectCatalogMessage(unauthorized.error, KEYS.unauthorized)
    }

    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    const overlapping = await upsertOperatingWindows(
      onDay(2, [
        segment("09:00", "13:00", { label: "Brunch", sort_order: 0 }),
        segment("12:00", "14:00", { label: "Lunch", sort_order: 1 }),
      ]),
    )
    expect(overlapping.success).toBe(false)
    if (!overlapping.success) {
      expectCatalogMessage(overlapping.error, KEYS.overlapping, {
        day: "Tuesday",
      })
    }

    mocks.rpc.mockResolvedValue({
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    })
    const unmapped = await upsertOperatingWindows(DEFAULT_OPERATING_DAYS)
    expect(unmapped.success).toBe(false)
    if (!unmapped.success) {
      expectCatalogMessage(unmapped.error, KEYS.unmapped)
    }
  })

  it("blocked-date read and toggle errors are errors.* catalog keys", async () => {
    const {
      getBlockedDatesInMonth,
      getBlockedDatesInRange,
      isDateBlocked,
      toggleBlockedDate,
    } = await import("@/app/actions/availability")

    const readError = fail("internal query failure", "XX000")
    scriptAnon(readError, readError, readError)
    expectCatalogMessage(
      await thrownMessage(() => isDateBlocked("2026-09-10")),
      KEYS.blockedDatesLoadFailed,
    )
    expectCatalogMessage(
      await thrownMessage(() => getBlockedDatesInMonth(2026, 9)),
      KEYS.blockedDatesLoadFailed,
    )
    expectCatalogMessage(
      await thrownMessage(() =>
        getBlockedDatesInRange("2026-09-01", "2026-09-30"),
      ),
      KEYS.blockedDatesLoadFailed,
    )

    mocks.requireStaffUser.mockResolvedValue(null)
    const unauthorized = await toggleBlockedDate("2026-09-10")
    expectCatalogMessage(unauthorized.error, KEYS.unauthorized)

    scriptService(fail("schema cache miss", "PGRST205"))
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.schemaUnavailable,
    )

    scriptService(fail("connection reset"))
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.unmapped,
    )

    scriptService(ok({ date: "2026-09-10" }), fail("schema cache", "PGRST116"))
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.schemaUnavailable,
    )

    scriptService(ok({ date: "2026-09-10" }), fail("deadlock detected"))
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.unmapped,
    )

    scriptService(
      ok(null),
      fail("Could not find the table in the schema cache"),
    )
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.schemaUnavailable,
    )

    scriptService(ok(null), fail("new row violates row-level security policy"))
    expectCatalogMessage(
      (await toggleBlockedDate("2026-09-10")).error,
      KEYS.unmapped,
    )
  })

  it("restaurant contact errors are errors.* catalog keys", async () => {
    const { updateRestaurantContactInfo } =
      await import("@/app/actions/restaurant-info")

    mocks.requireSuperAdminUser.mockResolvedValue(null)
    expectCatalogMessage(
      await thrownMessage(() => updateRestaurantContactInfo(contact)),
      KEYS.contactUnauthorized,
    )

    mocks.requireSuperAdminUser.mockResolvedValue({ id: "super-admin-1" })
    expectCatalogMessage(
      (await updateRestaurantContactInfo({ address: "  ", phone: "555" }))
        .error,
      KEYS.contactRequired,
    )
    expectCatalogMessage(
      (
        await updateRestaurantContactInfo({
          address: "10 Kitchen Lane",
          phone: "",
        })
      ).error,
      KEYS.contactRequired,
    )
    expectCatalogMessage(
      (
        await updateRestaurantContactInfo({
          address: "a".repeat(241),
          phone: "555",
        })
      ).error,
      KEYS.contactTooLong,
    )
    expectCatalogMessage(
      (
        await updateRestaurantContactInfo({
          address: "10 Kitchen Lane",
          phone: "1".repeat(41),
        })
      ).error,
      KEYS.contactTooLong,
    )

    scriptService(fail("permission denied for table restaurant_settings"))
    expectCatalogMessage(
      (await updateRestaurantContactInfo(contact)).error,
      KEYS.contactSaveFailed,
    )
  })
})
