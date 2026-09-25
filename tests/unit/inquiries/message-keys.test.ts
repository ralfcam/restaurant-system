import { beforeEach, describe, expect, it, vi } from "vitest"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"
import { validateInquiryPayload } from "@/lib/inquiries/validation"
import { resolveAnalyticsPeriod } from "@/lib/analytics/report"
import { staffListEmptyCopy } from "@/lib/reservations/list-empty-copy"

const KEYS = {
  nameRequired: "errors.inquiries.nameRequired",
  partySizeInvalid: "errors.inquiries.partySizeInvalid",
  dateInvalid: "errors.inquiries.dateInvalid",
  contactRequired: "errors.inquiries.contactRequired",
  emailInvalid: "errors.inquiries.emailInvalid",
  phoneInvalid: "errors.inquiries.phoneInvalid",
  kindInvalid: "errors.inquiries.kindInvalid",
  inquiriesUnauthorized: "errors.inquiries.unauthorized",
  loadInquiriesFailed: "errors.inquiries.loadFailed",
  saveInquiryFailed: "errors.inquiries.saveFailed",
  invalidStatus: "errors.inquiries.invalidStatus",
  updateInquiryFailed: "errors.inquiries.updateFailed",
  analyticsUnauthorized: "errors.analytics.unauthorized",
  loadAnalyticsFailed: "errors.analytics.loadFailed",
  invalidPeriod: "errors.analytics.invalidPeriod",
  guestUnauthorized: "errors.guestProfiles.unauthorized",
  guestUnmapped: "errors.guestProfiles.unmapped",
  listFilterEmpty: "errors.reservation.listFilterEmpty",
  listDateEmpty: "errors.reservation.listDateEmpty",
} as const

type CatalogParams = Record<string, string | number>

type QueryResult = {
  data: unknown
  error: { message?: string; code?: string } | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  createServiceClient: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: (...args: unknown[]) =>
    mocks.createServiceClient(...args),
}))

let queryResult: QueryResult = { data: null, error: null }

function thenable<T>(value: T) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (result: T) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const payload = value as QueryResult
        const row = Array.isArray(payload.data)
          ? (payload.data[0] ?? null)
          : payload.data
        return async () => ({ data: row, error: payload.error })
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

function fail(message: string, code?: string): QueryResult {
  return { data: null, error: { message, ...(code ? { code } : {}) } }
}

const inquiryDraft = {
  guest_name: "Ada Lovelace",
  requested_date: "2026-09-20",
  party_size: 9,
  email: "ada@example.com",
}

const RAW_DB = "permission denied for table reservations"
const SCHEMA_CACHE =
  "Could not find the 'email_normalized' column of 'reservations' in the schema cache"

