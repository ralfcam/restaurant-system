import { beforeEach, describe, expect, it, vi } from "vitest"
import { upsertOperatingWindows } from "@/app/actions/availability"
import {
  DEFAULT_OPERATING_DAYS,
  type OperatingDay,
} from "@/lib/reservations/operating-hours"
import { expectCatalogKey } from "@/tests/unit/i18n/helpers/catalog"

type SettingsRow = { slot_interval_minutes: number | null }

type SettingsResult = {
  data: SettingsRow | null
  error: { message: string } | null
}

const mocks = vi.hoisted(() => ({
  requireStaffUser: vi.fn(),
  rpc: vi.fn(),
  from: vi.fn(),
  settingsResult: {
    data: null,
    error: null,
  } as SettingsResult,
}))

vi.mock("@/lib/supabase/require-staff", () => ({
  requireStaffUser: mocks.requireStaffUser,
}))

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}))

function thenable(value: SettingsResult) {
  const builder: Record<string, unknown> = {}
  const self = new Proxy(builder, {
    get(_target, prop) {
      if (prop === "then") {
        return (
          resolve: (value: SettingsResult) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve(value).then(resolve, reject)
      }
      if (prop === "single" || prop === "maybeSingle") {
        return async () => value
      }
      return () => self
    },
  })
  return self
}

function mondayDinner(slot?: string): OperatingDay[] {
  return DEFAULT_OPERATING_DAYS.map((day) =>
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
              ...(slot ? { bookable_slots: [{ time: slot }] } : {}),
            },
          ],
        }
      : day,
  )
}

describe("upsertOperatingWindows", () => {
  beforeEach(() => {
    mocks.requireStaffUser.mockReset()
    mocks.rpc.mockReset()
    mocks.from.mockReset()
    mocks.requireStaffUser.mockResolvedValue({ id: "staff-1" })
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.settingsResult = { data: null, error: null }
    mocks.from.mockImplementation((table: string) => {
      if (table === "restaurant_settings") return thenable(mocks.settingsResult)
      return thenable({ data: null, error: null })
    })
  })

  it("validates bookable slots on the configured slot-interval grid", async () => {
    mocks.settingsResult = {
      data: { slot_interval_minutes: 15 },
      error: null,
    }
    const onGrid = await upsertOperatingWindows(mondayDinner("19:15"))
    expect(onGrid).toEqual({ success: true })
    expect(mocks.rpc).toHaveBeenCalledWith(
      "replace_operating_windows",
      expect.anything(),
    )

    mocks.rpc.mockClear()
    mocks.settingsResult = {
      data: { slot_interval_minutes: 60 },
      error: null,
    }
    const offHour = await upsertOperatingWindows(mondayDinner("19:30"))
    expect(offHour).toEqual({
      success: false,
      error: {
        key: "errors.scheduling.slotOffGrid",
        params: { day: "Monday", interval: 60 },
      },
    })
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.rpc.mockClear()
    mocks.settingsResult = { data: null, error: null }
    const absentRow = await upsertOperatingWindows(mondayDinner("19:15"))
    expect(absentRow).toEqual({
      success: false,
      error: {
        key: "errors.scheduling.slotOffGrid",
        params: { day: "Monday", interval: 30 },
      },
    })
    expect(mocks.rpc).not.toHaveBeenCalled()

    mocks.from.mockClear()
    await upsertOperatingWindows(mondayDinner())
    expect(
      mocks.from.mock.calls.some(([table]) => table === "restaurant_settings"),
    ).toBe(false)
  })

  it("fails closed when the slot interval cannot be read", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      mocks.settingsResult = {
        data: null,
        error: { message: "restaurant_settings select failed" },
      }
      const result = await upsertOperatingWindows(mondayDinner("19:15"))
      expect(result).toEqual({
        success: false,
        error: "errors.availability.settingsLoadFailed",
      })
      expect(mocks.rpc).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
      expectCatalogKey("errors.availability.settingsLoadFailed")
    } finally {
      errorSpy.mockRestore()
    }
  })
})
