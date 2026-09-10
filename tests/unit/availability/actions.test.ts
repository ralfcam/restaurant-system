import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getBlockedDatesInMonth,
  getBlockedDatesInRange,
  isDateBlocked,
  upsertOperatingWindows,
} from "@/app/actions/availability"
import {
  DEFAULT_OPERATING_DAYS,
  flattenDaysToRows,
  type OperatingDay,
} from "@/lib/reservations/operating-hours"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: mocks.rpc,
  }),
}))

vi.mock("@/lib/supabase/client-server", () => ({
  createClient: () => ({
    from: mocks.from,
  }),
}))

type BlockedDateQueryResult = {
  data: { date: string } | { date: string }[] | null
  error: { code?: string; message: string } | null
}

function thenable(value: BlockedDateQueryResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: BlockedDateQueryResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        const row = Array.isArray(value.data)
          ? (value.data[0] ?? null)
          : value.data
        return async () => ({ data: row, error: row ? null : value.error })
      }
      return () => self
    },
  })
  return self
}

const BLOCKED_DATES_LOAD_ERROR = "Could not load blocked dates."

function isBlockedDatesLoadFailure(err: unknown) {
  return err instanceof Error && err.message === BLOCKED_DATES_LOAD_ERROR
}

const segmentedMonday: OperatingDay[] = DEFAULT_OPERATING_DAYS.map((day) =>
  day.day_of_week === 1
    ? {
        day_of_week: 1,
        is_closed: false,
        segments: [
          {
            label: "Morning",
            opens_at: "09:00",
            closes_at: "11:00",
            sort_order: 0,
          },
          {
            label: "Lunch",
            opens_at: "12:00",
            closes_at: "14:00",
            sort_order: 1,
          },
          {
            label: "Dinner",
            opens_at: "18:00",
            closes_at: "22:00",
            sort_order: 2,
          },
        ],
      }
    : day,
)

describe("upsertOperatingWindows", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.rpc.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  it("rejects unauthenticated callers", async () => {
    mocks.requireStaffUser.mockResolvedValue(null)
    const result = await upsertOperatingWindows(segmentedMonday)
    expect(result).toEqual({ success: false, error: "Unauthorized." })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("rejects overlapping segments before writing", async () => {
    const overlapping = DEFAULT_OPERATING_DAYS.map((day) =>
      day.day_of_week === 2
        ? {
            day_of_week: 2,
            is_closed: false,
            segments: [
              {
                label: "Brunch",
                opens_at: "09:00",
                closes_at: "13:00",
                sort_order: 0,
              },
              {
                label: "Lunch",
                opens_at: "12:00",
                closes_at: "14:00",
                sort_order: 1,
              },
            ],
          }
        : day,
    )
    const result = await upsertOperatingWindows(overlapping)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error).toMatch(/overlapping/i)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("replaces the weekly schedule atomically with flattened segments", async () => {
    const result = await upsertOperatingWindows(segmentedMonday)
    expect(result).toEqual({ success: true })
    expect(mocks.rpc).toHaveBeenCalledWith(
      "replace_operating_windows",
      expect.objectContaining({
        p_windows: expect.arrayContaining([
          expect.objectContaining({
            day_of_week: 1,
            opens_at: "09:00",
            closes_at: "11:00",
            is_closed: false,
            label: "Morning",
          }),
          expect.objectContaining({
            day_of_week: 1,
            opens_at: "18:00",
            closes_at: "22:00",
            label: "Dinner",
          }),
        ]),
      }),
    )
  })

  it("persists guest notes from scheduling-segment-row through flatten and upsert", async () => {
    const root = process.cwd()
    const manager = readFileSync(
      path.join(root, "components/staff/scheduling-manager.tsx"),
      "utf8",
    )
    const availability = readFileSync(
      path.join(root, "app/actions/availability.ts"),
      "utf8",
    )

    expect(manager).toMatch(/scheduling-segment-row/)
    expect(manager).toMatch(/guest_note/)
    expect(availability).toMatch(/WINDOW_COLUMNS\s*=\s*"[^"]*guest_note/)

    const daysWithNote: OperatingDay[] = DEFAULT_OPERATING_DAYS.map((day) =>
      day.day_of_week === 1
        ? {
            day_of_week: 1,
            is_closed: false,
            segments: [
              {
                label: "Dinner",
                opens_at: "18:00",
                closes_at: "22:00",
                sort_order: 0,
                guest_note: "Kitchen closes at 21:00",
              },
            ],
          }
        : day,
    )

    expect(flattenDaysToRows(daysWithNote)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          day_of_week: 1,
          label: "Dinner",
          guest_note: "Kitchen closes at 21:00",
        }),
      ]),
    )

    const result = await upsertOperatingWindows(daysWithNote)
    expect(result).toEqual({ success: true })
    expect(mocks.rpc).toHaveBeenCalledWith(
      "replace_operating_windows",
      expect.objectContaining({
        p_windows: expect.arrayContaining([
          expect.objectContaining({
            day_of_week: 1,
            label: "Dinner",
            guest_note: "Kitchen closes at 21:00",
          }),
        ]),
      }),
    )
  })

  it("accepts 240-character guest notes and rejects 241 before replace_operating_windows", async () => {
    const daysWithNote = (guestNote: string): OperatingDay[] =>
      DEFAULT_OPERATING_DAYS.map((day) =>
        day.day_of_week === 1
          ? {
              day_of_week: 1,
              is_closed: false,
              segments: [
                {
                  label: "Dinner",
                  opens_at: "18:00",
                  closes_at: "22:00",
                  sort_order: 0,
                  guest_note: guestNote,
                },
              ],
            }
          : day,
      )

    const accepted = await upsertOperatingWindows(daysWithNote("x".repeat(240)))
    expect(accepted).toEqual({ success: true })
    expect(mocks.rpc).toHaveBeenCalledWith(
      "replace_operating_windows",
      expect.anything(),
    )

    mocks.rpc.mockClear()

    const rejected = await upsertOperatingWindows(daysWithNote("x".repeat(241)))
    expect(rejected.success).toBe(false)
    if (!rejected.success) expect(rejected.error).toMatch(/240/)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})

