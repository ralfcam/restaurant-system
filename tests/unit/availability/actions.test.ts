import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { upsertOperatingWindows } from "@/app/actions/availability"
import {
  DEFAULT_OPERATING_DAYS,
  flattenDaysToRows,
  type OperatingDay,
} from "@/lib/reservations/operating-hours"

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  rpc: vi.fn(),
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
  createClient: () => ({}),
}))

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
})