describe("inquiries, analytics, and guest-profile producers return errors.* catalog keys", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.createServiceClient.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    queryResult = { data: [], error: null }
    mocks.from.mockImplementation(() => thenable(queryResult))
    mocks.createServiceClient.mockReturnValue({ from: mocks.from })
  })

  it("inquiry validation errors are errors.inquiries.* catalog keys", () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...inquiryDraft, guest_name: "   " }, KEYS.nameRequired],
      [{ ...inquiryDraft, party_size: 1.5 }, KEYS.partySizeInvalid],
      [{ ...inquiryDraft, requested_date: "not-a-date" }, KEYS.dateInvalid],
      [{ ...inquiryDraft, email: "", phone: "  " }, KEYS.contactRequired],
      [{ ...inquiryDraft, email: "ada@localhost" }, KEYS.emailInvalid],
      [{ ...inquiryDraft, email: "", phone: "abc" }, KEYS.phoneInvalid],
      [{ ...inquiryDraft, kind: "banquet" }, KEYS.kindInvalid],
    ]

    for (const [input, key] of cases) {
      const validated = validateInquiryPayload(input)
      expect("error" in validated).toBe(true)
      if ("error" in validated) expectCatalogMessage(validated.error, key)
    }
  })

  it("inquiry staff gate is errors.inquiries.unauthorized", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { getEventInquiries, createInquiry, updateInquiryStatus } =
      await import("@/app/actions/inquiries")

    expectCatalogMessage(
      (await getEventInquiries()).error,
      KEYS.inquiriesUnauthorized,
    )
    expectCatalogMessage(
      (await createInquiry(inquiryDraft)).error,
      KEYS.inquiriesUnauthorized,
    )
    expectCatalogMessage(
      (
        await updateInquiryStatus(
          "11111111-1111-4111-8111-111111111111",
          "contacted",
        )
      ).error,
      KEYS.inquiriesUnauthorized,
    )
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
  })

  it("inquiry load failure collapses raw database text to errors.inquiries.loadFailed", async () => {
    const { getEventInquiries } = await import("@/app/actions/inquiries")
    queryResult = fail("could not query event_inquiries")
    expectCatalogMessage(
      (await getEventInquiries()).error,
      KEYS.loadInquiriesFailed,
    )
  })

  it("inquiry save failure collapses raw database text to errors.inquiries.saveFailed", async () => {
    const { createInquiry } = await import("@/app/actions/inquiries")
    queryResult = fail(
      "duplicate key value violates unique constraint",
      "23505",
    )
    expectCatalogMessage(
      (await createInquiry(inquiryDraft)).error,
      KEYS.saveInquiryFailed,
    )
  })

  it("invalid inquiry status is errors.inquiries.invalidStatus", async () => {
    const { updateInquiryStatus } = await import("@/app/actions/inquiries")
    expectCatalogMessage(
      (
        await updateInquiryStatus(
          "11111111-1111-4111-8111-111111111111",
          "confirmed",
        )
      ).error,
      KEYS.invalidStatus,
    )
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("inquiry update failure collapses PostgREST text to errors.inquiries.updateFailed", async () => {
    const { updateInquiryStatus } = await import("@/app/actions/inquiries")
    queryResult = fail(
      "Could not find the 'status' column of 'event_inquiries' in the schema cache",
      "PGRST204",
    )
    expectCatalogMessage(
      (
        await updateInquiryStatus(
          "11111111-1111-4111-8111-111111111111",
          "contacted",
        )
      ).error,
      KEYS.updateInquiryFailed,
    )
  })

  it("analytics staff gate is errors.analytics.unauthorized", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    expectCatalogMessage(
      (await getReservationAnalytics()).error,
      KEYS.analyticsUnauthorized,
    )
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
  })

  it("invalid reporting period is errors.analytics.invalidPeriod", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    const cases = [
      { from: "2026-09-12", to: "2026-09-06" },
      { from: "not-a-date", to: "2026-09-12" },
      { from: "2026-09-06" },
      { preset: 14 as 7 },
    ]

    for (const period of cases) {
      expectCatalogMessage(
        resolveAnalyticsPeriod(period).error,
        KEYS.invalidPeriod,
      )
      const loaded = await getReservationAnalytics(period)
      expectCatalogMessage(
        "error" in loaded ? loaded.error : undefined,
        KEYS.invalidPeriod,
      )
      expect(loaded).not.toEqual({ noShow: 0, cancelled: 0 })
    }
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it("analytics query failure collapses raw database text to errors.analytics.loadFailed", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    queryResult = fail(RAW_DB)
    expectCatalogMessage(
      (
        await getReservationAnalytics({
          from: "2026-09-01",
          to: "2026-09-10",
        })
      ).error,
      KEYS.loadAnalyticsFailed,
    )
  })

  it("analytics seated-events failure collapses schema-cache text to errors.analytics.loadFailed", async () => {
    const { getReservationAnalytics } = await import("@/app/actions/analytics")
    mocks.from.mockImplementation((name: string) => {
      if (name === "reservations") {
        return thenable({
          data: [
            {
              id: "res-1",
              status: "completed",
              date: "2026-09-01",
              completed_at: "2026-09-01T21:00:00.000Z",
            },
          ],
          error: null,
        })
      }
      return thenable(
        fail(
          "Could not find the table 'public.status_events' in the schema cache",
          "PGRST205",
        ),
      )
    })
    expectCatalogMessage(
      (
        await getReservationAnalytics({
          from: "2026-09-01",
          to: "2026-09-10",
        })
      ).error,
      KEYS.loadAnalyticsFailed,
    )
  })

  it("guest-profile staff gate is errors.guestProfiles.unauthorized", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const { getGuestProfile, updateGuestProfilePii } =
      await import("@/app/actions/guest-profiles")
    expectCatalogMessage(
      (await getGuestProfile("ada@ex.com")).error,
      KEYS.guestUnauthorized,
    )
    expectCatalogMessage(
      (
        await updateGuestProfilePii({
          email: "ada@ex.com",
          guest_name: "Ada Lovelace",
          phone: "555-0100",
        })
      )?.error,
      KEYS.guestUnauthorized,
    )
    expect(mocks.createServiceClient).not.toHaveBeenCalled()
  })

  it("guest-profile read collapses raw database text to errors.guestProfiles.unmapped", async () => {
    const { getGuestProfile } = await import("@/app/actions/guest-profiles")
    queryResult = fail(RAW_DB)
    expectCatalogMessage(
      (await getGuestProfile("ada@ex.com")).error,
      KEYS.guestUnmapped,
    )
  })

  it("guest-profile PII update collapses PostgREST text to errors.guestProfiles.unmapped", async () => {
    const { updateGuestProfilePii } =
      await import("@/app/actions/guest-profiles")
    queryResult = fail(SCHEMA_CACHE, "PGRST204")
    expectCatalogMessage(
      (
        await updateGuestProfilePii({
          email: "ada@ex.com",
          guest_name: "Ada Lovelace",
          phone: "555-0100",
        })
      )?.error,
      KEYS.guestUnmapped,
    )
  })

  it("staff list empty copy is errors.reservation catalog keys", () => {
    expectCatalogMessage(
      staffListEmptyCopy({
        loadedCount: 3,
        filteredCount: 0,
        statusFilterActive: true,
        nameOrPhoneFilterActive: false,
      }),
      KEYS.listFilterEmpty,
    )
    expectCatalogMessage(
      staffListEmptyCopy({
        loadedCount: 0,
        filteredCount: 0,
        statusFilterActive: false,
        nameOrPhoneFilterActive: false,
      }),
      KEYS.listDateEmpty,
    )
  })
})