describe("blocked-date readers", () => {
  beforeEach(() => {
    mocks.from.mockReset()
  })

  it("blocked-date readers reject SELECT errors without changing successful results", async () => {
    const selectError: BlockedDateQueryResult = {
      data: null,
      error: { code: "XX000", message: "internal query failure" },
    }
    const queue: BlockedDateQueryResult[] = [
      selectError,
      selectError,
      selectError,
      { data: { date: "2026-09-10" }, error: null },
      { data: null, error: null },
      {
        data: [{ date: "2026-09-10" }, { date: "2026-09-15" }],
        error: null,
      },
      { data: [{ date: "2026-10-01" }], error: null },
      { data: [], error: null },
      { data: null, error: null },
    ]

    mocks.from.mockImplementation(() => {
      const next = queue.shift()
      if (!next) throw new Error("blocked_dates query queue exhausted")
      return thenable(next)
    })

    await expect(isDateBlocked("2026-09-10")).rejects.toSatisfy(
      isBlockedDatesLoadFailure,
    )
    await expect(getBlockedDatesInMonth(2026, 9)).rejects.toSatisfy(
      isBlockedDatesLoadFailure,
    )
    await expect(
      getBlockedDatesInRange("2026-09-01", "2026-09-30"),
    ).rejects.toSatisfy(isBlockedDatesLoadFailure)

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual([
      "blocked_dates",
      "blocked_dates",
      "blocked_dates",
    ])

    await expect(isDateBlocked("2026-09-10")).resolves.toBe(true)
    await expect(isDateBlocked("2026-09-11")).resolves.toBe(false)
    await expect(getBlockedDatesInMonth(2026, 9)).resolves.toEqual([
      "2026-09-10",
      "2026-09-15",
    ])
    await expect(
      getBlockedDatesInRange("2026-10-01", "2026-10-31"),
    ).resolves.toEqual(["2026-10-01"])
    await expect(getBlockedDatesInMonth(2026, 9)).resolves.toEqual([])
    await expect(
      getBlockedDatesInRange("2026-09-01", "2026-09-30"),
    ).resolves.toEqual([])

    expect(
      mocks.from.mock.calls.every(([table]) => table === "blocked_dates"),
    ).toBe(true)
  })
})
