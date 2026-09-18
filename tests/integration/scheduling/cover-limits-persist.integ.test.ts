import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { authEnvReady } from "../helpers/env"
import { createServiceClient } from "@/lib/supabase/service"
import { assertIsolatedHoursMutationTarget } from "@/lib/scheduling/hours-mutation-target"

const WEDNESDAY = 3

const seedWeekWindows = [0, 1, 2, 3, 4, 5, 6].map((day_of_week) => ({
  day_of_week,
  opens_at: day_of_week === 0 ? "00:00" : "09:00",
  closes_at: day_of_week === 0 ? "00:00" : "22:00",
  is_closed: day_of_week === 0,
  label: null,
  sort_order: 0,
}))

const dinnerCoverWindows = seedWeekWindows.map((window) =>
  window.day_of_week === WEDNESDAY
    ? {
        ...window,
        label: "Dinner",
        opens_at: "18:00",
        closes_at: "22:00",
        max_covers: 24,
        bookable_slots: [
          { time: "19:00", max_covers: 12 },
          { time: "21:00", max_covers: 8 },
        ],
      }
    : window,
)

const editedDinnerCoverWindows = dinnerCoverWindows.map((window) =>
  window.day_of_week === WEDNESDAY
    ? {
        ...window,
        max_covers: 24,
        bookable_slots: [{ time: "19:00", max_covers: 10 }],
      }
    : window,
)

async function restoreSeedHours() {
  const supabase = createServiceClient()
  await supabase.rpc("replace_operating_windows", {
    p_windows: seedWeekWindows,
  })
}

async function selectWednesdayCoverLimits() {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("operating_windows")
    .select("max_covers, bookable_slots")
    .eq("day_of_week", WEDNESDAY)
    .single()
  return { row: data, error }
}

describe.skipIf(!authEnvReady)(
  "replace_operating_windows — persist slot/service cover limits (CL-4)",
  () => {
    beforeAll(() => {
      assertIsolatedHoursMutationTarget()
    })

    afterEach(async () => {
      assertIsolatedHoursMutationTarget()
      await restoreSeedHours()
    })

    it("replace_operating_windows persists and updates slot and service cover limits", async () => {
      const supabase = createServiceClient()

      const { error: persistError } = await supabase.rpc(
        "replace_operating_windows",
        { p_windows: dinnerCoverWindows },
      )
      expect(persistError).toBeNull()

      const first = await selectWednesdayCoverLimits()
      expect(first.error).toBeNull()
      expect(first.row?.max_covers).toBe(24)
      expect(first.row?.bookable_slots).toEqual([
        { time: "19:00", max_covers: 12 },
        { time: "21:00", max_covers: 8 },
      ])

      const { error: editError } = await supabase.rpc(
        "replace_operating_windows",
        { p_windows: editedDinnerCoverWindows },
      )
      expect(editError).toBeNull()

      const second = await selectWednesdayCoverLimits()
      expect(second.error).toBeNull()
      expect(second.row?.max_covers).toBe(24)
      expect(second.row?.bookable_slots).toEqual([
        { time: "19:00", max_covers: 10 },
      ])
      expect(
        (
          (second.row?.bookable_slots ?? []) as {
            time?: string
          }[]
        ).some((slot) => slot.time === "21:00"),
      ).toBe(false)
    })
  },
)
